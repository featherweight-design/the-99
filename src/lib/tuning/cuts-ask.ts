/**
 * How many cuts one run asks for. A deck far over 100 (a 147-card list is 47 over) cannot be named
 * in one answer: the reply is one JSON entry per cut behind the model's thinking, and 47 entries
 * truncated at the app's 8,000-token output ceiling on both attempts. So a run names at most this
 * many, says how many remain, and the player runs it again after cutting. Pure and client-safe:
 * the prompt, the reply's bound, the validator and the panel all read this one definition.
 *
 * The cap is derived from tokens per cut, MEASURED on the stored v2 replies of the plan eval
 * (`runs/2026-10-10T17-50-41-290Z-cuts-plan-new`, `usage.output_tokens`, which counts the model's
 * thinking as well as the JSON):
 *   Counter Intelligence  17 cuts  7,467 tokens  = 439 per cut (the worst of the answers with 16 or more cuts; Gods' 465 below is higher but spreads a fixed cost over 6)
 *   Prismari Artistry     16 cuts  4,591 tokens  = 287 per cut
 *   Avatar Aang           19 cuts  3,138 tokens  = 165 per cut
 *   Gods                   6 cuts  2,792 tokens  = 465 per cut (thinking dominates a short answer)
 *   Mutant Menace         47 cuts 15,796 tokens  = 336 per cut (the eval-only 16,000 ceiling)
 * Price a cut at 440 tokens, the worst rate among the answers long enough to say anything about it (16 cuts or more; Gods' 6 is below), and keep 15% of the ceiling free for a
 * deck whose thinking runs longer: floor(8,000 x 0.85 / 440) = floor(15.45) = 15 cuts, which is
 * 6,600 tokens on the worst measured rate. 20 cuts at that rate is 8,800, over the ceiling, which
 * is why the first cap of 20 was not safe. Gods' 465 per cut is a fixed thinking cost spread over
 * six cuts; at 15 cuts it would be 6,975, still under the ceiling.
 */
export const OUTPUT_CEILING_TOKENS = 8_000;
export const WORST_TOKENS_PER_CUT = 440;
export const OUTPUT_MARGIN = 0.15;
export const MAX_CUTS_PER_RUN = Math.floor((OUTPUT_CEILING_TOKENS * (1 - OUTPUT_MARGIN)) / WORST_TOKENS_PER_CUT);

/** The cuts a run for a deck `over` cards over 100 asks for. */
export function cutsAsk(over: number): number {
  return Math.min(Math.max(0, over), MAX_CUTS_PER_RUN);
}
