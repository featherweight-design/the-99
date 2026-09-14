// What the Shopping filter holds. One selector, three consumers: the rows the
// filter renders, the price strip's total and denominator, and both Mana Pool
// `add-deck` hrefs.
//
// It lives here rather than in decklist.tsx because the export dialog composed
// its own list from a plain `!c.owned` and the two diverged — that list carried
// unowned basics the filter refuses to show and dropped the spoken-for cards
// the filter puts front and centre, so the export link bought a basket the
// player never saw. One predicate is what makes the two doors one promise.

import type { DeckDetailCard } from "./grouping";
import { isBasicLand } from "./grouping";
import { availabilityState } from "./availability";

/**
 * A card you don't own, or one you own whose copies are already sleeved into
 * finished lists — `over` from this deck's own vantage (amendment 5, #281).
 * Both are one trip to a shop.
 *
 * The two halves cannot overlap: `availabilityState`'s first guard is
 * `owned <= 0 → free`, so an unowned card is never `over`.
 *
 * `selfExcluded` is mandatory and `free` is read, never recomputed. The map came
 * from a query given this deck's id, so on this list
 * `free = owned − ownClaim − seniorHard`; `owned − hard` is the off-decklist
 * formula and is silently wrong here (Addendum 2 §6 / R5 §6).
 *
 * Basics are never in Shopping — the fill never buys them, and asserting it here
 * means a future change to the fill fails this filter loudly.
 */
export function isShoppingCard(c: DeckDetailCard): boolean {
  if (isBasicLand(c.typeLine)) return false;
  if (!c.owned) return true;
  const a = c.availability;
  // A missing read degrades to the free rendering, as the builder always has:
  // the contested rows are simply absent and the list is today's list.
  return a ? availabilityState(a, { selfExcluded: true }) === "over" : false;
}

/** A card on the Shopping list that is there because it is spoken for. */
export function isSpokenFor(c: DeckDetailCard): boolean {
  return c.owned && isShoppingCard(c);
}
