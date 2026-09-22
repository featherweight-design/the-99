import type { Bracket } from "./types";

/**
 * Whether a deck may record a declaration, and why not when it may not.
 *
 * THE RULE IS PURE AND THE ACTION IS A WRAPPER, deliberately. A server action needs a request
 * and a signed-in reader, so no probe in this repository can call one — `probe:declaration`
 * proves the STORAGE by calling the writer directly and says so in its own header. What can be
 * proved without a request is the decision, so the decision lives here and the action is left
 * with nothing to get wrong except calling it.
 *
 * "The refusal rules matter more than the write": the app must never default a declaration and
 * never infer one, so every path to `decks.declared_bracket` passes through this function and
 * a `no` here is the only answer that stops it.
 */
export type DeclarationRefusal =
  /** Not 1-5. The column's check constraint refuses it too; this refuses it first, with words. */
  | { kind: "out-of-range" }
  /**
   * The cards permit exactly one bracket, so there is nothing to declare.
   *
   * A REFUSAL RATHER THAN A NO-OP. Round 3's control is two chips and is drawn only for a
   * range — a request naming the single permitted bracket did not come from that control, and
   * storing it would record an answer to a question nobody asked. The distinction survives an
   * edit: a deck that later gains a range must be asked on its own account rather than finding
   * a declaration already sitting there.
   */
  | { kind: "no-choice"; permits: readonly Bracket[] }
  /**
   * The cards do not permit what was named.
   *
   * Refused AT THE WRITE, and that is not in tension with a declaration being allowed to go
   * out of range LATER. A player declares from what their cards permit now; drift happens
   * afterwards through edits, and the deck keeps its answer — stated, not deleted — which is
   * what the drift reading exists to describe. What must never happen is the app storing an
   * answer the cards never permitted in the first place.
   */
  | { kind: "not-permitted"; permits: readonly Bracket[] };

/** `null` when the declaration may be recorded. */
export function declarationRefusal(
  permits: readonly Bracket[],
  value: number,
): DeclarationRefusal | null {
  if (!Number.isInteger(value) || value < 1 || value > 5) return { kind: "out-of-range" };
  // BEFORE the membership test, and the order is the whole difference between two messages. A
  // single-permit deck asked to declare its one bracket is not being told "your cards do not
  // allow that" — they do. It is being told there was no question.
  if (permits.length < 2) return { kind: "no-choice", permits };
  if (!permits.includes(value as Bracket)) return { kind: "not-permitted", permits };
  return null;
}
