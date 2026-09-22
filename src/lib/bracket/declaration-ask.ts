import type { Bracket } from "./types";
import { permitsDeclaration } from "./declaration";

/**
 * What the declaration surface draws, from the permitted range and the version's own answer.
 *
 * FIVE READINGS, and the fifth is the one a length check would miss. Round 3's table:
 *
 *   a range, unanswered      the split face, and the ask
 *   a range, answered inside the declared bracket alone, with `change`
 *   a single bracket         no declaration line at all — it is not a question
 *   answered, now OUTSIDE    the drift line, AND the ordinary ask if the reading is still a range
 *   answered, now outside a single bracket   the drift line and nothing further
 *
 * THERE IS NO SKIP AND NO SKIPPED READING (R5). A player who says nothing leaves the version
 * unanswered, and the ask stays on the versions that have a range — so `unanswered` is the
 * absence of an answer rather than a state a control can put the deck into.
 */
export type DeclarationAsk =
  /** A range with no answer: draw the split face and ask. */
  | { kind: "ask"; permits: readonly Bracket[] }
  /**
   * A range answered from inside it: the one bracket, and `change`.
   *
   * `permits` rides along because `change` re-asks the SAME range and the description line
   * names it. Without it the component would rebuild the range from the answer, which is a
   * second copy of `permitsFor`'s shapes in a place nothing re-measures.
   */
  | { kind: "answered"; declared: Bracket; permits: readonly Bracket[] }
  /** One permitted bracket: not a question, so no line at all. */
  | { kind: "none" }
  /**
   * Answered, and the draft has since moved out of what it permits.
   *
   * `stillAsking` carries whether the ordinary ask follows the drift line — it does when the
   * new reading is itself a range, and does not when it is a single bracket. Carried rather
   * than re-derived by the component, because the component would need this module's rule to
   * do it and would then hold a second copy of it.
   */
  | { kind: "drifted"; declared: Bracket; permits: readonly Bracket[]; stillAsking: boolean };

export function declarationAsk(
  permits: readonly Bracket[],
  declared: Bracket | null,
): DeclarationAsk {
  const range = permits.length > 1;
  if (declared !== null && !permitsDeclaration(permits, declared)) {
    // THE DRIFT READING, and it is reachable with either shape of `permits`. The declaration is
    // never corrected, never inferred and never cleared — the deck keeps what was said and the
    // surface reports that the cards moved.
    return { kind: "drifted", declared, permits, stillAsking: range };
  }
  if (!range) return { kind: "none" };
  return declared === null ? { kind: "ask", permits } : { kind: "answered", declared, permits };
}
