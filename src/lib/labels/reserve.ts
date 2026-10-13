import { CARDS_PER_REQUEST, worstCaseUsd, type Rates } from "./plan";
import { MAX_TOKENS_CEILING, renderBody, SYSTEM_TOKENS_BOUND } from "./prompt";

/**
 * The label ledger's worst-case figures and its open statuses, shared by the build script
 * (`scripts/lib/card-labels-build.ts`, which caps a run on them) and the admin's Costs page (which
 * prices an expired chunk the way the ledger reserves it). Moved here unchanged so the two cannot
 * disagree about what a chunk costs or whether it is still in flight.
 */

/**
 * The input figures the WORST CASE is booked on, and both are CEILINGS rather than averages.
 *
 * This matters more than it looks: `waveSize` and `withinCap` bound Hugh's hard stop on
 * these numbers, so a figure that is merely typical makes the bound merely typical too.
 *
 * `SYSTEM_TOKENS` is `SYSTEM_TOKENS_BOUND`, one token per character of the block as it is NOW. It was
 * the BILLED 1,215, measured on the block before the vocabulary plan's Task 2 widened it, and a
 * measurement of an older string is no ceiling on a longer one. Task 6 re-measures it.
 *
 * `PER_CARD_TOKENS` is the MAXIMUM a commander-legal card renders to, measured over all 31,830
 * of them: 892 characters. ONE TOKEN PER CHARACTER for the variable text, which is a provable
 * upper bound rather than an estimate: no tokenizer emits more tokens than the string has
 * characters. `892 / 4` was the first version and it is not a maximum — four characters a token
 * is an AVERAGE, and punctuation, short fragments and non-Latin text all beat it. It costs almost
 * nothing to be this conservative: input is a small share of the worst case.
 */
export const SYSTEM_TOKENS = SYSTEM_TOKENS_BOUND;
export const PER_CARD_TOKENS = 892;

/**
 * The body's own fixed text, DERIVED from `renderBody` rather than estimated: the
 * "Label these N cards." line plus the `---` separators between them. Measured by rendering a
 * full request of empty cards, so what is left is exactly the wrapper.
 */
export const BODY_OVERHEAD_TOKENS = renderBody(
  Array.from({ length: CARDS_PER_REQUEST }, () => ({
    name: "", mana_cost: null, type_line: "", oracle_text: null, layout: "normal",
  })),
).length; // characters, for the reason above

export const requestWorstFor = (rates: Rates, maxTokens: number): number => worstCaseUsd(
  1, SYSTEM_TOKENS, PER_CARD_TOKENS, maxTokens, rates, BODY_OVERHEAD_TOKENS,
);
/**
 * What an EXPIRED request is reserved at: the worst case at `MAX_TOKENS_CEILING`, which no request can
 * exceed. Not this run's ceiling, because the request that expired was sent by an earlier invocation
 * that may have run under a different `LABEL_MAX_TOKENS`.
 */
export const expiredReserveFor = (rates: Rates): number => requestWorstFor(rates, MAX_TOKENS_CEILING);

/**
 * The statuses in which an intent's request may still be paid for and answered: not yet resolved
 * one way or the other. Planning never asks about a card inside one of these, from ANY run, so
 * nothing is asked twice while a batch is processing.
 *
 * Narrower than "not collected and not expired" on purpose. `failed` is a batch whose every
 * request errored — answered, unbilled, and its cards are owed a retry. `abandoned` is an intent
 * whose id was lost past the provider's listing: a run that meets one of its own refuses and tells
 * the operator to relabel under a new run id, which only works if a new run id is allowed to plan
 * those cards. Treating either as open would strand its cards for ever.
 */
export const OPEN_STATUSES = ["intended", "submitted", "in_progress"];
