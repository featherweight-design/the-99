/**
 * Rule 0's table read (plan `docs/superpowers/plans/2026-10-16-rule-zero.md` §PR 2b): what a seated player sees of
 * the table, and the one write another player's read may cause, `readOnTheSpot`.
 *
 * **The grant comes first, in one statement**: the viewer's seat at the table, the table open on the database's
 * clock, and the viewer still a member of its pod (decision 3). Only then are the seats read, each deck under its OWN
 * player's id, and all of it from one repeatable-read snapshot, so a swap landing mid-read cannot pair one seat's new
 * deck with another's old reading. A seat whose player has left the pod is omitted.
 *
 * What a seat carries is readiness gap 2's list and nothing else: the player's display name (and `publicId` only
 * when the two are friends), the deck's name and commanders, its reading reduced to what the table draws, its card
 * count and its state. No other player's deck id (decision 5): a seat is addressed by its number.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckGames, deckProfiles, decks, friendLinks, podMembers, pods, ruleZeroSeats, ruleZeroTables, socialProfiles, userPrefs } from "../../db/schema";
import { named } from "../person-name/mint";
import type { ThirdPartyName } from "../person-name/brand";
import { declarationAsk, type DeclarationAsk } from "../bracket/declaration-ask";
import { findings, type FindingId } from "../bracket/findings";
import { slotDeck } from "../bracket/slot";
import type { Bracket, RuleId } from "../bracket/types";
import { isReachablePermits, verdictSubLine, type VerdictSubLine } from "../bracket/verdict-head";
import { computeAndStoreProfile, deckLegality, readStoredReading, requestProfileDeps, seatReadingIn, type StoredProfileDeps } from "../profile/stored";
import {
  distanceFrom, driversFor, inRead, MAX_SUGGESTIONS, seatState, seatValue, suggestionsFor, tableRead, tutorsReaching,
  type Drivers, type ReadSeat, type SeatState, type SeatValue, type TableRead,
} from "../rule-zero/rules";
import { resolveSwitchEnv } from "../switches/snapshot";
import { ownedDeckArt } from "./rule-zero-art";
import { ruledSeatOwnersOf, SEATS_MAX, seatDeckVisible } from "./rule-zero";
import { isUuid } from "./rules";
import { tableEnded, tableOpen } from "./rule-zero-open";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A deck's reading as the table draws it. Absent while the seat is not in the read (`state`). */
export type SeatReading = {
  permits: Bracket[];
  declared: Bracket | null;
  ask: DeclarationAsk;
  /** The five findings' counts, in `FINDING_ORDER`. */
  findings: { id: FindingId; count: number }[];
  subLine: VerdictSubLine;
  /** The combo that decided the boundary, by its cards' names, and how many distinct tutors reach it. */
  lean: { likely: 3 | 4; combo: string[] | null; tutors: number } | null;
  /** What ruled out the bracket below a RANGE's low end, for `driversFor`'s `[4,5]` case. */
  rangeReasons: { rule: RuleId; have: number; limit: number }[];
};

export type TableSeat = {
  seat: number;
  /** Another player's name is branded; the viewer's own seat (`you`) stays plain. */
  displayName: string | ThirdPartyName;
  /** Only when the viewer and this player are friends. */
  publicId: string | null;
  you: boolean;
  /** This player owns the table's pod. */
  podOwner: boolean;
  changedAt: Date;
  /** Null while the seat waits for its player's deck. */
  deck: {
    /** The viewer's OWN deck id only (Change deck, the suggestion); null on every other seat. */
    deckId: string | null;
    /** The seat player's deck name: branded on every seat but the viewer's own. */
    name: string | ThirdPartyName;
    commander: { name: string; artCropUri: string | null };
    partner: { name: string; artCropUri: string | null } | null;
    /** The whole deck, commanders in, so `87 of 100`. */
    cards: number;
    reading: SeatReading | null;
  } | null;
  state: SeatState;
  value: SeatValue | null;
  /** This seat's place in the read, when it is in it. */
  read: Omit<ReadSeat<string>, "id"> | null;
  /** What puts a flagged seat where it is. */
  drivers: Drivers | null;
};

export type TableView = {
  tableId: string;
  podName: ThirdPartyName;
  closesAt: Date;
  setByYou: boolean;
  /** The setter's display name, or null when they no longer have a profile. */
  setBy: ThirdPartyName | null;
  /** The viewer's own seated deck, or null while their seat waits. */
  viewerDeckId: string | null;
  /** The latest `changed_at` among the seats drawn: what `markSeen` is handed back. */
  revision: Date;
  /** The viewer's own `seen_at`, or null before their first draw: a seat changed after it carries a dot. */
  seenAt: Date | null;
  read: { kind: "notEnough"; read: number } | { kind: "read"; middle: number; band: boolean };
  seats: TableSeat[];
  /**
   * `Closer to the table` (G6, plan PR 7): the viewer's own decks that read nearer the middle than their flagged seat,
   * at most three, nearest first. Empty unless the viewer's own seat is flagged. Each carries the viewer's own deck id
   * only (decision 5).
   */
  offer: OfferDeck[];
};

export type OfferDeck = { deckId: string; name: string; artCropUri: string | null; permits: Bracket[]; answered: Bracket | null };

const viewerSeat = alias(ruleZeroSeats, "viewer_seat");
const viewerIn = alias(podMembers, "viewer_in");
const closer = alias(socialProfiles, "closer");

/**
 * The table, only through the viewer's grant: seated, open, still in the pod. Apart so a test can render its SQL.
 * `closed` asks the same grant of a table that has ended (`tableEnded`: closed by its host, or past its morning), for the closed page (L4, H3).
 */
export function tableGrantQuery(viewerId: string, tableId: string, q: Pick<typeof db, "select"> = db, closed = false) {
  return q
    .select({
      podName: pods.name,
      podOwner: pods.ownerUserId,
      closesAt: ruleZeroTables.expiresAt,
      setBy: ruleZeroTables.setBy,
      setByName: socialProfiles.displayName,
      closedAt: ruleZeroTables.closedAt,
      closedBy: ruleZeroTables.closedBy,
      closerName: closer.displayName,
      // Still inside its original night: a host-closed table keeps Log this game until then (`tableLoggable`).
      loggable: sql<boolean>`(${ruleZeroTables.expiresAt} > now())`,
    })
    .from(ruleZeroTables)
    .innerJoin(viewerSeat, and(eq(viewerSeat.tableId, ruleZeroTables.id), eq(viewerSeat.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
    .leftJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroTables.setBy))
    .leftJoin(closer, eq(closer.userId, ruleZeroTables.closedBy))
    .where(and(eq(ruleZeroTables.id, tableId), closed ? tableEnded : tableOpen));
}

const viewerFriend = alias(friendLinks, "viewer_friend");
const commanderOf = alias(cards, "seat_commander");
const partnerOf = alias(cards, "seat_partner");

/** The table's seats whose players are still in its pod, in seat order. Read only after the grant. */
export function seatsQuery(viewerId: string, tableId: string, q: Pick<typeof db, "select">, ruledOwners: readonly string[] = []) {
  // Another player's deck is drawn only while their deck rules let friends see it, under the OWNER's switch.
  const visible = seatDeckVisible(viewerId, ruledOwners);
  return q
    .select({
      seat: ruleZeroSeats.seat,
      userId: ruleZeroSeats.userId,
      changedAt: ruleZeroSeats.changedAt,
      displayName: socialProfiles.displayName,
      publicId: socialProfiles.publicId,
      friend: viewerFriend.friendUserId,
      deckId: decks.id,
      deckName: decks.name,
      commanderName: commanderOf.name,
      commanderArt: commanderOf.artCropUri,
      partnerName: partnerOf.name,
      partnerArt: partnerOf.artCropUri,
    })
    .from(ruleZeroSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroSeats.tableId))
    .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroSeats.userId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroSeats.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, ruleZeroSeats.userId)))
    // The seat player's deck rules, joined ahead of the deck that reads them (the seat's player is the deck's owner).
    .leftJoin(userPrefs, eq(userPrefs.userId, ruleZeroSeats.userId))
    // The seat's deck only while it is the seat player's own: `setSeatDeck` and setup write nothing else.
    .leftJoin(decks, and(eq(decks.id, ruleZeroSeats.deckId), eq(decks.userId, ruleZeroSeats.userId), visible))
    .leftJoin(commanderOf, eq(commanderOf.oracleId, decks.commanderOracleId))
    .leftJoin(partnerOf, eq(partnerOf.oracleId, decks.partnerOracleId))
    .where(eq(ruleZeroSeats.tableId, tableId))
    .orderBy(asc(ruleZeroSeats.seat));
}

/** The seats, with the owners whose deck rules apply decided first (the seats' players are read ahead of it). */
async function readSeats(viewerId: string, tableId: string, q: Tx) {
  return seatsQuery(viewerId, tableId, q, await ruledSeatOwnersOf(viewerId, tableId, q));
}

type Verdict = ReturnType<typeof slotDeck>;

function readingOf(verdict: Verdict, profile: Parameters<typeof findings>[0], declared: Bracket | null): SeatReading {
  const combo = verdict.lean?.decidedBy ?? null;
  const below = verdict.permits[0] - 1;
  return {
    permits: [...verdict.permits],
    declared,
    ask: declarationAsk(verdict.permits, declared),
    findings: findings(profile).map((f) => ({ id: f.id, count: f.count })),
    subLine: verdictSubLine(verdict),
    lean: verdict.lean ? { likely: verdict.lean.likely, combo: combo ? combo.cards.map((c) => c.name) : null, tutors: tutorsReaching(verdict.lean, combo) } : null,
    rangeReasons: verdict.permits.length > 1
      ? verdict.violations.filter((v) => v.bracket === below).map((v) => ({ rule: v.rule, have: v.have, limit: v.limit }))
      : [],
  };
}

const asBracket = (n: number | null): Bracket | null => (n !== null && n >= 1 && n <= 5 ? (n as Bracket) : null);

/**
 * The table as the viewer sees it, or null: not found, expired, not seated, or no longer in the pod. The grant is
 * one statement; the seats and every reading follow in the same repeatable-read snapshot.
 */
/** One deck graded as a seat is: its legality and reading as `seatState` sees them, and its verdict when in the read. */
async function gradeDeckIn(tx: Tx, deckId: string, owner: string) {
  const stored = await seatReadingIn(tx, deckId, owner);
  if (!stored) return null;
  const { head, reading } = stored;
  const legality = deckLegality(head);
  const declared = asBracket(head.declaredBracket);
  const state = seatState({
    built: legality.built,
    size: legality.size,
    // An older reading over the same list is the rebuild `readOnTheSpot` makes, so it reads as unread here.
    reading: reading === "none" || reading === "rebuildable" ? "none" : reading === "unreadable" ? "unreadable" : { fresh: reading.fresh },
  });
  const verdict = typeof reading === "object" && inRead(state) ? slotDeck(reading.profile, declared) : null;
  return { legality, declared, state, verdict, profile: typeof reading === "object" ? reading.profile : null };
}

/**
 * The viewer's own decks nearer the middle than their flagged seat (G6): every own deck graded as a seat is (legal
 * now, with a reading), handed to `suggestionsFor`. Read only while the viewer's seat is flagged, inside the table's
 * snapshot, so the offer and the read agree.
 */
/** The viewer's own decks but the seated one, never another player's (decision 5). Apart so a test can render it. */
export function ownDecksQuery(viewerId: string, seatedDeckId: string) {
  return sql`
    select d.id as "deckId", d.name, c.art_crop_uri as "artCropUri", d.declared_bracket as "declared", p.permits,
      (select max(g.played_at) from ${deckGames} g where g.deck_id = d.id) as "lastPlayed"
    from ${decks} d
    join ${cards} c on c.oracle_id = d.commander_oracle_id
    left join ${deckProfiles} p on p.deck_id = d.id and p.user_id = d.user_id
    where d.user_id = ${viewerId} and d.id <> ${seatedDeckId}`;
}

async function offerIn(tx: Tx, viewerId: string, seatedDeckId: string, seatedDistance: number, middle: number): Promise<OfferDeck[]> {
  // ONE read of every own deck with its stored permits: the candidates are the decks those permits place strictly
  // nearer, in the offer's order. Stored permits hold over an edit, so each candidate is then graded as a seat is
  // (legal now, a fresh or stale reading) before it is offered, and grading stops at the third: a poll pays four
  // reads per candidate it needs, not per deck the player owns.
  const { rows } = await tx.execute<{ deckId: string; name: string; artCropUri: string | null; declared: number | null; permits: number[] | null; lastPlayed: string | Date | null }>(
    ownDecksQuery(viewerId, seatedDeckId),
  );
  const candidates = suggestionsFor(
    seatedDeckId,
    seatedDistance,
    rows.map((r) => ({
      deckId: r.deckId,
      value: r.permits && isReachablePermits(r.permits) ? seatValue(r.permits, asBracket(r.declared)) : null,
      lastPlayedAt: r.lastPlayed === null ? null : new Date(r.lastPlayed),
    })),
    middle,
    rows.length,
  );
  const byId = new Map(rows.map((r) => [r.deckId, r]));
  const offer: OfferDeck[] = [];
  for (const c of candidates) {
    if (offer.length === MAX_SUGGESTIONS) break;
    const g = await gradeDeckIn(tx, c.deckId, viewerId);
    if (!g?.verdict || distanceFrom(seatValue(g.verdict.permits, g.declared), middle) >= seatedDistance) continue;
    const r = byId.get(c.deckId)!;
    const ask = declarationAsk(g.verdict.permits, g.declared);
    offer.push({ deckId: c.deckId, name: r.name, artCropUri: r.artCropUri, permits: [...g.verdict.permits], answered: ask.kind === "answered" ? ask.declared : null });
  }
  return offer;
}

/**
 * One of the viewer's own decks as `Change deck` lists it (S3, W3): name, commander and art; the chip when it is in the
 * read (`ready`), else the cards it holds for the `not read yet` line; and whether it is the seated one.
 */
export type DeckChoice = {
  deckId: string;
  name: string;
  commanderName: string;
  artCropUri: string | null;
  seated: boolean;
  ready: { permits: Bracket[]; answered: Bracket | null } | null;
  /** The cards the list holds, the commander in, for a deck not in the read: `94 of 100`. */
  cards: number;
};

/** `Change deck`'s order (S3, W3): the seated deck first, then the read decks nearest the middle, then the rest (G8). */
export function orderChoices<T extends { seated: boolean; distance: number | null; lastPlayed: number; lastEdited: number }>(rows: readonly T[]): T[] {
  const recent = (a: T, b: T) => b.lastPlayed - a.lastPlayed || b.lastEdited - a.lastEdited;
  const rank = (r: T) => (r.seated ? 0 : r.distance !== null ? 1 : 2);
  return [...rows].sort((a, b) => rank(a) - rank(b) || (a.distance ?? 0) - (b.distance ?? 0) || recent(a, b));
}

/**
 * Every deck of the viewer's for `Change deck`, through the seat grant: null unless the viewer sits at the open table.
 * Each is graded the way a seat is, and a deck short of 100 is listed (it seats as not ready, S3).
 */
export async function loadDeckChoices(viewerId: string, tableId: unknown): Promise<DeckChoice[] | null> {
  const view = (await readTable(viewerId, tableId))?.view;
  if (!view) return null;
  const middle = view.read.kind === "read" ? view.read.middle : null;
  return db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ deckId: string; name: string; commanderName: string; artCropUri: string | null; lastPlayed: string | Date | null; lastEdited: string | Date }>(sql`
      select d.id as "deckId", d.name, c.name as "commanderName", c.art_crop_uri as "artCropUri", d.last_edited_at as "lastEdited",
        (select max(g.played_at) from ${deckGames} g where g.deck_id = d.id) as "lastPlayed"
      from ${decks} d
      join ${cards} c on c.oracle_id = d.commander_oracle_id
      where d.user_id = ${viewerId}`);
    const graded = [];
    for (const r of rows) {
      const g = await gradeDeckIn(tx, r.deckId, viewerId);
      const value = g?.verdict ? seatValue(g.verdict.permits, g.declared) : null;
      const ask = g?.verdict ? declarationAsk(g.verdict.permits, g.declared) : null;
      graded.push({
        deckId: r.deckId,
        name: r.name,
        commanderName: r.commanderName,
        artCropUri: r.artCropUri,
        seated: r.deckId === view.viewerDeckId,
        ready: g?.verdict && ask ? { permits: [...g.verdict.permits], answered: ask.kind === "answered" ? ask.declared : null } : null,
        cards: g ? g.legality.built + (100 - g.legality.size) : 0,
        distance: value && middle !== null ? distanceFrom(value, middle) : null,
        lastPlayed: r.lastPlayed === null ? -Infinity : new Date(r.lastPlayed).getTime(),
        lastEdited: new Date(r.lastEdited).getTime(),
      });
    }
    return orderChoices(graded).map(({ distance: _d, lastPlayed: _p, lastEdited: _e, ...c }) => c);
  }, { isolationLevel: "repeatable read" }).then(async (choices) => {
    const art = await ownedDeckArt(viewerId, choices.map((c) => c.deckId));
    return choices.map((c) => ({ ...c, artCropUri: art.get(c.deckId)?.commander ?? c.artCropUri }));
  });
}

export async function loadTable(viewerId: string, tableId: unknown): Promise<TableView | null> {
  const read = await readTable(viewerId, tableId);
  return read && withOwnedArt(viewerId, read.view, read.seatDecks);
}

/** The table without its owned art: `loadTable`'s read, and `loadDeckChoices`', which draws no seat. */
async function readTable(viewerId: string, tableId: unknown): Promise<{ view: TableView; seatDecks: Map<number, string> } | null> {
  if (!isUuid(tableId)) return null;
  // Each drawn seat's deck, by seat number, for its owner's art once the snapshot is done (other players' deck ids
  // never leave this function).
  const seatDecks = new Map<number, string>();
  const view = await db.transaction(async (tx): Promise<TableView | null> => {
    const [table] = await tableGrantQuery(viewerId, tableId, tx);
    if (!table) return null;
    const rows = await readSeats(viewerId, tableId, tx);
    const [seen] = await tx.execute<{ seen_at: Date }>(sql`
      select seen_at from rule_zero_seen where table_id = ${tableId} and user_id = ${viewerId}`).then((r) => r.rows);
    const built: (TableSeat & { verdict: Verdict | null })[] = [];
    for (const r of rows) {
      const base = {
        seat: r.seat,
        displayName: r.userId === viewerId ? r.displayName : named(r.displayName),
        publicId: r.friend !== null ? r.publicId : null,
        you: r.userId === viewerId,
        podOwner: r.userId === table.podOwner,
        changedAt: r.changedAt,
        read: null,
        drivers: null,
      };
      const graded = r.deckId === null ? null : await gradeDeckIn(tx, r.deckId, r.userId);
      if (r.deckId === null || r.deckName === null || r.commanderName === null || !graded) {
        built.push({ ...base, deck: null, state: seatState(null), value: null, verdict: null });
        continue;
      }
      const { legality, declared, state, verdict, profile } = graded;
      seatDecks.set(r.seat, r.deckId);
      built.push({
        ...base,
        deck: {
          deckId: r.userId === viewerId ? r.deckId : null,
          name: r.userId === viewerId ? r.deckName : named(r.deckName),
          commander: { name: r.commanderName, artCropUri: r.commanderArt },
          partner: r.partnerName !== null ? { name: r.partnerName, artCropUri: r.partnerArt } : null,
          cards: legality.built + (100 - legality.size),
          reading: verdict && profile ? readingOf(verdict, profile, declared) : null,
        },
        state,
        value: verdict ? seatValue(verdict.permits, declared) : null,
        verdict,
      });
    }
    const read: TableRead<string> = tableRead(built.map((s) => ({ id: String(s.seat), value: s.value })));
    const placed = new Map(read.kind === "read" ? read.seats.map((s) => [s.id, s]) : []);
    const seats: TableSeat[] = built.map(({ verdict, ...s }) => {
      const at = placed.get(String(s.seat));
      if (!at) return s;
      return {
        ...s,
        read: { face: at.face, distance: at.distance, flag: at.flag },
        drivers: at.flag && verdict ? driversFor(verdict, at.flag, at.face) : null,
      };
    });
    const revision = new Date(Math.max(0, ...seats.map((s) => s.changedAt.getTime())));
    const mine = seats.find((x) => x.you);
    const offer = read.kind === "read" && mine?.read?.flag && mine.deck?.deckId
      ? await offerIn(tx, viewerId, mine.deck.deckId, mine.read.distance, read.middle)
      : [];
    return {
      tableId,
      podName: named(table.podName),
      closesAt: table.closesAt,
      setByYou: table.setBy === viewerId,
      setBy: table.setByName === null ? null : named(table.setByName),
      viewerDeckId: mine?.deck?.deckId ?? null,
      revision,
      seenAt: seen ? new Date(seen.seen_at) : null,
      read: read.kind === "read" ? { kind: "read", middle: read.middle, band: read.band } : read,
      seats,
      offer,
    };
  // Repeatable read, never read-only: a read-only transaction poisons the pooled connection (cuts-read.ts).
  }, { isolationLevel: "repeatable read" });
  return view && { view, seatDecks };
}

/** The seats' and the offer's art, from the copy each deck's owner holds (`ownedDeckArt`), else the oracle art read. */
async function withOwnedArt(viewerId: string, view: TableView, seatDecks: ReadonlyMap<number, string>): Promise<TableView> {
  const art = await ownedDeckArt(viewerId, [...seatDecks.values(), ...view.offer.map((o) => o.deckId)]);
  if (art.size === 0) return view;
  return {
    ...view,
    seats: view.seats.map((s) => {
      const own = s.deck && art.get(seatDecks.get(s.seat) ?? "");
      if (!s.deck || !own) return s;
      return {
        ...s,
        deck: {
          ...s.deck,
          commander: { ...s.deck.commander, artCropUri: own.commander ?? s.deck.commander.artCropUri },
          partner: s.deck.partner && { ...s.deck.partner, artCropUri: own.partner ?? s.deck.partner.artCropUri },
        },
      };
    }),
    offer: view.offer.map((o) => ({ ...o, artCropUri: art.get(o.deckId)?.commander ?? o.artCropUri })),
  };
}

export type ReadOnTheSpot = "read" | "busy" | "skipped" | "refused";

/**
 * The seat's player and deck, only through the viewer's grant, in ONE statement: the viewer's seat at the table, the
 * table open, the viewer and the seat's player both still in its pod. Two statements under read committed would let a
 * reseat committing between them pair the old grant with a newly seated deck. Apart so a test can render its SQL.
 */
export function seatTargetQuery(viewerId: string, tableId: string, seat: number, q: Pick<typeof db, "select"> = db) {
  return q
    .select({ userId: ruleZeroSeats.userId, deckId: decks.id })
    .from(ruleZeroSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroSeats.tableId))
    .innerJoin(viewerSeat, and(eq(viewerSeat.tableId, ruleZeroTables.id), eq(viewerSeat.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroSeats.userId)))
    .innerJoin(decks, and(eq(decks.id, ruleZeroSeats.deckId), eq(decks.userId, ruleZeroSeats.userId)))
    .where(and(eq(ruleZeroSeats.tableId, tableId), eq(ruleZeroSeats.seat, seat), tableOpen));
}

/**
 * At most this many on-the-spot reads run at once in this process. Each holds one connection of the process's ONE
 * pool (`src/db/index.ts`, ten by default) for its advisory lock while the build borrows more from the same pool, so
 * an unbounded number of them reading different decks could hold every connection and leave each build waiting on a
 * connection its own caller holds. A read past the bound answers `busy`, which the poll retries.
 */
export const ON_THE_SPOT_MAX = 2;
let onTheSpot = 0;

/** The poll route's deps for the owner's resolved switches; a probe passes uncached readers. */
export type OwnerDeps = (env: NodeJS.ProcessEnv) => StoredProfileDeps;

/**
 * Read a seat's deck on the spot (readiness gap 8), for a viewer seated at the same open table: only a legal deck
 * with no usable reading (no row, or the older-version row a quiet rebuild replaces), computed under its OWNER's id
 * and the owner's resolved switches and stored as theirs. Model-free: the deterministic profile build the Analysis
 * tab's free press runs. It cannot be driven to repeat: a stale or unreadable row is never recomputed, and it runs
 * under a transaction-scoped `pg_try_advisory_xact_lock` on the deck id, so a second viewer polling at the same
 * moment gets `busy` rather than computing again.
 */
export async function readOnTheSpot(
  viewerId: string,
  tableId: unknown,
  seat: unknown,
  ownerDeps: OwnerDeps = requestProfileDeps,
): Promise<ReadOnTheSpot> {
  if (!isUuid(tableId) || typeof seat !== "number" || !Number.isInteger(seat) || seat < 1 || seat > SEATS_MAX) return "refused";
  if (onTheSpot >= ON_THE_SPOT_MAX) return "busy";
  onTheSpot += 1;
  try {
    return await readUnderLock(viewerId, tableId, seat, ownerDeps);
  } finally {
    onTheSpot -= 1;
  }
}

function readUnderLock(viewerId: string, tableId: string, seat: number, ownerDeps: OwnerDeps): Promise<ReadOnTheSpot> {
  return db.transaction(async (tx: Tx) => {
    const [target] = await seatTargetQuery(viewerId, tableId, seat, tx);
    if (!target) return "refused";
    const { rows } = await tx.execute<{ got: boolean }>(sql`
      select pg_try_advisory_xact_lock(hashtextextended(${`rule-zero-read:${target.deckId}`}, 0)) as got`);
    if (rows[0]?.got !== true) return "busy";
    // Re-read under the lock: a reading that landed while this call waited to start means there is nothing to do.
    const stored = await seatReadingIn(tx, target.deckId, target.userId);
    if (!stored || !deckLegality(stored.head).legal) return "skipped";
    if (stored.reading !== "none" && stored.reading !== "rebuildable") return "skipped";
    const deps = ownerDeps(await resolveSwitchEnv(target.userId));
    // The lock is held by this transaction while the build runs on its own connections.
    if (stored.reading === "none") {
      const result = await computeAndStoreProfile(target.deckId, target.userId, deps, { firstReading: true });
      return result?.kind === "ok" ? "read" : "skipped";
    }
    return (await readStoredReading(target.deckId, target.userId, deps)) ? "read" : "skipped";
  });
}

/**
 * How a closed table ended. `host`: its setter closed it at `at`; `byYou` says the viewer did, otherwise `by` names the
 * closer (null only when the viewer did not close it and the closer's profile is gone). The seated keep Log this game
 * while `logOpen`, until the morning it would have reached. `morning`: it ran out its night. Every `at` is a Date: the
 * route's JSON turns it into an ISO string, so the UI layer revives it (`new Date(at)`) before calling a Date method.
 */
export type ClosedHow =
  | { kind: "host"; byYou: boolean; by: ThirdPartyName | null; at: Date; logOpen: boolean }
  | { kind: "morning"; at: Date };

/** What the closed page (L4, H3) draws: the pod, who set the table (null when the viewer did), how it ended, and the seated faces. */
export type ClosedTable = { podName: ThirdPartyName; setBy: ThirdPartyName | null; how: ClosedHow; faces: { name: string | ThirdPartyName; artCropUri: string | null }[] };

type ClosedGrant = { closesAt: Date; closedAt: Date | null; closedBy: string | null; closerName: string | null; loggable: boolean };

/** How the table ended, from its grant row: closed by its host (the viewer's own close is `byYou`, naming no one), else it ran out its night. */
export function closedHow(viewerId: string, table: ClosedGrant): ClosedHow {
  if (!table.closedAt) return { kind: "morning", at: table.closesAt };
  const byYou = table.closedBy === viewerId;
  return { kind: "host", byYou, by: byYou || table.closerName === null ? null : named(table.closerName), at: table.closedAt, logOpen: table.loggable };
}

/**
 * The viewer's own table after its night ended, or null: not found, still open, not seated, or no longer in the pod.
 * The same grant as `loadTable` on the other side of the clock, and the same seats; nothing but names and art leaves.
 * A pod's expired tables are deleted at its next setup, so this answers only until then.
 */
export async function loadClosedTable(viewerId: string, tableId: unknown): Promise<ClosedTable | null> {
  if (!isUuid(tableId)) return null;
  const read = await db.transaction(async (tx) => {
    const [table] = await tableGrantQuery(viewerId, tableId, tx, true);
    if (!table) return null;
    return { table, rows: await readSeats(viewerId, tableId, tx) };
  }, { isolationLevel: "repeatable read" });
  if (!read) return null;
  const { table, rows } = read;
  const art = await ownedDeckArt(viewerId, rows.flatMap((r) => (r.deckId ? [r.deckId] : [])));
  return {
    podName: named(table.podName),
    setBy: table.setBy === viewerId || table.setByName === null ? null : named(table.setByName),
    how: closedHow(viewerId, table),
    faces: rows.map((r) => ({
      name: r.userId === viewerId ? r.displayName : named(r.displayName),
      artCropUri: (r.deckId ? art.get(r.deckId)?.commander : null) ?? r.commanderArt,
    })),
  };
}
