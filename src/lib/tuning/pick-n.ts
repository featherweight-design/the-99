/**
 * A pick-N list: a run NAMES `named` rows, of which the player needs `needed`, and chooses which
 * (small items R1b, `design_handoff_the99_small_items` §1: Proposed cuts names three more cuts than
 * the deck needs; Suggested changes v2 reuses the pattern). Pure and client-safe: the head, the lead
 * and the foot of the list all read this one state, so the three cannot disagree.
 *
 * `exact`: the run named no more than it needed (a run from before the extras, a deck so far over
 * that the per-run cap leaves no room, or a run that came back short); the tool's shipped copy
 * applies. Otherwise the phase follows the answers: nothing answered yet (`open`), fewer chosen than
 * needed (`choosing`), exactly enough (`enough`), or more than needed (`past`: allowed, never refused).
 */
export type PickPhase = "exact" | "open" | "choosing" | "enough" | "past";

export type PickState = {
  phase: PickPhase;
  /** Rows the run named. */
  named: number;
  /** Rows the player needs to choose. */
  needed: number;
  /** Rows chosen (a cut, for Proposed cuts). */
  chosen: number;
  /** Rows answered either way (chosen or kept). */
  answered: number;
  /** Rows not answered yet. */
  open: number;
  /** Named rows not chosen: the others that stay on the list once enough are chosen. */
  others: number;
  /** How many past `needed` were chosen (0 unless `past`). */
  past: number;
};

export function pickState(input: { named: number; needed: number; chosen: number; answered: number }): PickState {
  const named = Math.max(0, input.named);
  const needed = Math.max(0, input.needed);
  const chosen = Math.max(0, Math.min(input.chosen, named));
  const answered = Math.max(chosen, Math.min(input.answered, named));
  const phase: PickPhase =
    named <= needed ? "exact"
      : answered === 0 ? "open"
        : chosen < needed ? "choosing"
          : chosen === needed ? "enough"
            : "past";
  return { phase, named, needed, chosen, answered, open: named - answered, others: named - chosen, past: Math.max(0, chosen - needed) };
}
