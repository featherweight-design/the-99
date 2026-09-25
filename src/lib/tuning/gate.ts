import { deckTuningCopy } from "../copy/deck-tuning";
import { lockedCardsCopy } from "../copy/locked-cards";
import type { TuningState } from "./state";

/**
 * The one answer to "why can this not run now". Pure and client-safe, and shared by the panel
 * (the reason beside the button) and `runTuning` (the refusal a replayed or stale request gets),
 * so the two can never disagree.
 *
 * Three reasons, the first that applies wins. NO GAME COUNT: a deck with no games runs.
 *  - in_flight — a run is pending on this deck.
 *  - unchanged — nothing the player did has moved since the last successful run, no model
 *    version has either, and no deck version has been committed since. NOT a dead end: the panel draws `Suggest again anyway` enabled (design table S4
 *    state 5), and `runTuning(deckId, { anyway: true })` passes this reason and no other.
 *  - allLocked — every card but the commander is locked (Locked, never cut), so there is nothing a
 *    run could cut. Refused BEFORE a credit is reserved, and ahead of `unchanged`, since pressing
 *    "anyway" would still find nothing to suggest.
 *  - allowance — the shared per-player allowance is spent. After `unchanged`, because that is the
 *    more useful truth: a player told to wait for the allowance would come back to be told nothing
 *    changed.
 * A failed or cancelled run consumes nothing, so neither is a reason.
 */
export type GateReason = {
  kind: "in_flight" | "allLocked" | "unchanged" | "allowance";
  /** Beside the button, and as the refusal. Static: the panel names times in the reader's clock. */
  message: string;
};

export function gateReason(state: TuningState): GateReason | null {
  if (state.run?.status === "pending") {
    return { kind: "in_flight", message: deckTuningCopy.announce.started };
  }
  if (state.allLocked) {
    return { kind: "allLocked", message: lockedCardsCopy.tuning.allLocked(state.allLocked) };
  }
  if (!state.stale && !state.modelVersionMoved && !state.retired && state.lastOkFingerprint !== null) {
    return { kind: "unchanged", message: deckTuningCopy.announce.unchanged };
  }
  if (state.allowance.used >= state.allowance.limit) {
    return { kind: "allowance", message: deckTuningCopy.allowance.spent };
  }
  return null;
}
