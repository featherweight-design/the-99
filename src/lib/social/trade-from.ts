/**
 * Where a trade sheet opened from, carried to the friend's Spares tab by Open the trade (handoff
 * `design_handoff_the99_friend_trades`, FromDeck D4), so the friend head's way back names that place.
 *
 * The address's `from` is parsed against a closed set (`shopping`, `deck/<uuid>`) and anything else is ignored. Its text
 * never reaches an href: a parsed origin is written back out from its parts, and the server checks a deck is the reader's
 * own before drawing it (`resolveTradeBack`). Client-safe: no database import.
 */
import { isUuid } from "../uuid";

/**
 * The friends one press-facts read takes at most (`loadTradePresses`), which bounds the query a caller can ask for. A
 * sheet whose card more friends spare asks in batches of this size (`TradeFromList`).
 */
export const TRADE_PRESS_FRIENDS = 8;

export type TradeFrom = { kind: "shopping" } | { kind: "deck"; deckId: string };

/** The origin `raw` names, or null for anything outside the closed set. */
export function parseTradeFrom(raw: unknown): TradeFrom | null {
  if (raw === "shopping") return { kind: "shopping" };
  if (typeof raw !== "string" || !raw.startsWith("deck/")) return null;
  const id = raw.slice("deck/".length);
  return isUuid(id) ? { kind: "deck", deckId: id.toLowerCase() } : null;
}

/** The `from` value for an origin, rebuilt from its parts. */
export function tradeFromParam(from: TradeFrom): string {
  return from.kind === "shopping" ? "shopping" : `deck/${from.deckId}`;
}

/** The friend's Spares tab with `tradeId` open on landing, remembering where the sheet opened from. */
export function tradeHref(friendPublicId: string, tradeId: string, from: TradeFrom): string {
  const q = new URLSearchParams({ trade: tradeId, from: tradeFromParam(from) });
  return `/friends/${encodeURIComponent(friendPublicId)}/spares?${q.toString()}`;
}

/** Where the origin's back link goes: the deck page, or All shopping. */
export function tradeFromHref(from: TradeFrom): string {
  return from.kind === "shopping" ? "/decks/shopping" : `/decks/${from.deckId}`;
}
