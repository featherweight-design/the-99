/**
 * Rule 0 table check, the data (plan `docs/superpowers/plans/2026-10-16-rule-zero.md` §PR 2): setting a table for a
 * pod's night, seating it, a seat's own deck, what a seated player has seen, and the reads the pod row and Home's
 * card draw. Every read and write lives here because the tables are social (`check:social-reads`).
 *
 * **The grant is the seat.** A table is seen only by a player seated at it, while it is open (`tableOpen`: its setter has not closed it and `expires_at > now()`),
 * and while they are still a member of its pod (decision 3): every read and write below joins all three on the
 * session's viewer in the same statement. Seats whose player has left the pod are omitted from what others see.
 *
 * **One open table per pod** (G7) is the check in `setTable`, under the pod row's `FOR UPDATE`; nothing else may
 * enforce it, so dropping it is how several tables per pod arrive later. Ended tables are never swept by a job: every
 * read applies the shared open predicate (not closed by its setter AND `expires_at > now()`, the database's clock), and
 * a pod's next setup deletes its clock-expired rows. A host-closed row stays until its morning so its seated players
 * keep Log this game (`tableLoggable`, the clock alone); every pod-table lookup filters on `tableOpen`, so such a row
 * can never be picked over a new open table.
 *
 * Nothing returned carries a Clerk id or another player's deck id (decision 5). Setup addresses every pod member by
 * `publicId`, the client-safe id, because it seats them; a player's face here is a display name and a commander.
 */
import { and, asc, eq, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckGames, decks, friendLinks, podMembers, pods, ruleZeroSeats, ruleZeroSeen, ruleZeroTables, socialProfiles, userPrefs } from "../../db/schema";
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";
import type { Reader } from "./access";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import { friendDecksIn, pickerSeesDeck } from "./games";
import { tableClosesAt } from "../rule-zero/rules";
import { isUuid } from "./rules";
import { tableOpen, tableOpenAs } from "./rule-zero-open";
import { ownedDeckArt, type DeckArt } from "./rule-zero-art";
import { enqueueSeatPushQuery } from "../push/seat";
import { kickPush } from "../push/kick";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

import { SEATS_MAX, SEATS_MIN } from "./client-rules";
export { SEATS_MAX, SEATS_MIN };

/** A seat as setup asks for it: a pod member by `publicId`, and the deck the setter picked for them, if any. */
export type SeatAsk = { member: string; deck: string | null };

export type SeatRefusal = "invalid" | "notInPod" | "notSeated" | "notMember" | "deck";

export type SetTableResult =
  | { kind: "set"; tableId: string }
  /** The pod already has an open table and the viewer sits at it: open that one. */
  | { kind: "open"; tableId: string }
  /** The pod already has an open table the viewer is not seated at: nothing written. */
  | { kind: "occupied"; setBy: ThirdPartyName | null; closesAt: Date }
  | { kind: "refused"; reason: SeatRefusal };

/** The asks are a list of 2 to 8 distinct members, each a uuid, each deck a uuid or null. */
function validAsks(raw: unknown): raw is SeatAsk[] {
  if (!Array.isArray(raw) || raw.length < SEATS_MIN || raw.length > SEATS_MAX) return false;
  const ok = raw.every((a) => typeof a === "object" && a !== null && isUuid((a as SeatAsk).member) && ((a as SeatAsk).deck === null || isUuid((a as SeatAsk).deck)));
  return ok && new Set(raw.map((a: SeatAsk) => a.member)).size === raw.length;
}

/** Whether the viewer is a member of the pod. Called with the pod row already locked. */
async function isMemberIn(tx: Tx, podId: string, userId: string): Promise<boolean> {
  const [row] = await tx
    .select({ userId: podMembers.userId })
    .from(podMembers)
    .where(and(eq(podMembers.podId, podId), eq(podMembers.userId, userId)));
  return row !== undefined;
}

/**
 * The owners (of those given) whose deck rules apply to a friend's read: every one of them, since
 * `SOCIAL_FRIENDS_ENABLED` retired (always on). Kept async so its callers stay as they are.
 */
export async function ruledOwnersOf(userIds: readonly string[]): Promise<string[]> {
  return [...new Set(userIds)];
}

/** A table's seated players other than the viewer whose deck rules apply (`ruledOwnersOf`). */
export async function ruledSeatOwnersOf(viewerId: string, tableId: string, q: Pick<typeof db, "select">): Promise<string[]> {
  const players = await q.select({ userId: ruleZeroSeats.userId }).from(ruleZeroSeats).where(eq(ruleZeroSeats.tableId, tableId));
  return ruledOwnersOf(players.map((p) => p.userId).filter((u) => u !== viewerId));
}

/**
 * The join condition that draws a seated deck only while its owner's rules let friends see it (the setup list's rule),
 * so a deck hidden after it was seated reads as no deck. The viewer's own deck is always theirs. Needs `user_prefs`
 * joined on the seat's player AHEAD of the deck join. Undefined when no owner's switch is on: drawn as shipped.
 */
export function seatDeckVisible(viewerId: string, ruledOwners: readonly string[]): SQL | undefined {
  return ruledOwners.length === 0 ? undefined : or(eq(decks.userId, viewerId), notInArray(decks.userId, [...ruledOwners]), pickerSeesDeck);
}

/** Which of these friends' decks their owners' rules keep from friends (the picker's rule), under the owners' switches. */
async function hiddenFriendDecksIn(tx: Tx, rows: readonly { id: string; userId: string }[]): Promise<Set<string>> {
  if (rows.length === 0) return new Set();
  const ruled = await ruledOwnersOf(rows.map((d) => d.userId));
  const check = rows.filter((d) => ruled.includes(d.userId)).map((d) => d.id);
  if (check.length === 0) return new Set();
  const seen = await tx
    .select({ id: decks.id })
    .from(decks)
    .leftJoin(userPrefs, eq(userPrefs.userId, decks.userId))
    .where(and(inArray(decks.id, check), pickerSeesDeck));
  const ok = new Set(seen.map((d) => d.id));
  return new Set(check.filter((id) => !ok.has(id)));
}

type ResolvedSeat = { userId: string; deckId: string | null };

/**
 * Queue the seat notice's push for each NEWLY seated player but the setter (item 6): one row per (table, player), inside the
 * setup's own transaction, so a rolled-back setup sends nothing. Returns the players a push was queued for; the caller kicks
 * them once the transaction has committed (`kickSeated`).
 */
export async function queueSeatPushes(tx: Tx, tableId: string, setter: string, userIds: readonly string[], now: Date): Promise<string[]> {
  const queued: string[] = [];
  for (const userId of userIds) {
    if (userId === setter) continue;
    const { rows } = await tx.execute(enqueueSeatPushQuery(userId, tableId, now));
    if (rows.length > 0) queued.push(userId);
  }
  return queued;
}

/** After the commit: flush each notified player's outbox in the background (D1's kick). A no-op outside a request. */
const kickSeated = (userIds: readonly string[]): void => { for (const userId of userIds) kickPush(userId); };

/**
 * Turn the asks into seats, in order, or refuse them all. Under the pod row's lock: every seat must be a member of
 * the pod now, the viewer must be one of them, and a picked deck must be the seat's own player's: the viewer's own
 * deck for the viewer's seat, a friend's deck (`friendDecksIn`, through the viewer's own link) for a friend's seat.
 * A seat whose player is not the viewer's friend takes no deck (G3): its player picks their own.
 * The viewer's friendship rows to the seated friends are held FOR SHARE and the picked decks FOR KEY SHARE, the
 * order (pod, friendship, deck) every social write takes them, so an unfriend or a deck delete waits for this.
 */
async function resolveSeatsIn(tx: Tx, viewerId: string, podId: string, asks: readonly SeatAsk[]): Promise<ResolvedSeat[] | SeatRefusal> {
  const members = await tx
    .select({ userId: podMembers.userId, publicId: socialProfiles.publicId })
    .from(podMembers)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, podMembers.userId))
    .where(and(eq(podMembers.podId, podId), inArray(socialProfiles.publicId, asks.map((a) => a.member))));
  const byPublic = new Map(members.map((m) => [m.publicId, m.userId]));
  const userIds = asks.map((a) => byPublic.get(a.member));
  if (userIds.some((u) => u === undefined)) return "notMember";
  const seated = userIds as string[];
  if (!seated.includes(viewerId)) return "notSeated";
  const others = seated.filter((u) => u !== viewerId);
  const friends = others.length === 0 ? [] : await tx
    .select({ userId: friendLinks.friendUserId })
    .from(friendLinks)
    .where(and(eq(friendLinks.userId, viewerId), inArray(friendLinks.friendUserId, others)))
    .orderBy(asc(friendLinks.userId), asc(friendLinks.friendUserId))
    .for("share");
  const isFriend = new Set(friends.map((f) => f.userId));
  const own = asks.flatMap((a, i) => (a.deck !== null && seated[i] === viewerId ? [a.deck] : []));
  const theirs = asks.flatMap((a, i) => (a.deck !== null && seated[i] !== viewerId ? [a.deck] : []));
  const ownRows = own.length === 0 ? [] : await tx
    .select({ id: decks.id, userId: decks.userId })
    .from(decks)
    .where(and(inArray(decks.id, own), eq(decks.userId, viewerId)))
    .for("key share");
  const friendRows = theirs.length === 0 ? [] : await friendDecksIn(tx, viewerId, theirs);
  // A friend's deck their rules hide is refused as any foreign deck is, so a stale client cannot seat it (the setup
  // list leaves it out; "A deck not listed" is the way to seat that friend).
  const hidden = await hiddenFriendDecksIn(tx, friendRows);
  const deckOwner = new Map([...ownRows, ...friendRows.filter((d) => !hidden.has(d.id))].map((d) => [d.id, d.userId]));
  const out: ResolvedSeat[] = [];
  for (const [i, ask] of asks.entries()) {
    const userId = seated[i];
    if (ask.deck !== null) {
      if (userId !== viewerId && !isFriend.has(userId)) return "deck";
      if (deckOwner.get(ask.deck) !== userId) return "deck";
    }
    out.push({ userId, deckId: ask.deck });
  }
  return out;
}

/**
 * Set a table for the pod's night: 2 to 8 of its members, the viewer among them, seated in the order given. Under
 * the pod row's lock it applies the one rule (G7): an open table already there is answered `open` to a player seated
 * at it and `occupied` to anyone else, with nothing written. Two setups at once queue on the pod row, so the second
 * always finds the first's table. A setup that writes deletes the pod's expired tables first. The table closes the next
 * morning in the setter's `timeZone` (`tableClosesAt`).
 */
export async function setTable(viewerId: string, podId: unknown, rawSeats: unknown, timeZone: string): Promise<SetTableResult> {
  if (!isUuid(podId) || !validAsks(rawSeats)) return { kind: "refused", reason: "invalid" };
  const asks = rawSeats;
  const notified: string[] = [];
  const result = await db.transaction(async (tx) => {
    const [pod] = await tx.select({ id: pods.id }).from(pods).where(eq(pods.id, podId)).for("update");
    if (!pod || !(await isMemberIn(tx, podId, viewerId))) return { kind: "refused", reason: "notInPod" } as const;
    const [open] = await tx
      .select({ id: ruleZeroTables.id, closesAt: ruleZeroTables.expiresAt, setBy: socialProfiles.displayName, seated: ruleZeroSeats.userId })
      .from(ruleZeroTables)
      .leftJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroTables.setBy))
      .leftJoin(ruleZeroSeats, and(eq(ruleZeroSeats.tableId, ruleZeroTables.id), eq(ruleZeroSeats.userId, viewerId)))
      .where(and(eq(ruleZeroTables.podId, podId), tableOpen))
      .limit(1);
    if (open) {
      return open.seated !== null
        ? ({ kind: "open", tableId: open.id } as const)
        : ({ kind: "occupied", setBy: open.setBy === null ? null : named(open.setBy), closesAt: open.closesAt } as const);
    }
    const seats = await resolveSeatsIn(tx, viewerId, podId, asks);
    if (typeof seats === "string") return { kind: "refused", reason: seats } as const;
    // The pod's clock-expired tables go only now. Deliberately `expires_at <= now()` and NOT `tableEnded`: a host-closed
    // table is kept until its original morning so its seated players can still log (`tableLoggable`); it cannot shadow
    // the new table, since every read of a pod's table filters `tableOpen`. After the picked decks are held: deleting them locks their seats, and a
    // deck delete locks its deck before its `set null` reaches a seat, so the seats must come after the decks here too.
    await tx.delete(ruleZeroTables).where(and(eq(ruleZeroTables.podId, podId), sql`${ruleZeroTables.expiresAt} <= now()`));
    const [table] = await tx
      .insert(ruleZeroTables)
      .values({ podId, setBy: viewerId, expiresAt: tableClosesAt(new Date(), timeZone) })
      .returning({ id: ruleZeroTables.id });
    // The setter's own seat is born seen: only the players they seat get a notice.
    await tx.insert(ruleZeroSeats).values(seats.map((s, i) => ({ tableId: table.id, userId: s.userId, seat: i + 1, deckId: s.deckId, noticeSeenAt: s.userId === viewerId ? new Date() : null })));
    notified.push(...await queueSeatPushes(tx, table.id, viewerId, seats.map((s) => s.userId), new Date()));
    return { kind: "set", tableId: table.id } as const;
  });
  kickSeated(notified);
  return result;
}

export type ReseatResult = { kind: "reseated" } | { kind: "refused"; reason: SeatRefusal | "notFound" };

/**
 * The setter's `Seats`: the same checks as `setTable`, over an open table the viewer set. A player who stays keeps
 * their deck and `changed_at`, whatever the asks say (each player changes their own deck through `setSeatDeck`), so
 * a reseat alone never marks anyone's seat as changed. A player who leaves the table loses their seen row with it.
 */
export async function reseatTable(viewerId: string, tableId: unknown, rawSeats: unknown): Promise<ReseatResult> {
  if (!isUuid(tableId) || !validAsks(rawSeats)) return { kind: "refused", reason: "invalid" };
  const asks = rawSeats;
  const notified: string[] = [];
  const result = await db.transaction(async (tx) => {
    const [found] = await tx.select({ podId: ruleZeroTables.podId }).from(ruleZeroTables).where(eq(ruleZeroTables.id, tableId));
    if (!found) return { kind: "refused", reason: "notFound" } as const;
    // The pod row first, as `setTable` takes it, then the table, re-read under the lock. The table row is the lock
    // every seat writer takes (`setSeatDeck` too), so no swap lands between the read of the seats below and their
    // re-write.
    await tx.select({ id: pods.id }).from(pods).where(eq(pods.id, found.podId)).for("update");
    const [table] = await tx
      .select({ id: ruleZeroTables.id })
      .from(ruleZeroTables)
      .where(and(eq(ruleZeroTables.id, tableId), eq(ruleZeroTables.setBy, viewerId), tableOpen))
      .for("update");
    if (!table) return { kind: "refused", reason: "notFound" } as const;
    if (!(await isMemberIn(tx, found.podId, viewerId))) return { kind: "refused", reason: "notInPod" } as const;
    // The seated decks FOR KEY SHARE before the seats are read, the order a deck delete takes them (deck, then its
    // `set null` on the seat): a delete in flight is waited out here and its `set null` is then in the read below,
    // so a staying seat is never re-written naming a deck that is gone.
    await tx.execute(sql`
      select d.id from ${decks} d join ${ruleZeroSeats} s on s.deck_id = d.id
      where s.table_id = ${tableId} order by d.id for key share of d`);
    const before = await tx
      .select({ userId: ruleZeroSeats.userId, deckId: ruleZeroSeats.deckId, changedAt: ruleZeroSeats.changedAt, noticeSeenAt: ruleZeroSeats.noticeSeenAt })
      .from(ruleZeroSeats)
      .where(eq(ruleZeroSeats.tableId, tableId))
      // FOR UPDATE: the seats are deleted and re-written below, so a staying seat carries `noticeSeenAt` from THIS read. Under READ
      // COMMITTED a `markSeatNoticeSeen` committed after a plain read would be overwritten with null; the row lock makes its UPDATE
      // wait (and then find the old row gone) instead of racing, and a mark committed before is in this read.
      .for("update");
    const kept = new Map(before.map((s) => [s.userId, s]));
    // A staying player's deck is theirs to change, so only a NEW seat's pick is checked (and used).
    const members = await tx
      .select({ userId: socialProfiles.userId, publicId: socialProfiles.publicId })
      .from(socialProfiles)
      .where(inArray(socialProfiles.publicId, asks.map((a) => a.member)));
    const userOf = new Map(members.map((m) => [m.publicId, m.userId]));
    const checked = asks.map((a) => (kept.has(userOf.get(a.member) ?? "") ? { ...a, deck: null } : a));
    const seats = await resolveSeatsIn(tx, viewerId, found.podId, checked);
    if (typeof seats === "string") return { kind: "refused", reason: seats } as const;
    // A new seat's stamp, read BEFORE the delete below empties the table it is measured against.
    const { rows: stamp } = await tx.execute<{ ms: string }>(sql`select round(extract(epoch from ${nextChange(tableId)}) * 1000)::bigint::text as ms`);
    const joinedAt = new Date(Number(stamp[0].ms));
    await tx.delete(ruleZeroSeats).where(eq(ruleZeroSeats.tableId, tableId));
    await tx.insert(ruleZeroSeats).values(seats.map((s, i) => {
      const stay = kept.get(s.userId);
      return stay
        ? { tableId, userId: s.userId, seat: i + 1, deckId: stay.deckId, changedAt: stay.changedAt, noticeSeenAt: stay.noticeSeenAt }
        : { tableId, userId: s.userId, seat: i + 1, deckId: s.deckId, changedAt: joinedAt, noticeSeenAt: null };
    }));
    // Only a NEW seat is news: a player who stays, changes seat or is removed is told nothing (brief state 12).
    notified.push(...await queueSeatPushes(tx, tableId, viewerId, seats.filter((s) => !kept.has(s.userId)).map((s) => s.userId), new Date()));
    const gone = before.map((s) => s.userId).filter((u) => !seats.some((s) => s.userId === u));
    if (gone.length > 0) await tx.delete(ruleZeroSeen).where(and(eq(ruleZeroSeen.tableId, tableId), inArray(ruleZeroSeen.userId, gone)));
    return { kind: "reseated" } as const;
  });
  kickSeated(notified);
  return result;
}

/**
 * The SQL that holds the viewer's grant over a table: seated at it, open, and still a member of its pod.
 * Raw and aliased throughout, so no column can resolve against the wrong table.
 */
const seatedAt = (viewerId: string, tableId: string) => sql`exists (
  select 1 from ${ruleZeroSeats} gs
  join ${ruleZeroTables} gt on gt.id = gs.table_id
  join ${podMembers} gm on gm.pod_id = gt.pod_id and gm.user_id = gs.user_id
  where gs.table_id = ${tableId} and gs.user_id = ${viewerId} and ${tableOpenAs("gt")}
)`;

/**
 * The setter closes their own table now, for good (`closed_at`, `closed_by`). ONE guarded UPDATE: the viewer set it, is
 * seated at it, and it is still open on the database's clock, so a non-setter, an unknown id, an already-closed or
 * expired table and a lapsed seat all write nothing and answer the same `false` (no word of which). Two closes at
 * once cannot both win: the second finds `closed_at` set. It touches only the table row, so it takes no pod lock.
 */
export async function closeTable(viewerId: string, tableId: unknown): Promise<boolean> {
  if (!isUuid(tableId)) return false;
  const closed = await db
    .update(ruleZeroTables)
    .set({ closedAt: sql`now()`, closedBy: viewerId })
    .where(closeTableWhere(viewerId, tableId))
    .returning({ id: ruleZeroTables.id });
  return closed.length === 1;
}

/** The close's guard, apart so a test can render it: the setter's own open table, with the setter still seated. */
export const closeTableWhere = (viewerId: string, tableId: string) =>
  and(eq(ruleZeroTables.id, tableId), eq(ruleZeroTables.setBy, viewerId), tableOpen, seatedAt(viewerId, tableId));

/**
 * A seat's new change stamp, taken under the table row's lock: the wall clock NOW (not the transaction's start, which
 * may precede a wait on the lock), and strictly after every stamp the table already holds. Every seat writer takes
 * that lock first, so stamps follow commit order and a swap can never land behind a revision already acknowledged.
 */
const nextChange = (tableId: string) => sql`greatest(
  clock_timestamp(),
  (select max(nc.changed_at) from ${ruleZeroSeats} nc where nc.table_id = ${tableId}) + interval '1 millisecond'
)`;

export type SetSeatDeckResult = "set" | "unchanged" | "refused";

/**
 * The viewer's own seat, the viewer's own deck (or none). Moves `changed_at` only when the deck changes, so the
 * other seats' dots mean a real swap. `Undo` is this call with the previous deck.
 */
export async function setSeatDeck(viewerId: string, tableId: unknown, deckId: unknown): Promise<SetSeatDeckResult> {
  if (!isUuid(tableId) || (deckId !== null && !isUuid(deckId))) return "refused";
  return db.transaction(async (tx) => {
    // Pod, then table, then deck: the order setup, a reseat and the account purge take them, so a swap racing its
    // own player's purge queues on the pod rather than holding the table while the purge holds the deck.
    const [found] = await tx.select({ podId: ruleZeroTables.podId }).from(ruleZeroTables).where(eq(ruleZeroTables.id, tableId));
    if (!found) return "refused";
    await tx.select({ id: pods.id }).from(pods).where(eq(pods.id, found.podId)).for("update");
    const [table] = await tx.select({ id: ruleZeroTables.id }).from(ruleZeroTables).where(eq(ruleZeroTables.id, tableId)).for("update");
    if (!table) return "refused";
    if (deckId !== null) {
      const [own] = await tx.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, viewerId))).for("key share");
      if (!own) return "refused";
    }
    const written = await tx
      .update(ruleZeroSeats)
      .set({ deckId, changedAt: nextChange(tableId) })
      .where(and(
        eq(ruleZeroSeats.tableId, tableId),
        eq(ruleZeroSeats.userId, viewerId),
        sql`${ruleZeroSeats.deckId} is distinct from ${deckId}::uuid`,
        seatedAt(viewerId, tableId),
      ))
      .returning({ tableId: ruleZeroSeats.tableId });
    if (written.length > 0) return "set";
    const held = await tx.execute(sql`select ${seatedAt(viewerId, tableId)} as ok`);
    return (held.rows[0] as { ok: boolean } | undefined)?.ok ? "unchanged" : "refused";
  });
}

/**
 * The viewer has drawn the table through `seenThrough`: the snapshot's `revision` (its latest `changed_at`), never
 * the time of the acknowledgement, so a swap that landed after the drawn snapshot keeps its dot. Never moves back.
 */
export async function markSeen(viewerId: string, tableId: unknown, seenThrough: unknown): Promise<boolean> {
  if (!isUuid(tableId) || !(seenThrough instanceof Date) || Number.isNaN(seenThrough.getTime())) return false;
  return db.transaction(async (tx) => {
    // The table row FOR SHARE first, in its own statement: a reseat or a purge removing this player holds it FOR
    // UPDATE, so the grant below is checked on a snapshot taken after that removal commits, never before it, and a
    // seen row cannot outlive its seat.
    const [table] = await tx.select({ id: ruleZeroTables.id }).from(ruleZeroTables).where(eq(ruleZeroTables.id, tableId)).for("share");
    if (!table) return false;
    const written = await tx.execute(sql`
      insert into ${ruleZeroSeen} (table_id, user_id, seen_at)
      select ${tableId}, ${viewerId}, ${seenThrough.toISOString()}::timestamptz
      where ${seatedAt(viewerId, tableId)}
      on conflict (table_id, user_id) do update set seen_at = greatest(${ruleZeroSeen}.seen_at, excluded.seen_at)
      returning table_id`);
    return written.rows.length > 0;
  });
}

/** A seated player as the pod row and Home's card draw them: a face and a name, in seat order. */
/** `displayName` is branded unless the face is the viewer's own. */
export type TableFace = { displayName: string | ThirdPartyName; you: boolean; commander: ProfileCommander | null };

export type OpenTable = {
  tableId: string;
  podId: string;
  podName: ThirdPartyName;
  closesAt: Date;
  setByYou: boolean;
  /** The setter's display name (Home's `Colin seated you with …`), or null when they no longer have a profile. Branded unless the viewer set it. */
  setterName: string | ThirdPartyName | null;
  /** The viewer's own seated deck's name, or null while their seat waits. */
  yourDeck: string | null;
  seats: TableFace[];
};

const mine = alias(ruleZeroSeats, "mine");
const viewerIn = alias(podMembers, "viewer_in");
const setter = alias(socialProfiles, "setter");
const viewerFriend = alias(friendLinks, "viewer_friend");
const mineDeck = alias(decks, "mine_deck");

/**
 * The open tables the viewer sits at, of pods they are still in. Apart so a test can render its SQL: the clock is
 * the database's (`expires_at > now()`), never one passed in, so a closed or expired table leaves on the next read.
 */
export function openTablesQuery(viewerId: string, q: Reader = db) {
  return q
    .select({
      tableId: ruleZeroTables.id,
      podId: ruleZeroTables.podId,
      podName: pods.name,
      closesAt: ruleZeroTables.expiresAt,
      setBy: ruleZeroTables.setBy,
      setterName: setter.displayName,
      yourDeck: mineDeck.name,
    })
    .from(ruleZeroTables)
    .innerJoin(mine, and(eq(mine.tableId, ruleZeroTables.id), eq(mine.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
    .leftJoin(setter, eq(setter.userId, ruleZeroTables.setBy))
    .leftJoin(mineDeck, eq(mineDeck.id, mine.deckId))
    .where(tableOpen)
    .orderBy(asc(ruleZeroTables.expiresAt), asc(ruleZeroTables.id));
}

/**
 * The seats of the given tables whose players are still members of the table's pod, with their faces. A player who
 * is not the viewer's friend is drawn as initials (D2, as the pod card draws them): `friend` says which.
 */
export function tableFacesQuery(viewerId: string, tableIds: readonly string[], q: Reader = db) {
  return q
    .select({
      tableId: ruleZeroSeats.tableId,
      userId: ruleZeroSeats.userId,
      displayName: socialProfiles.displayName,
      friend: viewerFriend.friendUserId,
      ...commanderColumns,
    })
    .from(ruleZeroSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroSeats.tableId))
    .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroSeats.userId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroSeats.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, ruleZeroSeats.userId)))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(inArray(ruleZeroSeats.tableId, [...tableIds]))
    .orderBy(asc(ruleZeroSeats.tableId), asc(ruleZeroSeats.seat));
}

/** The viewer's open tables with their seated faces, from ONE snapshot (the pod row on `/friends`, Home's card). */
export async function openTablesFor(viewerId: string): Promise<OpenTable[]> {
  return db.transaction(async (tx) => {
    const tables = await openTablesQuery(viewerId, tx);
    if (tables.length === 0) return [];
    const faces = await tableFacesQuery(viewerId, tables.map((t) => t.tableId), tx);
    return tables.map((t) => ({
      tableId: t.tableId,
      podId: t.podId,
      podName: named(t.podName),
      closesAt: t.closesAt,
      setByYou: t.setBy === viewerId,
      setterName: t.setterName === null || t.setBy === viewerId ? t.setterName : named(t.setterName),
      yourDeck: t.yourDeck,
      seats: faces
        .filter((f) => f.tableId === t.tableId)
        .map((f) => {
          const you = f.userId === viewerId;
          return { displayName: you ? f.displayName : named(f.displayName), you, commander: you || f.friend !== null ? toCommander(f) : null };
        }),
    }));
  // Repeatable read, never read-only: a read-only transaction poisons the pooled connection (cuts-read.ts).
  }, { isolationLevel: "repeatable read" });
}

/**
 * A pod member as setup offers them. `you` is the viewer; a friend reads as `hasDecks` or `noDecks` from the
 * viewer's own link rows (G2); a member who is not the viewer's friend is `picksOwn`, since the viewer may not see
 * their decks (G3), and their `decks` are always empty.
 */
export type SetupMember = {
  publicId: string;
  /** Branded unless this member is the viewer (`kind: "you"`). */
  displayName: string | ThirdPartyName;
  commander: ProfileCommander | null;
  kind: "you" | "hasDecks" | "noDecks" | "picksOwn";
  isOwner: boolean;
  /** The member's decks, newest first (as the game log's picker lists a friend's): the viewer's own and a friend's. */
  decks: SetupDeck[];
  /** The deck a seat starts on (G8): the most recently played, else the most recently edited. */
  start: string | null;
};

/**
 * A deck as setup lists it: name and commander only, no bracket before the table exists. A friend's deck id goes to
 * the client here, as the game log's picker sends it (`listFriendDecks`): it is the id `setTable` checks against the
 * viewer's own friendship. A non-friend's never does, and the table's own payload carries none (decision 5).
 */
export type SetupDeck = { deckId: string; name: string | ThirdPartyName; commanderName: string; artCropUri: string | null };

export type PodSetup = {
  podId: string;
  podName: ThirdPartyName;
  /** The owner's display name, or null when the viewer owns the pod (the invite row's two sentences). */
  owner: ThirdPartyName | null;
  members: SetupMember[];
};

/** The seatable members' decks: the viewer's and each friend's in the pod. Raw and aliased, so nothing resolves wrong. */
export function setupDecksQuery(viewerId: string, podId: string, ruledOwners: readonly string[] = []) {
  // A friend's deck follows the owner's rules, as the game log's picker does
  // (`pickerSeesDeck`); the viewer's own decks are never filtered.
  const ruled = ruledOwners.length === 0 ? sql`` : sql`
      and (d.user_id = ${viewerId} or d.user_id not in (${sql.join(ruledOwners.map((u) => sql`${u}`), sql`, `)})
        or (not d.hidden_from_friends and coalesce(up.friends_see_decks, true)))`;
  return sql`
    select sp.public_id as "publicId", d.id as "deckId", d.name, c.name as "commanderName", c.art_crop_uri as "artCropUri",
      (select max(g.played_at) from ${deckGames} g where g.deck_id = d.id) as "lastPlayed", d.last_edited_at as "lastEdited"
    from ${podMembers} pm
    join ${socialProfiles} sp on sp.user_id = pm.user_id
    join ${decks} d on d.user_id = pm.user_id
    join ${cards} c on c.oracle_id = d.commander_oracle_id
    left join ${userPrefs} up on up.user_id = d.user_id
    where pm.pod_id = ${podId}
      and exists (select 1 from ${podMembers} vi where vi.pod_id = pm.pod_id and vi.user_id = ${viewerId})
      and (pm.user_id = ${viewerId}
        or exists (select 1 from ${friendLinks} fl where fl.user_id = ${viewerId} and fl.friend_user_id = pm.user_id))${ruled}
    order by sp.public_id, d.created_at desc, d.id`;
}

type SetupDeckRow = Omit<SetupDeck, "name"> & { name: string; publicId: string; lastPlayed: string | Date | null; lastEdited: string | Date };

const ms = (d: string | Date | null) => (d === null ? -Infinity : new Date(d).getTime());

/** G8: the most recently played deck, else the most recently edited. Ties keep the list's own order. */
export function startDeck(rows: readonly Pick<SetupDeckRow, "deckId" | "lastPlayed" | "lastEdited">[]): string | null {
  let best: (typeof rows)[number] | null = null;
  for (const r of rows) {
    if (best === null) best = r;
    else if (ms(r.lastPlayed) > ms(best.lastPlayed) || (ms(r.lastPlayed) === ms(best.lastPlayed) && ms(r.lastEdited) > ms(best.lastEdited))) best = r;
  }
  return best?.deckId ?? null;
}

async function podSetupIn(tx: Tx, viewerId: string, podId: string): Promise<PodSetup | null> {
  const [pod] = await tx
    .select({ name: pods.name, ownerUserId: pods.ownerUserId, owner: socialProfiles.displayName })
    .from(pods)
    .innerJoin(viewerIn, and(eq(viewerIn.podId, pods.id), eq(viewerIn.userId, viewerId)))
    .leftJoin(socialProfiles, eq(socialProfiles.userId, pods.ownerUserId))
    .where(eq(pods.id, podId));
  if (!pod) return null;
  const rows = await tx
    .select({
      userId: podMembers.userId,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      friend: viewerFriend.friendUserId,
      ...commanderColumns,
    })
    .from(podMembers)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, podMembers.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, podMembers.userId)))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(eq(podMembers.podId, podId))
    .orderBy(asc(podMembers.joinedAt), asc(podMembers.userId));
  const ruled = await ruledOwnersOf(rows.filter((r) => r.userId !== viewerId && r.friend !== null).map((r) => r.userId));
  const { rows: deckRows } = await tx.execute<SetupDeckRow>(setupDecksQuery(viewerId, podId, ruled));
  const byMember = new Map<string, SetupDeckRow[]>();
  for (const d of deckRows) byMember.set(d.publicId, [...(byMember.get(d.publicId) ?? []), d]);
  // You first, as setup draws you already in (U1); the rest in join order.
  const ordered = [...rows.filter((r) => r.userId === viewerId), ...rows.filter((r) => r.userId !== viewerId)];
  return {
    podId,
    podName: named(pod.name),
    owner: pod.ownerUserId === viewerId || pod.owner === null ? null : named(pod.owner),
    members: ordered.map((r) => {
      const own = r.userId === viewerId;
      const listed = own || r.friend !== null ? byMember.get(r.publicId) ?? [] : [];
      return {
        publicId: r.publicId,
        displayName: own ? r.displayName : named(r.displayName),
        // D2: a member who is not the viewer's friend is drawn as initials, as the pod card draws them.
        commander: own || r.friend !== null ? toCommander(r) : null,
        kind: own ? "you" : r.friend === null ? "picksOwn" : listed.length > 0 ? "hasDecks" : "noDecks",
        isOwner: r.userId === pod.ownerUserId,
        decks: listed.map((d) => ({ deckId: d.deckId, name: own ? d.name : named(d.name), commanderName: d.commanderName, artCropUri: d.artCropUri })),
        start: startDeck(listed),
      };
    }),
  };
}

/** Setup for a pod the viewer is in (`Rule 0 check`, PR 6), or null. */
export async function podSetup(viewerId: string, podId: unknown): Promise<PodSetup | null> {
  if (!isUuid(podId)) return null;
  const setup = await db.transaction((tx) => podSetupIn(tx, viewerId, podId), { isolationLevel: "repeatable read" });
  if (!setup) return null;
  return withSetupArt(setup, await ownedDeckArt(viewerId, setupDeckIds(setup)));
}

const setupDeckIds = (setup: PodSetup) => setup.members.flatMap((m) => m.decks.map((d) => d.deckId));

/** Setup's listed decks drawn from the copy each deck's owner holds (`ownedDeckArt`), else the oracle art read. */
function withSetupArt<T extends PodSetup>(setup: T, art: ReadonlyMap<string, DeckArt>): T {
  if (art.size === 0) return setup;
  return {
    ...setup,
    members: setup.members.map((m) => ({ ...m, decks: m.decks.map((d) => ({ ...d, artCropUri: art.get(d.deckId)?.commander ?? d.artCropUri })) })),
  };
}

/** The pod's members as setup offers them, for a viewer who is one of them; empty otherwise. */
export async function podSetupMembers(viewerId: string, podId: unknown): Promise<SetupMember[]> {
  return (await podSetup(viewerId, podId))?.members ?? [];
}

/** A seat as `Seats` reopens it: its player, and the deck they sit with (any seat's, as the table shows it). */
export type SeatedNow = { publicId: string; deck: { name: string | ThirdPartyName; commanderName: string; artCropUri: string | null } | null };

export type TableSetup = PodSetup & { tableId: string; seated: SeatedNow[] };

/**
 * The setter's `Seats`: setup for the table's pod with the seats kept, through the setter's own grant (the table is
 * open, the viewer set it, sits at it and is still in its pod). Any other viewer gets null.
 */
export async function tableSetup(viewerId: string, tableId: unknown): Promise<TableSetup | null> {
  if (!isUuid(tableId)) return null;
  // Each drawn seat's deck, by the seat's public id, for its owner's art once the snapshot is done (no other player's
  // deck id leaves this function).
  const seatDecks = new Map<string, string>();
  const read = await db.transaction(async (tx) => {
    const { rows: [table] } = await tx.execute<{ podId: string }>(sql`
      select t.pod_id as "podId" from ${ruleZeroTables} t
      where t.id = ${tableId} and t.set_by = ${viewerId} and ${seatedAt(viewerId, tableId)}`);
    if (!table) return null;
    const setup = await podSetupIn(tx, viewerId, table.podId);
    if (!setup) return null;
    const { rows: seated } = await tx.execute<{ publicId: string; deckId: string | null; ownerId: string | null; name: string | null; commanderName: string | null; artCropUri: string | null }>(sql`
      select sp.public_id as "publicId", d.id as "deckId", d.user_id as "ownerId", d.name, c.name as "commanderName", c.art_crop_uri as "artCropUri"
      from ${ruleZeroSeats} s
      join ${socialProfiles} sp on sp.user_id = s.user_id
      join ${podMembers} m on m.user_id = s.user_id and m.pod_id = ${table.podId}
      left join ${decks} d on d.id = s.deck_id
      left join ${cards} c on c.oracle_id = d.commander_oracle_id
      where s.table_id = ${tableId}
      order by s.seat`);
    // A friend's deck chosen while it was listed and hidden since is no longer drawn (the setup list's own rule).
    const hidden = await hiddenFriendDecksIn(tx, seated.flatMap((s) => (s.deckId !== null && s.ownerId !== null && s.ownerId !== viewerId ? [{ id: s.deckId, userId: s.ownerId }] : [])));
    for (const s of seated) if (s.deckId !== null && s.name !== null && !hidden.has(s.deckId)) seatDecks.set(s.publicId, s.deckId);
    return {
      ...setup,
      tableId,
      seated: seated.map((s) => ({
        publicId: s.publicId,
        deck: s.name === null || (s.deckId !== null && hidden.has(s.deckId)) ? null : { name: s.ownerId === viewerId ? s.name : named(s.name), commanderName: s.commanderName ?? "", artCropUri: s.artCropUri },
      })),
    };
  }, { isolationLevel: "repeatable read" });
  if (!read) return null;
  const art = await ownedDeckArt(viewerId, [...setupDeckIds(read), ...seatDecks.values()]);
  const withArt = withSetupArt(read, art);
  return {
    ...withArt,
    seated: withArt.seated.map((s) => {
      const own = art.get(seatDecks.get(s.publicId) ?? "")?.commander;
      return s.deck && own ? { ...s, deck: { ...s.deck, artCropUri: own } } : s;
    }),
  };
}

export type RuleZeroPurge = { seats: number; tables: number };

/**
 * The account purge's Rule 0 part, inside `purgeSocialIn`'s transaction and before the pod hand-on, since a table
 * belongs to the pod's night and not to its next owner: the account's seats and seen rows go, every table it set
 * goes (its seats and seen rows cascade), and so does any table it leaves with fewer than two seats (decision 7).
 */
export async function purgeRuleZeroIn(tx: Tx, userId: string): Promise<RuleZeroPurge> {
  // The caller already holds these tables' pods (`purgeSocialIn`); the table rows next, in id order, the lock every
  // seat writer takes, so a seat count below is never read past a seat write still in flight.
  await tx.execute(sql`
    select t.id from ${ruleZeroTables} t
    where t.set_by = ${userId} or t.closed_by = ${userId} or t.id in (select s.table_id from ${ruleZeroSeats} s where s.user_id = ${userId})
    order by t.id for update`);
  const left = await tx.delete(ruleZeroSeats).where(eq(ruleZeroSeats.userId, userId)).returning({ tableId: ruleZeroSeats.tableId });
  await tx.delete(ruleZeroSeen).where(eq(ruleZeroSeen.userId, userId));
  const set = await tx.delete(ruleZeroTables).where(or(eq(ruleZeroTables.setBy, userId), eq(ruleZeroTables.closedBy, userId))).returning({ id: ruleZeroTables.id });
  const touched = [...new Set(left.map((s) => s.tableId))];
  const short = touched.length === 0 ? [] : await tx
    .delete(ruleZeroTables)
    .where(and(
      inArray(ruleZeroTables.id, touched),
      sql`(select count(*) from ${ruleZeroSeats} rs where rs.table_id = ${ruleZeroTables}.id) < ${SEATS_MIN}`,
    ))
    .returning({ id: ruleZeroTables.id });
  return { seats: left.length, tables: set.length + short.length };
}
