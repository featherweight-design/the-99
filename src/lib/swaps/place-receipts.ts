/**
 * Where each receipt draws in a Shopping section (swap tools, PR 4b): the cut's slot. Under the name
 * sort that slot is knowable from the name alone, so the receipt is INSERTED where the list's own
 * comparator would have put its row; under a price or mana sort the cut's figure has gone with its
 * row, so it takes the section's last slot. The rows are never re-sorted: they keep the order the
 * list gave them, which a second comparator would contradict.
 */
import type { DeckSortKey } from "../copy/deck-sort";
import type { DeckDetailCard } from "../decks/grouping";
import type { SwapReceipt } from "./context";

export type Placed = { card: DeckDetailCard } | { receipt: SwapReceipt };

export function placeReceipts(
  cards: DeckDetailCard[],
  receipts: SwapReceipt[],
  sortKey: DeckSortKey,
  compare: (a: DeckDetailCard, b: DeckDetailCard) => number,
): Placed[] {
  const placed: Placed[] = cards.map((card) => ({ card }));
  for (const receipt of receipts) {
    const asCard = { name: receipt.cut, oracleId: receipt.cutOracleId } as DeckDetailCard;
    const at = sortKey === "name" ? placed.findIndex((p) => "card" in p && compare(asCard, p.card) < 0) : -1;
    placed.splice(at === -1 ? placed.length : at, 0, { receipt });
  }
  return placed;
}
