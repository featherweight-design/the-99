// The deck tile's in-use-elsewhere clause — `3 in use elsewhere`.
//
// Derived from ONE unscoped `loadAvailability` for the whole user, never a
// query per deck. `claims` already names every deck holding a claim on every
// card, so the whole grid's counts fall out of a single pass over that map; a
// list of twenty decks would otherwise be twenty `excludeDeckId` queries.
//
// The vocabulary is `receiptCountsByCommander`'s and deliberately so: a card is
// "in use" when a COMMITTED deck has sleeved it and the supply is spent. A card
// a draft merely lists is still in the box, and a card you own three
// of and lent out one of is not a conflict.

import { availabilityState, holdsCopy, type Availability } from "./availability";

/**
 * Per deck id, how many of its owned cards a *different* committed deck has
 * sleeved. A deck with no such card is absent from the map rather than present
 * at zero — the clause is not drawn at zero, so the two are the same fact.
 *
 * The vantage is the whole collection's, not the deck's own: `free === 0`
 * counts this deck's claim as well as everyone else's. That is the figure a
 * reader comparing two tiles wants, and it is the only one obtainable without
 * a per-deck query.
 */
export function inUseElsewhereByDeck(
  availability: Iterable<Availability>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of availability) {
    const state = availabilityState(a);
    if (state !== "hard" && state !== "over") continue;
    // "Some OTHER deck holds a mature claim" is the same question for every
    // claim on the card, so it is answered once rather than rescanned per
    // claim: with two or more mature claimants every claimant has one, and
    // with exactly one only that deck itself does not.
    let matureClaims = 0;
    let soleMatureId: string | null = null;
    for (const claim of a.claims) {
      if (!holdsCopy(claim)) continue;
      matureClaims += 1;
      soleMatureId = claim.id;
    }
    // A brew's claim is not "in use" unless the player gave it a copy, so a card
    // no deck holds is nobody's conflict.
    if (matureClaims === 0) continue;
    for (const claim of a.claims) {
      if (matureClaims === 1 && soleMatureId === claim.id) continue;
      out.set(claim.id, (out.get(claim.id) ?? 0) + 1);
    }
  }
  return out;
}
