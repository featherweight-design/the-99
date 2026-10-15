import type { ProfileSkeleton } from "../profile/types";

// A Commander deck is 100 cards including its commanders, so the body is
// 100 minus however many commanders the deck has. 99 is not a rule of the
// format; 100 is.

export const DECK_TOTAL = 100;

/** The asserted land count, for a deck with no measured composition. `FLAT_TARGETS` in
 *  `mix.ts` reads it too, and so does About's Roles row, so the three can never disagree. Kept
 *  here rather than there because `mix.ts` already imports this module. */
export const FLAT_LAND = 37;

/** The fallback for a pair is one fewer, for the reason `landTarget` gives. */
const fallbackLand = (hasPartner: boolean) => FLAT_LAND - (hasPartner ? 1 : 0);

export function deckBodySize(hasPartner: boolean): number {
  return DECK_TOTAL - (hasPartner ? 2 : 1);
}

/**
 * How many lands the deck is built toward.
 *
 * MEASURED when the skeleton carries a composition, and `FLAT_LAND` (one fewer for a pair) only as
 * the fallback. Those two
 * were the asserted baseline, and the measured figure is an average over thousands of real
 * decklists for this commander's own condition — the same replacement this sub-project makes
 * for the four functional roles.
 *
 * The pair's missing slot comes out of the elastic lands and never out of a role target: a
 * deck does not need less removal because it has two commanders, and it does need one fewer
 * land because it draws one fewer. So the pair adjustment applies to the measured figure too,
 * EXCEPT where the composition came from the `pair` rung — those averages already describe
 * two-commander decks, and subtracting again would take the slot twice.
 *
 * ROUNDED, and that is load-bearing rather than tidy. `identity_composition.avg_land` is
 * `real` while `commander_support.avg_land` is `integer`, so an identity or count basis hands
 * back a fraction — and `splitByWeight` would then allocate fractional basic-land slots.
 *
 * CAPPED at what the body can hold beside the role floors. A measured average cannot exceed
 * the deck, but nothing stops a bucket's mean plus four role targets from doing so, and a land
 * target that ate the whole body would leave the fill unable to meet a single role.
 */
export function landTarget(hasPartner: boolean, skeleton?: ProfileSkeleton | null): number {
  const composition = skeleton?.composition;
  if (!composition) return fallbackLand(hasPartner);
  const measured = composition.targets.land;
  // A NON-FINITE measured figure falls back rather than propagating. It should be unreachable
  // — `compositionFrom` rejects a row with a null in it — but that guard tests for `null`
  // alone, and a row carrying `undefined` passes it. The cost of letting one through is not a
  // wrong number, it is NO CEILING AT ALL: every `counts.land >= landCeiling` comparison
  // against NaN is false, so the land sweeps run until the collection is exhausted and the
  // deck arrives with every basic the player owns.
  if (!Number.isFinite(measured)) return fallbackLand(hasPartner);
  const pairBasis = composition.of === "pair";
  const adjusted = Math.round(measured) - (hasPartner && !pairBasis ? 1 : 0);
  // EACH TARGET ROUNDED BEFORE SUMMING, which is what `roleFloors` in `fill.ts` does — rounding
  // the sum instead lets the two disagree about the same skeleton: four targets of 10.5 floor
  // to 44 there and to 42 here, and the cap then permits a land count that leaves the fill
  // unable to meet the floors it is about to build to.
  const roleValues = Object.values(skeleton!.roleTargets.targets);
  // And the same finite guard the land figure gets. Without it the cap is NaN and `Math.min`
  // propagates it — the function returns the very thing the comment above says it prevents.
  if (!roleValues.every((v) => typeof v === "number" && Number.isFinite(v))) {
    return fallbackLand(hasPartner);
  }
  const roleFloor = roleValues.reduce((a, b) => a + Math.round(b), 0);
  return Math.max(0, Math.min(adjusted, deckBodySize(hasPartner) - roleFloor));
}
