import type { DeckDetailCard } from "./grouping";

/**
 * Which mark a decklist row draws, if any. **One slot, one answer.**
 *
 * The exclusivity is expressed as a return type rather than as two sibling
 * conditionals, which is the whole point: two booleans that happen to disagree
 * today permit a co-occurrence nobody has drawn — a row carrying both `P` and
 * `$`, saying at once that the player is printing this card and that they must
 * buy it.
 *
 * Proxy wins because it is the deck's own statement about the slot, and because
 * a proxied card is never a purchase: `isShoppingCard` tests it first and the
 * `list_claims` anti-join keeps it out of the buy rows, so a row that drew `buy`
 * here would contradict both.
 */
export function deckRowTag(card: DeckDetailCard): "proxy" | "buy" | null {
  if (card.proxied) return "proxy";
  if (!card.owned) return "buy";
  return null;
}
