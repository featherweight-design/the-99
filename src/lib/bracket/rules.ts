import { COMBO_DETECTION } from "../spellbook/combo-features";
import { EXTRA_TURN_DETECTION, MLD_DETECTION } from "./oracle-rules";
import type { Bracket } from "./types";

/**
 * WotC's Commander Brackets, transcribed. One module so a verdict consumer imports one
 * thing, while every detection string stays beside the classifier that earned it.
 *
 * REPORT, NEVER WEIGHT. Nothing here scores; the limits decide which brackets a deck is
 * PERMITTED, and the deck's own declaration is a separate field that is never corrected.
 */

/** The Game Changer allowance per bracket. Brackets 4 and 5 have none. */
export const GAME_CHANGER_LIMIT: Record<1 | 2 | 3, number> = {
  1: 0,
  2: 0,
  3: 3,
};

/**
 * Mass land denial is out at 1, 2 and 3 alike — there is no allowance to exceed, so the
 * limit is 0 at every bracket that has one.
 */
export const MASS_LAND_DENIAL_LIMIT = 0;

/**
 * Extra turns are COUNTED at bracket 1 only.
 *
 * At 2 and 3 the text is about chaining them rather than holding them, and "chained" is not
 * a property of a decklist. So the count is reported with no verdict, and the only thing
 * that violates B3 is a measured LOOP — an assembled combo Spellbook records as producing
 * infinite turns.
 */
export const EXTRA_TURN_LIMIT_BRACKET_1 = 0;

/**
 * Two-card infinite combos are forbidden at 1 and 2, and at 3 are permitted only in the
 * late game.
 *
 * LATENESS IS NOT COMPUTABLE from a decklist — nothing stored says when a combo lands — so
 * B3's clause WIDENS the permitted range to [3, 4] and never violates. An earlier draft had
 * it violating B3 outright, which would have slotted every deck holding a single infinite
 * as a 4 and made the range meaningless.
 */
export const COMBO_POLICY = { 1: "forbidden", 2: "forbidden", 3: "earlyGameOnly" } as const;

/**
 * §6.5 provenance, re-exported so verdict consumers import one module. The definitions live
 * beside the classifiers and are re-measured whenever a classifier changes.
 */
export { COMBO_DETECTION, EXTRA_TURN_DETECTION, MLD_DETECTION };

/**
 * The permitted range from the three bracket predicates.
 *
 * THE SLOT IS THE LOWEST SATISFIED BRACKET. A deck satisfies 4 and 5 trivially — they have
 * no restrictions beyond the banned list — so reading "satisfies 4" as "is a 4" would slot
 * every legal deck at the top. The range opens only as the lower brackets FALL.
 */
export function permitsFor(input: {
  violatesB1: boolean;
  violatesB2: boolean;
  violatesB3: boolean;
  hasCombo: boolean;
}): Bracket[] {
  if (!input.violatesB1) return [1, 2];
  if (!input.violatesB2) return [2];
  if (!input.violatesB3) return input.hasCombo ? [3, 4] : [3];
  return [4, 5];
}
