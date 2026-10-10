/**
 * How many cuts one run asks for. A deck far over 100 (a 147-card list is 47 over) cannot be named
 * in one answer: the reply is one JSON entry per cut behind the model's thinking, and 47 entries
 * truncated at the app's 8,000-token output ceiling on both attempts. So a run names at most this
 * many, says how many remain, and the player runs it again after cutting. Pure and client-safe:
 * the prompt, the reply's bound, the validator and the panel all read this one definition.
 */
export const MAX_CUTS_PER_RUN = 20;

/** The cuts a run for a deck `over` cards over 100 asks for. */
export function cutsAsk(over: number): number {
  return Math.min(Math.max(0, over), MAX_CUTS_PER_RUN);
}
