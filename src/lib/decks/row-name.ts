import { frontFaceName } from "../cards/faces";

/**
 * The name a deck list PRINTS for a card: the player's printing's name where it has one, else the oracle name, cut to the
 * front face of a two-faced card, which the list draws beside the `//` mark (d9, 2026-10-16). One resolver for the row, the
 * tile, the receipt and the held slot that stand in a row's place, and the sort the list is ordered by, so none of them can
 * name a card differently from another or from the order. The whole name stays the press's accessible name.
 */
export function deckRowName(card: { name: string; printedName?: string | null; layout?: string | null }): string {
  return frontFaceName(card.printedName ?? card.name, card.layout);
}
