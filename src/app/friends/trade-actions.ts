"use server";

// Friend trades' presses (plan `2026-11-27-friend-trades.md`, "Reads and actions (PR 4)"). Every action takes the reader
// from the session; every id is checked with `isUuid`, and the sides with `cleanSides`, before anything is read, and
// the library checks them again with the trade, the round the reader saw and its `offered_at` (`seenAt`, from
// `loadTrade`'s `offeredAt`), so nothing the client sends is trusted. Propose and counter each write the friend a feed
// item and a push, so they take the `trade-offer` rate bucket. Each returns a small serializable outcome; a refusal
// never reads as done.
//
// Revalidation: every press is on `/friends` (the friend's Spares tab, Friends › Trades) or the sheet over a deck,
// which redraws from the reply, so a landed press revalidates `/friends` alone, after the response. Never Home or
// `/decks`. Nothing here names a social table: the writes live in `lib/social/trades.ts`, the reads in
// `lib/social/trade-reads.ts`.

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";
import { enforceHit } from "../../lib/rate/observe";
import { isUuid } from "../../lib/social/rules";
import { loadTrade, loadTradePresses, loadTradeSheet, type TradePressFacts, type TradeSheetData, type TradeView } from "../../lib/social/trade-reads";
import { cleanSides, isRound, isSeenAt } from "../../lib/social/trade-rules";
import {
  answerTrade, clearTrade, counterTrade, markTraded, proposeTrade, rescindTrade, reviseTrade, withdrawTrade,
  type CounterOutcome, type ProposeOutcome, type TradeOutcome,
} from "../../lib/social/trades";
import { readerStoreForPage } from "../../lib/stores/preference";

type Limited = { ok: false; reason: "limited" };

const revalidateIfLanded = <T extends { ok: boolean }>(out: T): T => {
  if (out.ok) after(() => revalidatePath("/friends"));
  return out;
};

const GONE = { ok: false, reason: "gone" } as const;

/** Propose a trade to a friend, from the Spares tab, a deck's spares sheet, or Make it a trade on a Yes. */
export async function proposeTradeAction(
  friendPublicId: unknown, sides: unknown, fromRequestId: unknown = null,
): Promise<ProposeOutcome | Limited> {
  const userId = await requireUserId();
  if (!isUuid(friendPublicId)) return { ok: false, reason: "not-friend" };
  if (!cleanSides(sides) || (fromRequestId != null && !isUuid(fromRequestId))) return GONE;
  if ((await enforceHit(userId, "trade-offer")) !== null) return { ok: false, reason: "limited" };
  return revalidateIfLanded(await proposeTrade(userId, friendPublicId, sides, fromRequestId));
}

/** Counter the offer the reader saw: round `seenRound`, offered at `seenAt`. */
export async function counterTradeAction(
  tradeId: unknown, seenRound: unknown, seenAt: unknown, sides: unknown,
): Promise<CounterOutcome | Limited> {
  const userId = await requireUserId();
  // Every shape the library would refuse is refused here, before the press spends a hit from the bucket.
  if (!isUuid(tradeId) || !isRound(seenRound) || !isSeenAt(seenAt) || !cleanSides(sides)) return GONE;
  if ((await enforceHit(userId, "trade-offer")) !== null) return { ok: false, reason: "limited" };
  return revalidateIfLanded(await counterTrade(userId, tradeId, seenRound, seenAt, sides));
}

/** Change the reader's own offer, as seen at round `seenRound` and `seenAt`, while a card on it needs a look. Tells nobody, so it takes no rate bucket. */
export async function reviseTradeAction(tradeId: unknown, seenRound: unknown, seenAt: unknown, sides: unknown): Promise<TradeOutcome> {
  const userId = await requireUserId();
  if (!isUuid(tradeId) || !cleanSides(sides)) return GONE;
  return revalidateIfLanded(await reviseTrade(userId, tradeId, seenRound, seenAt, sides));
}

/** Yes or No on the offer the reader saw. */
export async function answerTradeAction(tradeId: unknown, seenRound: unknown, seenAt: unknown, answer: unknown): Promise<TradeOutcome> {
  const userId = await requireUserId();
  if (!isUuid(tradeId)) return GONE;
  return revalidateIfLanded(await answerTrade(userId, tradeId, seenRound, seenAt, answer));
}

export async function withdrawTradeAction(tradeId: unknown, seenRound: unknown): Promise<TradeOutcome> {
  const userId = await requireUserId();
  if (!isUuid(tradeId)) return GONE;
  return revalidateIfLanded(await withdrawTrade(userId, tradeId, seenRound));
}

export async function rescindTradeAction(tradeId: unknown): Promise<TradeOutcome> {
  const userId = await requireUserId();
  if (!isUuid(tradeId)) return GONE;
  return revalidateIfLanded(await rescindTrade(userId, tradeId));
}

export async function markTradedAction(tradeId: unknown): Promise<TradeOutcome> {
  const userId = await requireUserId();
  if (!isUuid(tradeId)) return GONE;
  return revalidateIfLanded(await markTraded(userId, tradeId));
}

/** ✕ on an ended trade: it leaves the reader's lists. */
export async function clearTradeAction(tradeId: unknown): Promise<TradeOutcome> {
  const userId = await requireUserId();
  if (!isUuid(tradeId)) return GONE;
  return revalidateIfLanded(await clearTrade(userId, tradeId));
}

/** Open a trade's sheet in place (a row, the feed, a push): its whole view, priced at the reader's store. */
export async function openTradeAction(tradeId: unknown): Promise<TradeView | null> {
  const userId = await requireUserId();
  if (!isUuid(tradeId)) return null;
  const store = await requestFlags(userId).then((env) => readerStoreForPage(userId, env));
  return loadTrade(userId, tradeId, store);
}

/**
 * The spares sheet's Trade presses over a deck or All shopping (Ask D1): one entry per current friend among
 * `friendPublicIds` (an array of public ids, capped in the read); anything else is ignored.
 */
export async function tradePressesAction(friendPublicIds: unknown): Promise<Record<string, TradePressFacts>> {
  const userId = await requireUserId();
  if (!Array.isArray(friendPublicIds)) return {};
  return loadTradePresses(userId, friendPublicIds);
}

/** The trade sheet away from the friend's Spares tab (Friends, Home): Make it a trade, a Trades row. Null for a non-friend. */
export async function openTradeSheetAction(friendPublicId: unknown): Promise<TradeSheetData | null> {
  const userId = await requireUserId();
  if (!isUuid(friendPublicId)) return null;
  const store = await requestFlags(userId).then((env) => readerStoreForPage(userId, env));
  return loadTradeSheet(userId, friendPublicId, store);
}
