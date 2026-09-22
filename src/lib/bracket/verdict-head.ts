import { BRACKET_NAMES } from "../copy/deck-analysis";
import type { Bracket } from "./types";

/**
 * What the verdict block's head draws, from the permitted range alone.
 *
 * PURE, AND SEPARATE FROM THE COMPONENT, because every one of these readings is a rule rather
 * than a layout: which face, whether a split chip is drawn, whether the ringed `?` appears and
 * in which bracket's ink. A component test renders one of them at a time and cannot say the set
 * is complete; this can.
 */
export type VerdictHead = {
  /** `Exhibition or Core`, or `Optimized` — never a numeral, which the mark beside it draws. */
  face: string;
  /** A range is two brackets the RULES hand to the player, so the chip says so. */
  split: boolean;
  /**
   * The ringed `?`, in the LOWER bracket's ink.
   *
   * Drawn only on a range, because it asks the question a range poses. `--bracket-1` on `[1,2]`
   * and `--bracket-4` on `[4,5]`, which is the lower member either way — so the token is derived
   * rather than listed, and a third range could not arrive with no ink.
   */
  glyphBracket: Bracket | null;
};

/**
 * `permitsFor` returns `[1,2] | [2] | [3] | [4] | [4,5]`. Exactly two of those five are ranges,
 * and the 3-vs-4 boundary resolves rather than splitting — ruled 2026-09-20, which is why
 * `[3,4]` is unreachable and the package's row for it is marked "not drawn".
 */
/**
 * THE EXACT FIVE, not a length test.
 *
 * A length check accepts `[1, 3]`, `[2, 5]` and `[5, 4]` — none of which `permitsFor` can
 * return, and each of which renders a confident face for a range nobody permitted: "Exhibition
 * or Upgraded", and for the reversed pair a face whose two names are the wrong way round with
 * the glyph inked from the HIGHER bracket. A fabricated answer is worse than an empty one
 * because it looks like an answer, and this function is the runtime boundary for hand-built
 * data.
 */
const REACHABLE = new Set(["1,2", "2", "3", "4", "4,5"]);

export function verdictHead(permits: readonly Bracket[]): VerdictHead {
  const [low, high] = [permits[0], permits[permits.length - 1]];
  // ONE OR TWO, AND NOTHING ELSE. `permitsFor` returns only those shapes, so anything else was
  // hand-built by a caller — and the failure is not loud on its own: reading `[0]` and `[-1]`
  // off `[1, 2, 3]` silently discards the interior and renders "Exhibition or Upgraded", a face
  // that names a range nobody permitted. An empty one renders the empty string beside a mark
  // drawing nothing. Both fail closed.
  if (!REACHABLE.has(permits.join(","))) {
    throw new Error(
      `verdictHead: [${permits.join(", ")}] is not a range permitsFor can return — it has no `
      + `reading`,
    );
  }
  if (permits.length === 1) {
    return { face: BRACKET_NAMES[low], split: false, glyphBracket: null };
  }
  return {
    face: `${BRACKET_NAMES[low]} or ${BRACKET_NAMES[high!]}`,
    split: true,
    // THE LOWER MEMBER, derived rather than listed. `[1,2]` takes `--bracket-1` and `[4,5]`
    // takes `--bracket-4`; listing the two pairs would leave a third range inkless.
    glyphBracket: low,
  };
}

/**
 * The population line, which reports what other players declared.
 *
 * NEVER A ZERO for a commander EDHREC has no declarations for — absent and none are different
 * facts, and 27 commanders are in the first case. `BracketPopulation.deckCount` being nullable
 * is the same distinction one layer down.
 */
export type PopulationLine =
  | { kind: "present"; declaredTotal: number; said: number; name: string }
  | { kind: "absent" };

export function populationLine(
  population: { counts: Record<string, number>; declaredTotal: number } | null,
  bracket: Bracket,
): PopulationLine {
  if (!population || population.declaredTotal <= 0) return { kind: "absent" };
  return {
    kind: "present",
    declaredTotal: population.declaredTotal,
    // `?? 0` is right HERE and nowhere else: the total is known to be positive, so a bracket
    // nobody chose really is zero of it — unlike an absent population, which is not a zero.
    said: population.counts[String(bracket)] ?? 0,
    name: BRACKET_NAMES[bracket],
  };
}
