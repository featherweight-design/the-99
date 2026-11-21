import { freeCount, heldCredits, needsMoreCredits } from "../model/allowance-rule";
import { GUIDED_UNITS } from "./constants";
import type { GuidedOffer } from "./offer";

/** The Guided row's standing on the new-deck screen (N-Choice, N-Credits): drawn ready, drawn off with its reason, or not drawn (null). */
export type GuidedChoice = {
  /** `none`: no strategy has cards behind it. `short`: only more credits can fund a run (`needsMoreCredits`, decided in allowance-rule). */
  state: "ready" | "none" | "short";
  /** The credits the reader holds, for the short line. */
  have: number;
  /** Whether Get more credits can be offered. */
  payments: boolean;
};

/** Pure. Any other refusal (the owner's share, a pause, a race) is the server's, drawn on the deck's page as the refused line. */
export function guidedChoice(offer: GuidedOffer): GuidedChoice {
  const a = offer.allowance;
  const have = freeCount(a) + heldCredits(a);
  const state = offer.strategies.length === 0 ? "none" : needsMoreCredits(a, GUIDED_UNITS) ? "short" : "ready";
  return { state, have, payments: a.payments };
}
