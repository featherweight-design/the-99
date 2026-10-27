// What a page needs to open a trade match's spares sheet in place (Hugh's ruling 2026-10-27, the menu-home plan's
// product call 8): the trade-match cards it draws with an Ask, and their prices for the sheet's buy tag. Only with spare
// requests on, since an in-place sheet is the Ask's; off, the presses keep their links and nothing is read.
import { loadPrices } from "../decks/price-query";
import type { PriceFact } from "../decks/price";

/** A trade-match card the page can open in place: what the sheet's head draws. */
export type TradeAskCard = { oracleId: string; name: string; imageUri: string | null };

export type TradeAskPayload = {
  cards: TradeAskCard[];
  prices: Record<string, PriceFact | null>;
  newestAsOf: Date | null;
};

/** One card per oracle id, first drawn first. Pure, for the tests. */
export function distinctCards(cards: readonly TradeAskCard[]): TradeAskCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => (seen.has(c.oracleId) ? false : (seen.add(c.oracleId), true)));
}

/**
 * The payload, or null when there is no card to open. A price read that fails draws the bare tag rather than failing
 * the page: the price is the sheet's extra, and the Ask works without it.
 */
export async function loadTradeAsk(cards: readonly TradeAskCard[]): Promise<TradeAskPayload | null> {
  const distinct = distinctCards(cards);
  if (distinct.length === 0) return null;
  try {
    const read = await loadPrices(distinct.map((c) => c.oracleId));
    return { cards: distinct, prices: Object.fromEntries(distinct.map((c) => [c.oracleId, read.prices.get(c.oracleId) ?? null])), newestAsOf: read.newestAsOf };
  } catch (error) {
    console.warn("[trade-ask] prices unreadable; the sheet draws the bare tag", error instanceof Error ? error.message : "");
    return { cards: distinct, prices: {}, newestAsOf: null };
  }
}
