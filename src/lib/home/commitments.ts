// Home's Commitments card — plan ruling 11.
//
// Both figures come from one whole-user loadAvailability, with no
// `excludeDeckId`: this is the collection's vantage, not a deck's. Nothing here
// runs a query of its own, so the numbers cannot drift from the ones the
// collection page and card detail already print.

import { availabilityState, type Availability } from "../decks/availability";

export type Commitments = {
  /**
   * Copies claimed by finished decks. A COPY count — its denominator is the
   * collection's total copies (`312 of 1,284`).
   */
  inUse: number;
  /**
   * Cards whose finished decks want more copies than exist. A CARD count — the
   * copy reads `3 cards`, and one card short by five copies is still one.
   */
  overCommitted: number;
};

export function commitmentFigures(availability: Iterable<Availability>): Commitments {
  let inUse = 0;
  let overCommitted = 0;
  for (const a of availability) {
    inUse += a.hard;
    if (availabilityState(a) === "over") overCommitted += 1;
  }
  return { inUse, overCommitted };
}
