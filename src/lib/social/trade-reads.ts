/**
 * Friend trades' reads (plan `2026-11-27-friend-trades.md`, "Reads and actions (PR 4)"). The writes are `trades.ts`;
 * these are apart so neither file passes the per-file ceiling (the plan's recorded deviation).
 *
 * Every statement here joins the live friendship (`friend_links`, viewer to the other party) in the same statement, so
 * a trade with a former friend is simply out of reach, as it is to the writes. A friend is drawn as an `OtherSide`:
 * the public id and a `named()` display name, never a Clerk id. Only the viewer's own rows are read: every statement
 * names the viewer as a party.
 *
 * `gone` (Needs a look) is the writes' own rule, `goneCards`, read for open trades only, each card as its receiver sees
 * it. `tradesWaitingWith` alone skips it (the strip's dot is drawn on every friend page, and the spares read is a
 * claim model per friend): it counts what waits on the reader by the trade's row, so a Needs a look on the reader's
 * OWN offer dots only once the sheet or the list has read it.
 */
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { cards, friendLinks, printings, socialProfiles, tradeCards, tradeRounds, trades } from "../../db/schema";
import { loadPrices, type PriceRead } from "../decks/price-query";
import { priceOf, priceState, provenanceForm, type ProvenanceForm } from "../cards/price-fact";
import { named } from "../person-name/mint";
import type { Store } from "../stores/rows";
import { loadFriend, resolveFriend } from "./access";
import { MAX_SPARES_BATCH } from "./client-rules";
import { isUuid } from "./rules";
import { faceOf, type OtherSide } from "./spare-requests";
import { loadFriendSpareList, type FriendSpareLine } from "./spares";
import {
  canAct, compareRows, offerHeld, rowState, sheetState, tradeDaysLeft, tradeOpenFloor, tradeStatus,
  type SheetState, type TradeAction, type TradeFacts, type TradeRole, type TradeRow, type TradeStatus,
} from "./trade-rules";
import { goneCards, isParty, otherParty, ownPublicIdQuery, sidesOf, type Party, type StoredCard } from "./trades";

/** A card on a trade, as the sheet draws it. */
export type TradeCard = { oracleId: string; name: string; imageUri: string | null };

/** The sheet's cards: the current offer's two sides, and the offer before's (for `was` and the counter marks). */
export type TradeViewCards = {
  theirs: TradeCard[];
  yours: TradeCard[];
  /** The sides of the offer the current one replaces, or null on a first offer. */
  previous: { theirs: TradeCard[]; yours: TradeCard[] } | null;
};

export type TradeView = {
  id: string;
  friend: OtherSide;
  state: SheetState;
  status: TradeStatus;
  round: number;
  /** The current round's `offered_at`, at millisecond precision: a counter's and an answer's `seenAt`. */
  offeredAt: string;
  /** The offer the current one replaces, when it was made: a counter's "Replaces your offer of Nov 24". */
  previousAt: Date | null;
  /** Both marks are in: the later one, the trade's day. */
  tradedAt: Date | null;
  /** The first offer, the trade's whole clock (D6). */
  createdAt: Date;
  daysLeft: number;
  cards: TradeViewCards;
  /** The current offer's cards that are no longer spare (open trades only). */
  gone: string[];
  /** Make it a trade: the spare request this trade came from, or null. */
  fromRequestId: string | null;
  /** What the viewer may press now (`canAct`). */
  can: Record<TradeAction, boolean>;
  /** Prices of every card drawn, at the reader's store. */
  prices: TradePrices;
};

/**
 * The figures a trade box sums, at the reader's store: each card's drawn cents (null unpriced, sold out or unread) and
 * when the store was last read, formed on the server (`provenanceForm`). `dated` is null when the read failed or found
 * nothing, and the box then draws bare totals.
 */
export type TradePrices = { store: Store; cents: Record<string, number | null>; dated: ProvenanceForm | null };

/** One trade as a Trades row: the kicker, title and line's facts. Cards are names, for `cardList`. */
export type TradeListRow = {
  id: string;
  friend: OtherSide;
  row: TradeRow;
  status: TradeStatus;
  theirs: string[];
  yours: string[];
  /** Each side's first card's art, for the row's picture (the friend's card in front, the reader's fanned behind). */
  theirImage: string | null;
  yourImage: string | null;
  /** The gone card's name, for a Needs a look row. */
  goneName: string | null;
  daysLeft: number;
  createdAt: Date;
  /** The latest move on the trade: the rows' newest-first order. */
  at: Date;
};

// A trade row's own columns, as every statement here selects them (the trade aliased `t`).
const tradeColumns = (t: string) => sql.raw(`${t}.id, ${t}.status, ${t}.round, ${t}.proposer_user_id, ${t}.recipient_user_id,
  ${t}.created_at, ${t}.ended_by_user_id, ${t}.proposer_marked_at, ${t}.recipient_marked_at`);

// The friend (`social_profiles` aliased `p`, on the friendship `fl`) and their face, as `OtherSide` reads it.
const friendJoin = (t: string, fl: string, p: string, c: string, cp: string, viewerId: string) => sql`
  join ${friendLinks} ${sql.raw(fl)} on ${sql.raw(fl)}.user_id = ${viewerId} and ${sql.raw(fl)}.friend_user_id = ${otherParty(t, viewerId)}
  join ${socialProfiles} ${sql.raw(p)} on ${sql.raw(p)}.user_id = ${sql.raw(fl)}.friend_user_id
  left join ${cards} ${sql.raw(c)} on ${sql.raw(c)}.oracle_id = ${sql.raw(p)}.commander_oracle_id
  left join ${printings} ${sql.raw(cp)} on ${sql.raw(cp)}.scryfall_id = ${sql.raw(p)}.commander_printing_id and ${sql.raw(cp)}.oracle_id = ${sql.raw(p)}.commander_oracle_id`;

const friendColumns = (p: string, c: string, cp: string) => sql.raw(`${p}.user_id as friend_user_id, ${p}.public_id::text as public_id,
  ${p}.display_name, ${c}.oracle_id as commander_oracle_id, ${c}.name as commander_name,
  coalesce(${cp}.art_crop_uri, ${c}.art_crop_uri) as commander_art`);

/** Not yet cleared (✕) by the viewer. */
const notCleared = (t: string, viewerId: string) =>
  sql`(case when ${sql.raw(t)}.proposer_user_id = ${viewerId} then ${sql.raw(t)}.proposer_cleared_at else ${sql.raw(t)}.recipient_cleared_at end) is null`;

type TradeRowCols = {
  id: string; status: TradeStatus; round: number; proposer_user_id: string; recipient_user_id: string; created_at: string | Date;
  ended_by_user_id: string | null; proposer_marked_at: string | Date | null; recipient_marked_at: string | Date | null;
};
type FriendCols = {
  friend_user_id: string; public_id: string; display_name: string;
  commander_oracle_id: string | null; commander_name: string | null; commander_art: string | null;
};

const toDate = (v: string | Date | null | undefined): Date | null => (v == null ? null : new Date(v));

function factsOf(r: TradeRowCols): TradeFacts {
  return {
    status: r.status, proposerUserId: r.proposer_user_id, recipientUserId: r.recipient_user_id, round: Number(r.round),
    createdAt: new Date(r.created_at), endedByUserId: r.ended_by_user_id,
    proposerMarkedAt: toDate(r.proposer_marked_at), recipientMarkedAt: toDate(r.recipient_marked_at),
  };
}

const sideOf = (r: TradeRowCols, viewerId: string): TradeRole => (r.proposer_user_id === viewerId ? "proposer" : "recipient");
const otherSideOf = (r: FriendCols): OtherSide => ({ publicId: r.public_id, displayName: named(r.display_name), commander: faceOf(r) });

/**
 * The sheet's trade: the row, the current round's `offered_at` as an ISO string at millisecond precision (truncated, as
 * the writes' `roundSeen` compares it), the friend, and the viewer's own public id (for reading the viewer's spares as
 * the friend sees them).
 */
export function tradeViewQuery(viewerId: string, tradeId: string): SQL {
  return sql`select ${tradeColumns("vtr")}, vtr.from_request_id,
      to_char(date_trunc('milliseconds', vrd.offered_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as offered_at,
      ${friendColumns("vfp", "vfc", "vfcp")}, vvp.public_id::text as own_public_id, vpr.offered_at as previous_at
    from ${trades} vtr
    join ${tradeRounds} vrd on vrd.trade_id = vtr.id and vrd.round = vtr.round
    left join ${tradeRounds} vpr on vpr.trade_id = vtr.id and vpr.round = vtr.round - 1
    ${friendJoin("vtr", "vfl", "vfp", "vfc", "vfcp", viewerId)}
    join ${socialProfiles} vvp on vvp.user_id = ${viewerId}
    where vtr.id = ${tradeId} and ${isParty("vtr", viewerId)}`;
}

/** The current and previous round's cards with name and art, read again through the party and the live friendship. */
export function tradeViewCardsQuery(viewerId: string, tradeId: string): SQL {
  return sql`select ctc.round, ctc.side, ctc.oracle_id, cc.name, cc.image_uri
    from ${tradeCards} ctc
    join ${trades} ctr on ctr.id = ctc.trade_id
    join ${cards} cc on cc.oracle_id = ctc.oracle_id
    where ctc.trade_id = ${tradeId} and ctc.round in (ctr.round, ctr.round - 1) and ${isParty("ctr", viewerId)}
      and exists (select 1 from ${friendLinks} cfl where cfl.user_id = ${viewerId} and cfl.friend_user_id = ${otherParty("ctr", viewerId)})
    order by cc.name, ctc.oracle_id`;
}

/** Trade prices drawn from a price read already made: each id's figure at the reader's store, and the read's date. */
export function tradePricesOf(read: PriceRead, ids: readonly string[], store: Store, now = new Date()): TradePrices {
  const cents = Object.fromEntries(ids.map((id) => {
    const fact = read.prices.get(id);
    return [id, fact ? priceOf(fact, priceState(fact, read.newestAsOf)) : null];
  }));
  return { store, cents, dated: read.newestAsOf ? provenanceForm(read.newestAsOf, now) : null };
}

/** Prices at the reader's store, for the sheet's box or a draft's picker; a failed read draws bare totals, never an error. */
export async function tradePrices(ids: readonly string[], store: Store, now = new Date()): Promise<TradePrices> {
  const bare: TradePrices = { store, cents: {}, dated: null };
  if (ids.length === 0) return bare;
  try {
    return tradePricesOf(await loadPrices([...ids], [], [], store), ids, store, now);
  } catch (error) {
    console.warn("[trade-reads] prices unreadable; the sheet draws bare totals", error instanceof Error ? error.message : "");
    return bare;
  }
}

const ACTIONS: readonly TradeAction[] = ["counter", "revise", "accept", "decline", "withdraw", "rescind", "mark", "clear"];

/**
 * The trade sheet's whole view, or null when the viewer is not a party or the other party is no longer a friend.
 * `withFriend` (a public id) also makes it null for a trade with anyone else, before the cards and prices are read.
 */
export async function loadTrade(
  viewerId: string, tradeId: unknown, store: Store, now = new Date(), withFriend?: string,
): Promise<TradeView | null> {
  if (!isUuid(tradeId)) return null;
  const [head] = (await db.execute<TradeRowCols & FriendCols & { offered_at: string; own_public_id: string; from_request_id: string | null; previous_at: string | Date | null }>(
    tradeViewQuery(viewerId, tradeId),
  )).rows;
  if (!head || (withFriend !== undefined && head.public_id !== withFriend)) return null;
  const facts = factsOf(head);
  const role = sideOf(head, viewerId);
  const rows = (await db.execute<{ round: number; side: TradeRole; oracle_id: string; name: string; image_uri: string | null }>(
    tradeViewCardsQuery(viewerId, tradeId),
  )).rows;
  const card = (r: (typeof rows)[number]): TradeCard => ({ oracleId: r.oracle_id, name: r.name, imageUri: r.image_uri });
  const inRound = (round: number) => rows.filter((r) => Number(r.round) === round);
  const split = (round: number) => {
    const rs = inRound(round);
    return { yours: rs.filter((r) => r.side === role).map(card), theirs: rs.filter((r) => r.side !== role).map(card) };
  };
  const current = split(facts.round);
  const previous = facts.round > 1 ? split(facts.round - 1) : null;
  const status = tradeStatus(facts, now);
  const viewer: Party = { userId: viewerId, publicId: head.own_public_id };
  const friend: Party = { userId: head.friend_user_id, publicId: head.public_id };
  const ids = [...new Set(rows.map((r) => r.oracle_id))];
  const [goneSet, prices] = await Promise.all([
    status === "open"
      ? goneCards(viewer, friend, sidesOf(role, inRound(facts.round).map((r): StoredCard => ({ side: r.side, oracleId: r.oracle_id }))))
      : Promise.resolve(new Set<string>()),
    tradePrices(ids, store, now),
  ]);
  const gone = goneSet.size > 0;
  return {
    id: head.id,
    friend: otherSideOf(head),
    state: sheetState(facts, viewerId, now, gone),
    status,
    round: facts.round,
    offeredAt: head.offered_at,
    previousAt: toDate(head.previous_at),
    tradedAt: status === "traded" && facts.proposerMarkedAt && facts.recipientMarkedAt
      ? new Date(Math.max(facts.proposerMarkedAt.getTime(), facts.recipientMarkedAt.getTime()))
      : null,
    createdAt: facts.createdAt,
    daysLeft: tradeDaysLeft(facts.createdAt, now),
    cards: { theirs: current.theirs, yours: current.yours, previous },
    gone: [...goneSet],
    fromRequestId: head.from_request_id,
    can: Object.fromEntries(ACTIONS.map((a) => [a, canAct(facts, viewerId, a, now, gone)])) as Record<TradeAction, boolean>,
    prices,
  };
}

/** The most rows one list reads: ended rows stay until ✕, so the list is capped rather than unbounded. */
export const TRADE_ROWS_READ = 200;

/**
 * The viewer's trades not yet cleared, each with the current round's cards by name and the friend's face; with a
 * friend's public id, only the trades with that friend. Live trades (open and unexpired, or accepted) come first, then
 * newest move first, so the cap only ever drops ended rows ahead of a trade still waiting on someone.
 */
export function tradeRowsQuery(viewerId: string, friendPublicId: string | null, now: Date): SQL {
  return sql`select ${tradeColumns("ltr")},
      greatest(ltr.created_at, lrd.offered_at, ltr.answered_at, ltr.ended_at, ltr.proposer_marked_at, ltr.recipient_marked_at) as at,
      coalesce((select json_agg(json_build_object('side', ltc.side, 'oracle_id', ltc.oracle_id, 'name', lc.name, 'image_uri', lc.image_uri) order by lc.name, ltc.oracle_id)
        from ${tradeCards} ltc join ${cards} lc on lc.oracle_id = ltc.oracle_id
        where ltc.trade_id = ltr.id and ltc.round = ltr.round), '[]'::json) as cards,
      ${friendColumns("lfp", "lfc", "lfcp")}
    from ${trades} ltr
    join ${tradeRounds} lrd on lrd.trade_id = ltr.id and lrd.round = ltr.round
    ${friendJoin("ltr", "lfl", "lfp", "lfc", "lfcp", viewerId)}
    where ${isParty("ltr", viewerId)} and ${notCleared("ltr", viewerId)}
      ${friendPublicId === null ? sql`` : sql`and lfp.public_id = ${friendPublicId}::uuid`}
    order by (ltr.status = 'accepted' or (ltr.status = 'open' and ltr.created_at > ${tradeOpenFloor(now).toISOString()}::timestamptz)) desc,
      at desc, ltr.id
    limit ${TRADE_ROWS_READ}`;
}

type ListCols = TradeRowCols & FriendCols & { at: string | Date; cards: ListCard[] | string };
type ListCard = { side: TradeRole; oracle_id: string; name: string; image_uri: string | null };

/** The rows, sorted (`compareRows`), with Needs a look read for every open trade. */
async function listRows(viewerId: string, friendPublicId: string | null, now: Date): Promise<{ row: TradeListRow; facts: TradeFacts }[]> {
  const rows = (await db.execute<ListCols>(tradeRowsQuery(viewerId, friendPublicId, now))).rows;
  if (rows.length === 0) return [];
  const parsed = rows.map((r) => ({ r, facts: factsOf(r), cards: (typeof r.cards === "string" ? JSON.parse(r.cards) : r.cards) as ListCard[] }));
  const open = parsed.filter((p) => tradeStatus(p.facts, now) === "open");
  const goneByTrade = new Map<string, Set<string>>();
  if (open.length > 0) {
    const [own] = (await db.execute<{ public_id: string }>(ownPublicIdQuery(viewerId))).rows;
    const viewer: Party = { userId: viewerId, publicId: own?.public_id ?? "" };
    // `goneCards` per trade reads both receivers' spares, so N open trades cost 2N spares reads, nothing shared. Few
    // trades are open at once (the cap holds one unanswered offer per friend), so per trade is fine.
    await Promise.all(open.map(async (p) => {
      const stored = p.cards.map((c): StoredCard => ({ side: c.side, oracleId: c.oracle_id }));
      const friend: Party = { userId: p.r.friend_user_id, publicId: p.r.public_id };
      goneByTrade.set(p.r.id, await goneCards(viewer, friend, sidesOf(sideOf(p.r, viewerId), stored)));
    }));
  }
  const out = parsed.map(({ r, facts, cards: cs }) => {
    const role = sideOf(r, viewerId);
    const gone = goneByTrade.get(r.id) ?? new Set<string>();
    const goneCard = cs.find((c) => gone.has(c.oracle_id));
    const row: TradeListRow = {
      id: r.id,
      friend: otherSideOf(r),
      row: rowState(facts, viewerId, now, gone.size > 0),
      status: tradeStatus(facts, now),
      theirs: cs.filter((c) => c.side !== role).map((c) => c.name),
      yours: cs.filter((c) => c.side === role).map((c) => c.name),
      theirImage: cs.find((c) => c.side !== role)?.image_uri ?? null,
      yourImage: cs.find((c) => c.side === role)?.image_uri ?? null,
      goneName: goneCard?.name ?? null,
      daysLeft: tradeDaysLeft(facts.createdAt, now),
      createdAt: facts.createdAt,
      at: new Date(r.at),
    };
    return { row, facts };
  });
  return out.sort((x, y) => compareRows(x.row, y.row));
}

/** The Trades with X box on a friend's Spares tab: its rows, the cap (Q10), and whether a trade waits on the reader. */
export async function loadTradesWith(
  viewerId: string, friendPublicId: unknown, now = new Date(),
): Promise<{ rows: TradeListRow[]; held: boolean; waiting: boolean }> {
  if (!isUuid(friendPublicId)) return { rows: [], held: false, waiting: false };
  const listed = await listRows(viewerId, friendPublicId, now);
  const rows = listed.map((l) => l.row);
  // The cap reads the trades' own facts, as the propose statement does: an unanswered offer of the reader's.
  return { rows, held: offerHeld(listed.map((l) => l.facts), viewerId, now), waiting: rows.some((r) => r.row.waitsOnYou) };
}

/** Friends › Trades and Request history: the first `limit` rows, and what the rest hold (`row.moreWaiting`, `row.more`). */
export async function loadTradeRows(
  viewerId: string, opts: { limit?: number } = {}, now = new Date(),
): Promise<{ rows: TradeListRow[]; rest: number; restWaiting: number }> {
  const all = (await listRows(viewerId, null, now)).map((l) => l.row);
  const limit = opts.limit ?? all.length;
  const rest = all.slice(limit);
  return { rows: all.slice(0, limit), rest: rest.length, restWaiting: rest.filter((r) => r.row.waitsOnYou).length };
}

/** One live offer a card of the reader's sits in (Q9): the friend, the trade, its days left. */
export type OfferedTo = { tradeId: string; friend: OtherSide; daysLeft: number };

/** The reader's own cards on the current round of an open, unexpired trade, with the friend. */
export function offeredToQuery(viewerId: string, oracleIds: readonly string[], now: Date): SQL {
  return sql`select otc.oracle_id, otr.id as trade_id, otr.created_at, ${friendColumns("ofp", "ofc", "ofcp")}
    from ${tradeCards} otc
    join ${trades} otr on otr.id = otc.trade_id and otc.round = otr.round
    ${friendJoin("otr", "ofl", "ofp", "ofc", "ofcp", viewerId)}
    where ${isParty("otr", viewerId)} and otr.status = 'open' and otr.created_at > ${tradeOpenFloor(now).toISOString()}::timestamptz
      and otc.side = (case when otr.proposer_user_id = ${viewerId} then 'proposer' else 'recipient' end)
      and otc.oracle_id in (${sql.join(oracleIds.map((id) => sql`${id}::uuid`), sql`, `)})
    order by otc.oracle_id, otr.created_at`;
}

/**
 * Q9 (READINESS 🟡): a spare may sit in two live offers, and the picker says so. Per card of `oracleIds`, the open
 * trades it is already on the reader's side of. The read leaves none out: each entry carries its `tradeId`, and the
 * picker drops the trade it is drawing.
 */
export async function loadOfferedTo(viewerId: string, oracleIds: readonly unknown[], now = new Date()): Promise<Record<string, OfferedTo[]>> {
  const ids = [...new Set(oracleIds.filter(isUuid))].slice(0, MAX_SPARES_BATCH);
  if (ids.length === 0) return {};
  const rows = (await db.execute<FriendCols & { oracle_id: string; trade_id: string; created_at: string | Date }>(offeredToQuery(viewerId, ids, now))).rows;
  const out: Record<string, OfferedTo[]> = {};
  for (const r of rows) {
    (out[r.oracle_id] ??= []).push({ tradeId: r.trade_id, friend: otherSideOf(r), daysLeft: tradeDaysLeft(new Date(r.created_at), now) });
  }
  return out;
}

/** Per friend, the facts that decide whether a trade with them waits on the reader. */
export function tradesWaitingQuery(viewerId: string): SQL {
  return sql`select ${tradeColumns("wtr")}, wfp.public_id::text as public_id
    from ${trades} wtr
    join ${friendLinks} wfl on wfl.user_id = ${viewerId} and wfl.friend_user_id = ${otherParty("wtr", viewerId)}
    join ${socialProfiles} wfp on wfp.user_id = wfl.friend_user_id
    where ${isParty("wtr", viewerId)} and wtr.status in ('open', 'accepted')`;
}

/** The friends (by public id) a trade waits on the reader with: the strip's Spares dot (PR 6). Gone is not read. */
export async function tradesWaitingWith(viewerId: string, now = new Date()): Promise<Set<string>> {
  const rows = (await db.execute<TradeRowCols & { public_id: string }>(tradesWaitingQuery(viewerId))).rows;
  return new Set(rows.filter((r) => rowState(factsOf(r), viewerId, now, false).waitsOnYou).map((r) => r.public_id));
}

/** The friends one spares sheet asks about at most: a card's friends with a spare, never every friend. */
export const TRADE_PRESS_FRIENDS = 8;

/** What the spares sheet's Trade press draws for one friend (Ask D1): the cap (Q10), the Wants line, `N trades open`. */
export type TradePressFacts = { held: boolean; wants: readonly string[]; open: number };

/** The live trades (open or accepted) with each of `friendPublicIds`, by the friend's public id. */
export function tradePressQuery(viewerId: string, friendPublicIds: readonly string[]): SQL {
  return sql`select ${tradeColumns("ptr")}, pfp.public_id::text as public_id
    from ${trades} ptr
    join ${friendLinks} pfl on pfl.user_id = ${viewerId} and pfl.friend_user_id = ${otherParty("ptr", viewerId)}
    join ${socialProfiles} pfp on pfp.user_id = pfl.friend_user_id
    where ${isParty("ptr", viewerId)} and ptr.status in ('open', 'accepted')
      and pfp.public_id in (${sql.join(friendPublicIds.map((id) => sql`${id}::uuid`), sql`, `)})`;
}

/**
 * The spares sheet over a deck or All shopping (Ask D1): per friend on the opened card, whether an offer of the
 * reader's holds the cap, the reader's spares on that friend's wishlist by name, and the live trades with them. Only
 * current friends come back (`loadOwnSparesFor` and the trades read each join the friendship); anyone else is left out,
 * and the row draws no Trade.
 */
export async function loadTradePresses(viewerId: string, friendPublicIds: readonly unknown[], now = new Date()): Promise<Record<string, TradePressFacts>> {
  const ids = [...new Set(friendPublicIds.filter(isUuid))].slice(0, TRADE_PRESS_FRIENDS);
  if (ids.length === 0) return {};
  const [rows, own, friendIds] = await Promise.all([
    db.execute<TradeRowCols & { public_id: string }>(tradePressQuery(viewerId, ids)).then((r) => r.rows),
    db.execute<{ public_id: string }>(ownPublicIdQuery(viewerId)).then((r) => r.rows[0]?.public_id ?? null),
    Promise.all(ids.map((id) => resolveFriend(viewerId, id))),
  ]);
  if (own === null) return {};
  const lists = await Promise.all(friendIds.map((f) => (f === null ? null : loadFriendSpareList(f, own, true))));
  const out: Record<string, TradePressFacts> = {};
  ids.forEach((id, i) => {
    if (friendIds[i] === null) return;
    const facts = rows.filter((r) => r.public_id === id).map(factsOf);
    out[id] = {
      held: offerHeld(facts, viewerId, now),
      wants: (lists[i]?.lines ?? []).filter((l) => l.onWishlist).map((l) => l.name),
      open: facts.filter((f) => { const s = tradeStatus(f, now); return s === "open" || s === "accepted"; }).length,
    };
  });
  return out;
}

/**
 * The picker's Your spares: the reader's own spares as this friend sees them, the list `goneCards` checks an offer's
 * cards against, so a card the picker draws is one the offer can carry. `onWishlist` is the FRIEND's wishlist here (the
 * Wants chip), listed first. Empty when the friend is not a friend, or the reader shares no spares with them.
 */
export async function loadOwnSparesFor(viewerId: string, friendPublicId: unknown): Promise<FriendSpareLine[]> {
  const friendId = await resolveFriend(viewerId, friendPublicId);
  if (friendId === null) return [];
  const [own] = (await db.execute<{ public_id: string }>(ownPublicIdQuery(viewerId))).rows;
  if (!own) return [];
  return (await loadFriendSpareList(friendId, own.public_id, true))?.lines ?? [];
}

/** What the trade sheet needs for one friend away from their Spares tab: the reads that tab makes for it. */
export type TradeSheetData = {
  friend: OtherSide;
  held: boolean;
  theirSpares: FriendSpareLine[];
  yours: FriendSpareLine[];
  offered: Record<string, OfferedTo[]>;
  prices: TradePrices;
};

/**
 * The trade sheet over Friends or Home (Make it a trade A3, a Trades row): the friend, both sides' spares, the cap (Q10),
 * the reader's spares already offered (Q9) and every spare's price at the reader's store. Null for anyone not a friend.
 */
export async function loadTradeSheet(viewerId: string, friendPublicId: unknown, store: Store, now = new Date()): Promise<TradeSheetData | null> {
  if (!isUuid(friendPublicId)) return null;
  // Any signed-in caller can name any public id: the friendship is read first, and nothing else is read without it.
  // Each read below also joins the grant on the viewer itself; this keeps a stranger's id from costing more than one read.
  const friend = await loadFriend(viewerId, friendPublicId);
  if (!friend) return null;
  const [theirs, yours, withThem] = await Promise.all([
    loadFriendSpareList(viewerId, friendPublicId, true),
    loadOwnSparesFor(viewerId, friendPublicId),
    loadTradesWith(viewerId, friendPublicId, now),
  ]);
  const theirSpares = theirs?.lines ?? [];
  const ownIds = yours.map((l) => l.oracleId);
  const [offered, prices] = await Promise.all([
    loadOfferedTo(viewerId, ownIds, now),
    tradePrices([...new Set([...theirSpares.map((l) => l.oracleId), ...ownIds])], store, now),
  ]);
  return {
    friend: { publicId: friend.publicId, displayName: friend.displayName, commander: friend.commander },
    held: withThem.held, theirSpares, yours, offered, prices,
  };
}
