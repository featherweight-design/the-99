/**
 * Friend trades' writes (plan `2026-11-27-friend-trades.md`, "Writes (PR 3)"). The rules are `trade-rules.ts`; this
 * module is every write of `trades`, `trade_rounds` and `trade_cards`, and it lives here because each one reaches
 * another account (`check:social-reads`). The reads are `trade-reads.ts`.
 *
 * Every write follows `spare-requests.ts`:
 * - Outside the transaction: the friend (`resolveFriend`, or the trade's own row joined to the live friendship), and
 *   every card on the offer checked spare AS ITS RECEIVER SEES IT (`loadFriendSpares(receiver, ids)`, filtered to the
 *   holder). That read runs in its own snapshots, as an ask's does, so a card made not-spare between the check and the
 *   statement still lands: no write path locks a spare, and an accepted trade with such a card is ended by Rescind.
 * - Then ONE transaction: the pair's advisory lock (`tradeLockQuery`), so one pair's trade writes are decided one at a
 *   time; both friendship rows FOR SHARE in the purge's order (`lockFriendshipQuery`); the cap, for a propose; ONE
 *   conditional statement naming the viewer's party and role, the live friendship, the status, the unexpired floor
 *   and the round the viewer saw (so a Yes never accepts cards the viewer did not see); and the other person's feed
 *   item (`recordFeedItem`, which queues its push) in the same transaction.
 * - A statement that changes no row answers `gone`. An unfriend ends nothing: every write joins the live friendship,
 *   so a trade with a former friend is simply out of reach.
 *
 * `sides` are the viewer's: `theirs` the friend's spares the viewer would get, `yours` the viewer's own spares the
 * friend would get. Stored, a card's `side` is whose spare it is: `proposer` or `recipient`.
 */
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { friendLinks, socialProfiles, spareRequests, tradeCards, tradeRounds, trades } from "../../db/schema";
import { constraintName, isUniqueViolation } from "../db-error";
import { resolveFriend } from "./access";
import { recordFeedItem } from "./feed-write";
import { isUuid } from "./rules";
import { lockFriendshipQuery, type Tx } from "./spare-requests";
import { loadFriendSpares } from "./spares";
import {
  TRADE_ROUND_MAX, TRADE_SIDE_MAX, cleanSides, isRound, isSeenAt, offerHeld, tradeOpenFloor, type TradeRole, type TradeSides, type TradeStatus,
} from "./trade-rules";

export type ProposeOutcome = { ok: true; id: string } | { ok: false; reason: "not-friend" | "not-spare" | "held" | "used" | "gone" };
export type TradeOutcome = { ok: true } | { ok: false; reason: "not-friend" | "not-spare" | "gone" };
export type CounterOutcome = { ok: true; round: number } | { ok: false; reason: "not-friend" | "not-spare" | "unchanged" | "gone" };

export type Party = { userId: string; publicId: string };
export type StoredCard = { side: TradeRole; oracleId: string };

const other = (r: TradeRole): TradeRole => (r === "proposer" ? "recipient" : "proposer");
const landed = (r: { rowCount?: number | null; rows: unknown[] }) => (r.rowCount ?? r.rows.length) > 0;

/** The viewer's sides as stored rows: `yours` is the viewer's spare, `theirs` the friend's. */
export function storedCards(role: TradeRole, sides: TradeSides): StoredCard[] {
  return [
    ...sides.yours.map((oracleId) => ({ side: role, oracleId })),
    ...sides.theirs.map((oracleId) => ({ side: other(role), oracleId })),
  ];
}

/** A round's stored rows as the viewer's sides. */
export function sidesOf(role: TradeRole, cards: readonly StoredCard[]): TradeSides {
  return {
    yours: cards.filter((c) => c.side === role).map((c) => c.oracleId),
    theirs: cards.filter((c) => c.side !== role).map((c) => c.oracleId),
  };
}

/**
 * The cards on the offer that are no longer spare, each as its receiver sees it. `theirs` go to the viewer, so they are
 * read as the viewer sees the friend's spares; `yours` go to the friend, so they are read as the friend sees the
 * viewer's (the share is the viewer's grant to the friend, and the friend's own read decides it, never the viewer's).
 */
export async function goneCards(viewer: Party, friend: Party, sides: TradeSides): Promise<Set<string>> {
  const goneFrom = async (receiverId: string, holderPublicId: string, ids: readonly string[]) => {
    if (ids.length === 0) return [];
    const offered = new Set(
      (await loadFriendSpares(receiverId, ids)).filter((s) => s.friend.publicId === holderPublicId && s.spare > 0).map((s) => s.oracleId),
    );
    return ids.filter((id) => !offered.has(id));
  };
  const [theirs, yours] = await Promise.all([
    goneFrom(viewer.userId, friend.publicId, sides.theirs),
    goneFrom(friend.userId, viewer.publicId, sides.yours),
  ]);
  return new Set([...theirs, ...yours]);
}

/** Is any card on the offer no longer spare (`goneCards`)? */
export async function anyGone(viewer: Party, friend: Party, sides: TradeSides): Promise<boolean> {
  return (await goneCards(viewer, friend, sides)).size > 0;
}

/** The pair's lock: every trade write between two people is decided one at a time, whoever writes it. */
export function tradeLockQuery(a: string, b: string): SQL {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return sql`select pg_advisory_xact_lock(hashtextextended(${`trade:${lo}:${hi}`}, 0))`;
}

/** The other party of a trade row aliased `t`, for the viewer: the friend the statement must still be friends with. */
export const otherParty = (t: string, viewerId: string) =>
  sql`case when ${sql.raw(t)}.proposer_user_id = ${viewerId} then ${sql.raw(t)}.recipient_user_id else ${sql.raw(t)}.proposer_user_id end`;

/** The live friendship, viewer to the other party, held FOR SHARE until the write commits. */
const friendsStill = (t: string, fl: string, viewerId: string) =>
  sql`exists (select 1 from ${friendLinks} ${sql.raw(fl)}
        where ${sql.raw(fl)}.user_id = ${viewerId} and ${sql.raw(fl)}.friend_user_id = ${otherParty(t, viewerId)} for share)`;

export const isParty = (t: string, viewerId: string) =>
  sql`(${sql.raw(t)}.proposer_user_id = ${viewerId} or ${sql.raw(t)}.recipient_user_id = ${viewerId})`;

/**
 * The round the viewer saw is still the one on the table: same number AND same `offered_at`. A revise rewrites the
 * current round's cards in place and stamps a new `offered_at`, so without this a Yes or a counter keyed on the round
 * alone would act on cards the viewer never saw. Compared at millisecond precision, the precision a JS Date carries.
 */
const roundSeen = (t: string, seenAt: string) =>
  sql`exists (select 1 from ${tradeRounds} srd where srd.trade_id = ${sql.raw(t)}.id and srd.round = ${sql.raw(t)}.round
      and date_trunc('milliseconds', srd.offered_at) = date_trunc('milliseconds', ${seenAt}::timestamptz))`;


const openNow = (t: string, now: Date) =>
  sql`${sql.raw(t)}.status = 'open' and ${sql.raw(t)}.created_at > ${tradeOpenFloor(now).toISOString()}::timestamptz`;

/** The viewer's own public id, for reading their spares as the friend sees them. */
export function ownPublicIdQuery(userId: string): SQL {
  return sql`select osp.public_id from ${socialProfiles} osp where osp.user_id = ${userId}`;
}

export type TradeHead = {
  id: string; status: TradeStatus; round: number; proposerUserId: string; recipientUserId: string; offeredByUserId: string;
  proposerPublicId: string; recipientPublicId: string;
};

/** A trade the viewer is party to, with both public ids, while the viewer and the other party are still friends. */
export function tradeHeadQuery(viewerId: string, tradeId: string): SQL {
  return sql`select htr.id, htr.status, htr.round, htr.proposer_user_id, htr.recipient_user_id, htr.offered_by_user_id,
      hpp.public_id as proposer_public_id, hrp.public_id as recipient_public_id
    from ${trades} htr
    join ${socialProfiles} hpp on hpp.user_id = htr.proposer_user_id
    join ${socialProfiles} hrp on hrp.user_id = htr.recipient_user_id
    where htr.id = ${tradeId} and ${isParty("htr", viewerId)}
      and exists (select 1 from ${friendLinks} hfl where hfl.user_id = ${viewerId} and hfl.friend_user_id = ${otherParty("htr", viewerId)})`;
}

type HeadRow = {
  id: string; status: TradeStatus; round: number; proposer_user_id: string; recipient_user_id: string; offered_by_user_id: string;
  proposer_public_id: string; recipient_public_id: string;
};

async function loadHead(viewerId: string, tradeId: string): Promise<TradeHead | null> {
  const [r] = (await db.execute<HeadRow>(tradeHeadQuery(viewerId, tradeId))).rows;
  if (!r) return null;
  return {
    id: r.id, status: r.status, round: Number(r.round), proposerUserId: r.proposer_user_id, recipientUserId: r.recipient_user_id,
    offeredByUserId: r.offered_by_user_id, proposerPublicId: r.proposer_public_id, recipientPublicId: r.recipient_public_id,
  };
}

/** The head's two parties as the viewer sees them. */
function partiesOf(h: TradeHead, viewerId: string): { role: TradeRole; viewer: Party; friend: Party } {
  const proposer = { userId: h.proposerUserId, publicId: h.proposerPublicId };
  const recipient = { userId: h.recipientUserId, publicId: h.recipientPublicId };
  return h.proposerUserId === viewerId
    ? { role: "proposer", viewer: proposer, friend: recipient }
    : { role: "recipient", viewer: recipient, friend: proposer };
}

/** One round's cards. Read after the head, which proved the viewer is a party. */
export function roundCardsQuery(tradeId: string, round: number): SQL {
  return sql`select rtc.side, rtc.oracle_id from ${tradeCards} rtc where rtc.trade_id = ${tradeId} and rtc.round = ${round}`;
}

async function loadRoundCards(tradeId: string, round: number): Promise<StoredCard[]> {
  const rows = (await db.execute<{ side: TradeRole; oracle_id: string }>(roundCardsQuery(tradeId, round))).rows;
  return rows.map((r) => ({ side: r.side, oracleId: r.oracle_id }));
}

class Refused extends Error {
  constructor(readonly outcome: unknown) {
    super("refused");
  }
}

/**
 * The pair's transaction: the advisory lock, then both friendship rows in the purge's order, then `body`. A refusal
 * from `body` rolls everything back and is handed out.
 */
async function inTradeTransaction<T extends { ok: boolean }>(a: string, b: string, body: (tx: Tx) => Promise<T>): Promise<T | { ok: false; reason: "not-friend" }> {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(tradeLockQuery(a, b));
      const links = await tx.execute(lockFriendshipQuery(a, b));
      if (links.rows.length !== 2) throw new Refused({ ok: false, reason: "not-friend" });
      const out = await body(tx);
      if (!out.ok) throw new Refused(out);
      return out;
    });
  } catch (e) {
    if (e instanceof Refused) return e.outcome as T | { ok: false; reason: "not-friend" };
    throw e;
  }
}

async function tellOther(tx: Tx, to: string, from: string, trade: string, round: number, event: "offer" | "counter" | "accept" | "decline", now: Date) {
  await recordFeedItem(tx, {
    userId: to, kind: "trade", dedupeKey: `${trade}:${round}:${event}`, friendUserId: from, data: { trade, round, event }, now,
  });
}

// ---- Propose -------------------------------------------------------------------------------------------------------

/**
 * The spare request a trade starts from: the friend asked the viewer for a card and the viewer said Yes. Its card goes
 * on the viewer's side.
 */
export function fromRequestQuery(viewerId: string, friendId: string, requestId: string): SQL {
  return sql`select fsr.oracle_id from ${spareRequests} fsr
    where fsr.id = ${requestId} and fsr.holder_user_id = ${viewerId} and fsr.asker_user_id = ${friendId}
      and fsr.initiated_by = 'asker' and fsr.status = 'yes'`;
}

/** The pair's open trades, read under the pair's lock for the cap (`offerHeld`). */
export function tradeCapQuery(a: string, b: string): SQL {
  return sql`select ctr.status, ctr.created_at, ctr.proposer_user_id, ctr.recipient_user_id, ctr.round from ${trades} ctr
    where ctr.status = 'open'
      and ((ctr.proposer_user_id = ${a} and ctr.recipient_user_id = ${b}) or (ctr.proposer_user_id = ${b} and ctr.recipient_user_id = ${a}))`;
}

const cardValues = (cards: readonly StoredCard[]) => sql.join(cards.map((c) => sql`(${c.side}, ${c.oracleId}::uuid)`), sql`, `);

/** The trade, its round 1 and its cards, in one statement. */
export function proposeInsertQuery(
  proposerId: string, recipientId: string, cards: readonly StoredCard[], fromRequestId: string | null, now: Date,
): SQL {
  const at = now.toISOString();
  return sql`with t as (
      insert into ${trades} (proposer_user_id, recipient_user_id, offered_by_user_id, round, from_request_id, created_at)
      values (${proposerId}, ${recipientId}, ${proposerId}, 1, ${fromRequestId}::uuid, ${at}::timestamptz)
      returning id),
    r as (insert into ${tradeRounds} (trade_id, round, offered_at) select t.id, 1, ${at}::timestamptz from t returning trade_id),
    c as (insert into ${tradeCards} (trade_id, round, side, oracle_id)
      select t.id, 1, v.side, v.oracle_id from t cross join (values ${cardValues(cards)}) as v(side, oracle_id) returning 1)
    select t.id from t`;
}


/**
 * Offers the friend `friendPublicId` a trade. Every card must be spare now, as its receiver sees it (`not-spare`); one
 * unanswered offer per friend (Q10, `held`); `fromRequestId` names the viewer's own Yes to that friend's ask, whose card
 * is put on the viewer's side, and a second trade from it is `used`.
 */
export async function proposeTrade(
  viewerId: string, friendPublicId: unknown, rawSides: unknown, fromRequestId: unknown = null, now = new Date(),
): Promise<ProposeOutcome> {
  const sides = cleanSides(rawSides);
  if (!sides) return { ok: false, reason: "gone" };
  if (fromRequestId != null && !isUuid(fromRequestId)) return { ok: false, reason: "gone" };
  if (!isUuid(friendPublicId)) return { ok: false, reason: "not-friend" };
  const [friendId, ownRows] = await Promise.all([
    resolveFriend(viewerId, friendPublicId),
    db.execute<{ public_id: string }>(ownPublicIdQuery(viewerId)),
  ]);
  if (!friendId) return { ok: false, reason: "not-friend" };
  const [own] = ownRows.rows;
  if (!own) return { ok: false, reason: "not-friend" };

  let yours = sides.yours;
  if (fromRequestId != null) {
    const [req] = (await db.execute<{ oracle_id: string }>(fromRequestQuery(viewerId, friendId, fromRequestId))).rows;
    if (!req) return { ok: false, reason: "gone" };
    if (!yours.includes(req.oracle_id)) {
      if (yours.length >= TRADE_SIDE_MAX) return { ok: false, reason: "gone" };
      yours = [...yours, req.oracle_id];
    }
  }
  const offer = { theirs: sides.theirs, yours };
  if (await anyGone({ userId: viewerId, publicId: own.public_id }, { userId: friendId, publicId: friendPublicId }, offer)) {
    return { ok: false, reason: "not-spare" };
  }

  try {
    return await inTradeTransaction(viewerId, friendId, async (tx): Promise<ProposeOutcome> => {
      const open = (await tx.execute<{ status: TradeStatus; created_at: string | Date; proposer_user_id: string; recipient_user_id: string; round: number }>(
        tradeCapQuery(viewerId, friendId),
      )).rows.map((r) => ({
        status: r.status, createdAt: new Date(r.created_at), proposerUserId: r.proposer_user_id, recipientUserId: r.recipient_user_id, round: Number(r.round),
      }));
      if (offerHeld(open, viewerId, now)) return { ok: false, reason: "held" };
      const [row] = (await tx.execute<{ id: string }>(
        proposeInsertQuery(viewerId, friendId, storedCards("proposer", offer), (fromRequestId as string | null) ?? null, now),
      )).rows;
      await tellOther(tx, friendId, viewerId, row.id, 1, "offer", now);
      return { ok: true, id: row.id };
    });
  } catch (e) {
    // `trades_from_request_once`: one trade per spare request, however two presses race.
    if (isUniqueViolation(e) && constraintName(e) === "trades_from_request_once") return { ok: false, reason: "used" };
    throw e;
  }
}

// ---- Counter and revise --------------------------------------------------------------------------------------------

/** The counter: the non-author of an open, unexpired trade at the round they saw, below the round cap. */
export function counterQuery(viewerId: string, tradeId: string, seenRound: number, seenAt: string, now: Date): SQL {
  return sql`update ${trades} ctr set round = ctr.round + 1, offered_by_user_id = ${viewerId}
    where ctr.id = ${tradeId} and ${isParty("ctr", viewerId)} and ctr.offered_by_user_id <> ${viewerId}
      and ${openNow("ctr", now)} and ctr.round = ${seenRound} and ctr.round < ${TRADE_ROUND_MAX} and ${roundSeen("ctr", seenAt)}
      and ${friendsStill("ctr", "cfl", viewerId)}
    returning ctr.id, ctr.round`;
}

/** A new round and its cards, in one statement. */
export function roundInsertQuery(tradeId: string, round: number, cards: readonly StoredCard[], now: Date): SQL {
  return sql`with r as (insert into ${tradeRounds} (trade_id, round, offered_at) values (${tradeId}, ${round}, ${now.toISOString()}::timestamptz) returning trade_id)
    insert into ${tradeCards} (trade_id, round, side, oracle_id)
      select r.trade_id, ${round}::int, v.side, v.oracle_id from r cross join (values ${cardValues(cards)}) as v(side, oracle_id)`;
}

/**
 * The viewer counters the offer they were sent at `seenRound` with their own sides: the next round, theirs to author.
 * The cap never holds a counter back.
 */
export async function counterTrade(
  viewerId: string, tradeId: unknown, seenRound: unknown, seenAt: unknown, rawSides: unknown, now = new Date(),
): Promise<CounterOutcome> {
  const sides = cleanSides(rawSides);
  if (!sides || !isUuid(tradeId) || !isRound(seenRound) || !isSeenAt(seenAt)) return { ok: false, reason: "gone" };
  const head = await loadHead(viewerId, tradeId);
  if (!head || head.round !== seenRound || head.offeredByUserId === viewerId) return { ok: false, reason: "gone" };
  const p = partiesOf(head, viewerId);
  // A counter must change the offer: an identical one would advance the round, push the friend and spend the round
  // cap for nothing. The round's cards are read outside the transaction; the statement's `roundSeen` refuses the
  // counter if a revise rewrote them since.
  const [current, gone] = await Promise.all([loadRoundCards(tradeId, seenRound), anyGone(p.viewer, p.friend, sides)]);
  if (sameSides(sidesOf(p.role, current), sides)) return { ok: false, reason: "unchanged" };
  if (gone) return { ok: false, reason: "not-spare" };
  return inTradeTransaction(viewerId, p.friend.userId, async (tx): Promise<CounterOutcome> => {
    const [row] = (await tx.execute<{ id: string; round: number }>(counterQuery(viewerId, tradeId, seenRound, seenAt, now))).rows;
    if (!row) return { ok: false, reason: "gone" };
    const round = Number(row.round);
    await tx.execute(roundInsertQuery(tradeId, round, storedCards(p.role, sides), now));
    await tellOther(tx, p.friend.userId, viewerId, tradeId, round, "counter", now);
    return { ok: true, round };
  });
}

/** Both sides hold the same cards, in any order. */
function sameSides(a: TradeSides, b: TradeSides): boolean {
  const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((id) => y.includes(id));
  return same(a.yours, b.yours) && same(a.theirs, b.theirs);
}

/**
 * The revise's statement: the author's own open, unexpired offer, at the round AND `offered_at` they saw, gets a new
 * `offered_at`. Keyed on the time too, so a second tab's revise of the same round lands nothing once the first has.
 */
export function reviseRoundQuery(viewerId: string, tradeId: string, seenRound: number, seenAt: string, now: Date): SQL {
  return sql`update ${tradeRounds} rvr set offered_at = ${now.toISOString()}::timestamptz
    from ${trades} rtr
    where rvr.trade_id = rtr.id and rvr.round = rtr.round
      and rtr.id = ${tradeId} and rtr.offered_by_user_id = ${viewerId} and ${isParty("rtr", viewerId)}
      and ${openNow("rtr", now)} and rtr.round = ${seenRound}
      and date_trunc('milliseconds', rvr.offered_at) = date_trunc('milliseconds', ${seenAt}::timestamptz)
      and ${friendsStill("rtr", "rfl", viewerId)}
    returning rvr.round`;
}

export function roundCardsDeleteQuery(tradeId: string, round: number): SQL {
  return sql`delete from ${tradeCards} dtc where dtc.trade_id = ${tradeId} and dtc.round = ${round}`;
}

export function roundCardsInsertQuery(tradeId: string, round: number, cards: readonly StoredCard[]): SQL {
  return sql`insert into ${tradeCards} (trade_id, round, side, oracle_id)
    select ${tradeId}::uuid, ${round}::int, v.side, v.oracle_id from (values ${cardValues(cards)}) as v(side, oracle_id)`;
}

/**
 * The author mends their own offer while a card on it is no longer spare (`lookYours`): the round's cards are
 * rewritten in place and the round keeps its number. Nobody is told, as the other side never answered it.
 */
export async function reviseTrade(
  viewerId: string, tradeId: unknown, seenRound: unknown, seenAt: unknown, rawSides: unknown, now = new Date(),
): Promise<TradeOutcome> {
  const sides = cleanSides(rawSides);
  if (!sides || !isUuid(tradeId) || !isRound(seenRound) || !isSeenAt(seenAt)) return { ok: false, reason: "gone" };
  const head = await loadHead(viewerId, tradeId);
  if (!head || head.round !== seenRound || head.offeredByUserId !== viewerId) return { ok: false, reason: "gone" };
  const p = partiesOf(head, viewerId);
  // Only while Needs a look: the offer as it stands has a card that is no longer spare.
  const [oldGone, newGone] = await Promise.all([
    loadRoundCards(tradeId, seenRound).then((cards) => anyGone(p.viewer, p.friend, sidesOf(p.role, cards))),
    anyGone(p.viewer, p.friend, sides),
  ]);
  if (!oldGone) return { ok: false, reason: "gone" };
  if (newGone) return { ok: false, reason: "not-spare" };
  return inTradeTransaction(viewerId, p.friend.userId, async (tx): Promise<TradeOutcome> => {
    if (!landed(await tx.execute(reviseRoundQuery(viewerId, tradeId, seenRound, seenAt, now)))) return { ok: false, reason: "gone" };
    await tx.execute(roundCardsDeleteQuery(tradeId, seenRound));
    await tx.execute(roundCardsInsertQuery(tradeId, seenRound, storedCards(p.role, sides)));
    return { ok: true };
  });
}

// ---- Answer and withdraw -------------------------------------------------------------------------------------------

/** Yes or No: the non-author of an open, unexpired trade, at the round they saw. */
export function answerTradeQuery(viewerId: string, tradeId: string, seenRound: number, seenAt: string, answer: "yes" | "no", now: Date): SQL {
  const at = sql`${now.toISOString()}::timestamptz`;
  const set = answer === "yes"
    ? sql`status = 'accepted', answered_at = ${at}`
    : sql`status = 'declined', answered_at = ${at}, ended_at = ${at}, ended_by_user_id = ${viewerId}`;
  return sql`update ${trades} atr set ${set}
    where atr.id = ${tradeId} and ${isParty("atr", viewerId)} and atr.offered_by_user_id <> ${viewerId}
      and ${openNow("atr", now)} and atr.round = ${seenRound} and ${roundSeen("atr", seenAt)}
      and ${friendsStill("atr", "afl", viewerId)}
    returning atr.id, atr.round, atr.offered_by_user_id`;
}

/**
 * The viewer answers the offer they were sent at `seenRound`, sent or last revised at `seenAt` (its `offered_at`). Yes re-checks every card first and refuses one no longer
 * spare (`not-spare`: the sheet is in Needs a look). The author is told either way.
 */
export async function answerTrade(
  viewerId: string, tradeId: unknown, seenRound: unknown, seenAt: unknown, answer: unknown, now = new Date(),
): Promise<TradeOutcome> {
  if (!isUuid(tradeId) || !isRound(seenRound) || !isSeenAt(seenAt) || (answer !== "yes" && answer !== "no")) return { ok: false, reason: "gone" };
  // A Yes re-checks the round's cards, read alongside the head rather than after it.
  const [head, cards] = await Promise.all([loadHead(viewerId, tradeId), answer === "yes" ? loadRoundCards(tradeId, seenRound) : null]);
  if (!head || head.round !== seenRound || head.offeredByUserId === viewerId) return { ok: false, reason: "gone" };
  const p = partiesOf(head, viewerId);
  if (cards && (await anyGone(p.viewer, p.friend, sidesOf(p.role, cards)))) return { ok: false, reason: "not-spare" };
  return inTradeTransaction(viewerId, p.friend.userId, async (tx): Promise<TradeOutcome> => {
    const [row] = (await tx.execute<{ id: string; round: number; offered_by_user_id: string }>(
      answerTradeQuery(viewerId, tradeId, seenRound, seenAt, answer, now),
    )).rows;
    if (!row) return { ok: false, reason: "gone" };
    await tellOther(tx, row.offered_by_user_id, viewerId, tradeId, Number(row.round), answer === "yes" ? "accept" : "decline", now);
    return { ok: true };
  });
}

/** The author takes back their open, unexpired offer at the round they saw. */
export function withdrawTradeQuery(viewerId: string, tradeId: string, seenRound: number, now: Date): SQL {
  const at = sql`${now.toISOString()}::timestamptz`;
  return sql`update ${trades} wtr set status = 'withdrawn', ended_at = ${at}, ended_by_user_id = ${viewerId}
    where wtr.id = ${tradeId} and ${isParty("wtr", viewerId)} and wtr.offered_by_user_id = ${viewerId}
      and ${openNow("wtr", now)} and wtr.round = ${seenRound}
      and ${friendsStill("wtr", "wfl", viewerId)}
    returning wtr.id`;
}

// ---- Accepted trades and clearing ----------------------------------------------------------------------------------

/** Either side calls off an accepted trade. Accepted trades never expire, so there is no floor. */
export function rescindTradeQuery(viewerId: string, tradeId: string, now: Date): SQL {
  const at = sql`${now.toISOString()}::timestamptz`;
  return sql`update ${trades} xtr set status = 'rescinded', ended_at = ${at}, ended_by_user_id = ${viewerId}
    where xtr.id = ${tradeId} and ${isParty("xtr", viewerId)} and xtr.status = 'accepted'
      and ${friendsStill("xtr", "xfl", viewerId)}
    returning xtr.id`;
}

/** The viewer's mark on an accepted trade, and `traded` in the same UPDATE when the other mark is already set. */
export function markTradedQuery(viewerId: string, tradeId: string, now: Date): SQL {
  const at = sql`${now.toISOString()}::timestamptz`;
  const mine = sql`case when mtr.proposer_user_id = ${viewerId} then mtr.proposer_marked_at else mtr.recipient_marked_at end`;
  const theirs = sql`case when mtr.proposer_user_id = ${viewerId} then mtr.recipient_marked_at else mtr.proposer_marked_at end`;
  return sql`update ${trades} mtr set
      proposer_marked_at = case when mtr.proposer_user_id = ${viewerId} then ${at} else mtr.proposer_marked_at end,
      recipient_marked_at = case when mtr.recipient_user_id = ${viewerId} then ${at} else mtr.recipient_marked_at end,
      status = case when ${theirs} is not null then 'traded' else mtr.status end
    where mtr.id = ${tradeId} and ${isParty("mtr", viewerId)} and mtr.status = 'accepted' and ${mine} is null
      and ${friendsStill("mtr", "mfl", viewerId)}
    returning mtr.id, mtr.status`;
}

/**
 * ✕ on an ended trade: it leaves the viewer's list and nothing else. An `open` trade past its days counts as ended and
 * is written `expired` as it goes, as a cleared ask is.
 */
export function clearTradeQuery(viewerId: string, tradeId: string, now: Date): SQL {
  const at = sql`${now.toISOString()}::timestamptz`;
  const floor = sql`${tradeOpenFloor(now).toISOString()}::timestamptz`;
  return sql`update ${trades} ltr set
      proposer_cleared_at = case when ltr.proposer_user_id = ${viewerId} then ${at} else ltr.proposer_cleared_at end,
      recipient_cleared_at = case when ltr.recipient_user_id = ${viewerId} then ${at} else ltr.recipient_cleared_at end,
      status = case when ltr.status = 'open' then 'expired' else ltr.status end
    where ltr.id = ${tradeId} and ${isParty("ltr", viewerId)}
      and (case when ltr.proposer_user_id = ${viewerId} then ltr.proposer_cleared_at else ltr.recipient_cleared_at end) is null
      and (ltr.status in ('traded', 'declined', 'withdrawn', 'rescinded', 'expired')
        or (ltr.status = 'open' and ltr.created_at <= ${floor}))
      and ${friendsStill("ltr", "lfl", viewerId)}
    returning ltr.id`;
}

/** A write by id with no cards and no feed item: the head for the friend, then the pair's transaction and `query`. */
async function simpleWrite(viewerId: string, tradeId: unknown, query: (id: string) => SQL): Promise<TradeOutcome> {
  if (!isUuid(tradeId)) return { ok: false, reason: "gone" };
  const head = await loadHead(viewerId, tradeId);
  if (!head) return { ok: false, reason: "gone" };
  const friendId = partiesOf(head, viewerId).friend.userId;
  return inTradeTransaction(viewerId, friendId, async (tx): Promise<TradeOutcome> =>
    (landed(await tx.execute(query(tradeId))) ? { ok: true } : { ok: false, reason: "gone" }));
}

/** The author withdraws their open offer. Nobody is told, as an ask's withdraw. */
export function withdrawTrade(viewerId: string, tradeId: unknown, seenRound: unknown, now = new Date()): Promise<TradeOutcome> {
  if (!isRound(seenRound)) return Promise.resolve({ ok: false, reason: "gone" });
  return simpleWrite(viewerId, tradeId, (id) => withdrawTradeQuery(viewerId, id, seenRound, now));
}

/** Either side calls off an accepted trade. Nobody is pushed. */
export function rescindTrade(viewerId: string, tradeId: unknown, now = new Date()): Promise<TradeOutcome> {
  return simpleWrite(viewerId, tradeId, (id) => rescindTradeQuery(viewerId, id, now));
}

/** Either side marks an accepted trade as traded; the second mark makes it `traded`. No push. */
export function markTraded(viewerId: string, tradeId: unknown, now = new Date()): Promise<TradeOutcome> {
  return simpleWrite(viewerId, tradeId, (id) => markTradedQuery(viewerId, id, now));
}

/** Either side clears an ended trade from their own list. */
export function clearTrade(viewerId: string, tradeId: unknown, now = new Date()): Promise<TradeOutcome> {
  return simpleWrite(viewerId, tradeId, (id) => clearTradeQuery(viewerId, id, now));
}
