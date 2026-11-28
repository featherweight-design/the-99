/**
 * The friend head's way back after Open the trade (FromDeck D4): `‹ All shopping`, or `‹ <deck name>` for a deck of
 * the reader's own. A deck that is not the reader's (someone else's, deleted, malformed) draws the plain `‹ Friends`.
 */
import { requireDeck } from "../decks/read";
import { tradeCopy } from "../copy/trades";
import { parseTradeFrom, tradeFromHref } from "./trade-from";

export type FriendBack = { href: string; label: string };

export async function resolveTradeBack(userId: string, raw: unknown): Promise<FriendBack | null> {
  const from = parseTradeFrom(raw);
  if (from === null) return null;
  if (from.kind === "shopping") return { href: tradeFromHref(from), label: tradeCopy.from.shopping };
  const deck = await requireDeck(from.deckId, userId).catch(() => null);
  return deck ? { href: tradeFromHref(from), label: deck.name } : null;
}
