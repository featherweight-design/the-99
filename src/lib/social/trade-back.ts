/**
 * The friend head's way back after Open the trade (FromDeck D4): `‹ All shopping`, or `‹ <deck name>` for a deck of
 * the reader's own. A deck that is not the reader's (someone else's, deleted, malformed) draws the plain `‹ Friends`.
 */
import { requireDeck } from "../decks/read";
import { tradeCopy } from "../copy/trades";
import { parseTradeFrom, tradeFromHref } from "./trade-from";

/** `requireDeck`'s error for a deck that is missing or not the reader's. */
const DECK_NOT_FOUND = "deck not found";

export type FriendBack = { href: string; label: string };

export async function resolveTradeBack(userId: string, raw: unknown): Promise<FriendBack | null> {
  const from = parseTradeFrom(raw);
  if (from === null) return null;
  if (from.kind === "shopping") return { href: tradeFromHref(from), label: tradeCopy.from.shopping };
  // Not the reader's deck reads as no origin; any other failure is the caller's to report.
  const deck = await requireDeck(from.deckId, userId).catch((e: unknown) => {
    if (e instanceof Error && e.message === DECK_NOT_FOUND) return null;
    throw e;
  });
  return deck ? { href: tradeFromHref(from), label: deck.name } : null;
}
