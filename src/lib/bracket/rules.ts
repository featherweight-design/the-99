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
 * the clause never violates B3. What it does instead is RESOLVE, not widen: see
 * `comboLandsEarly`.
 *
 * An earlier draft had it violating B3 outright, which would have slotted every deck holding
 * a single infinite as a 4. A later one widened the range to [3, 4]; that shipped, and was
 * overruled 2026-09-20 — see `permitsFor`.
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
/**
 * A RANGE IS ONLY EVER A QUESTION FOR THE PLAYER. Ruled 2026-09-20, overturning the
 * `[3, 4]` range this function used to return.
 *
 * `[1, 2]` and `[4, 5]` are ranges because the rules make them ones: Exhibition and cEDH are
 * statements of intent, and two decks with identical contents can sit either side. Nobody but
 * the player can answer those, so the app does not pretend to.
 *
 * The 3-vs-4 boundary is NOT that. It is a question about the deck, and answering it with a
 * range asked the reader to adjudicate something they came here to be told — "if we start
 * splitting 2/3/4 then we're asking too much of the player and the ranking starts to seem
 * indecisive." So the combo boundary RESOLVES, on whether the deck can assemble the combo
 * rather than draw into it (`comboLandsEarly`), and the receipts state which tutors decided
 * it. The player can still overrule the whole thing by declaring; that is what `declared` is
 * for, and a bracket carried to a pod was always theirs rather than ours.
 */
/**
 * A stored `declared_bracket` column, validated into a `Bracket`.
 *
 * The check constraint makes a bad WRITE loud; this makes a bad READ impossible, on a column
 * an older row could already carry anything in. It lives here rather than in the profile
 * loader because the declaration is handed to `slotDeck` at the draw — so whoever reads the
 * column is whoever needs this, and the alternative is each caller writing its own cast.
 */
export function bracketOf(value: number | null): Bracket | null {
  return value !== null && value >= 1 && value <= 5 ? (value as Bracket) : null;
}

/**
 * Which brackets' limits a deck's counts break. The ONE statement of the rules above as
 * arithmetic, which `slotDeck`, `bracketDelta` and Help me choose's filter all call; it was
 * written out twice before the third caller arrived, and a third copy is how two of them drift.
 *
 * `loops` are the combos Spellbook records as producing infinite turns, the one extra-turns clause
 * that matters above bracket 1. A plain extra-turn card breaks bracket 1 only.
 */
export function violationsFor(counts: {
  gameChangers: number;
  massLandDenial: number;
  extraTurns: number;
  combos: number;
  loops: number;
}): { violatesB1: boolean; violatesB2: boolean; violatesB3: boolean } {
  const { gameChangers, massLandDenial, extraTurns, combos, loops } = counts;
  return {
    violatesB1: gameChangers > GAME_CHANGER_LIMIT[1] || massLandDenial > MASS_LAND_DENIAL_LIMIT
      || extraTurns > EXTRA_TURN_LIMIT_BRACKET_1 || combos > 0,
    violatesB2: gameChangers > GAME_CHANGER_LIMIT[2] || massLandDenial > MASS_LAND_DENIAL_LIMIT || combos > 0,
    violatesB3: gameChangers > GAME_CHANGER_LIMIT[3] || massLandDenial > MASS_LAND_DENIAL_LIMIT || loops > 0,
  };
}

export function permitsFor(input: {
  violatesB1: boolean;
  violatesB2: boolean;
  violatesB3: boolean;
  /** `comboLandsEarly` — the deck's tutors can assemble a whole combo. */
  assemblesCombo: boolean;
}): Bracket[] {
  if (!input.violatesB1) return [1, 2];
  if (!input.violatesB2) return [2];
  if (!input.violatesB3) return input.assemblesCombo ? [4] : [3];
  return [4, 5];
}

/**
 * Can this deck ASSEMBLE a combo, rather than draw into it?
 *
 * True when the deck's tutors cover EVERY piece of at least one assembled combo — one tutor
 * that finds both halves, or two that each find a different one. A tutor reaching one half of
 * a two-card combo leaves the other to chance, which is the deck the boundary calls a 3.
 *
 * **This is not an invented threshold, and the distinction matters** (§2.4a): the number of
 * pieces that must be covered is the COMBO's, not ours. "More than N tutors" would be a
 * figure we chose and would have to defend — and it is precisely the clause WotC deleted in
 * October 2025, having found that not all tutors are created equal.
 *
 * A piece in the command zone counts as covered without being tutored: `usesCommander` means
 * it is available every game by the format's own rules, so requiring a tutor for it would
 * make a commander combo harder to detect than an identical one in the 99.
 */
export function comboLandsEarly(
  combos: readonly {
    variantId: string;
    cards: readonly { oracleId: string }[];
  }[],
  reaches: readonly { combo: { variantId: string }; piece: { oracleId: string } }[],
  commanderOracleIds: readonly string[],
): boolean {
  const inCommandZone = new Set(commanderOracleIds);
  return combos.some((combo) => {
    const reached = new Set(
      reaches.filter((r) => r.combo.variantId === combo.variantId).map((r) => r.piece.oracleId),
    );
    // A piece is covered when a tutor finds it OR it sits in the command zone, where it is
    // available every game by the format's own rules.
    //
    // COUNTED PER PIECE, not deducted once from the total. `buildDeckProfile` skips a reach
    // for EVERY commander piece, so a partner deck whose combo is its two commanders has two
    // uncoverable pieces — subtracting a flat one would leave it needing a tutor for a combo
    // that assembles in the command zone every single game.
    return combo.cards.every(
      (c) => reached.has(c.oracleId) || inCommandZone.has(c.oracleId),
    );
  });
}
