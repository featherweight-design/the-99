import { INTAKE_MAX_TOKENS, INTAKE_MODEL } from "../intake/limits";
import { SYNOPSIS_MAX_TOKENS_V8 } from "../synopsis/limits";
import { SYNOPSIS_MODEL } from "../synopsis/model";
import { STUB_MODEL } from "../synopsis/stub";
import { TUNING_MAX_TOKENS, TUNING_MODEL } from "../tuning/limits";
import type { ModelFeature } from "./allowance-rule";
import type { ModelUsage } from "./client";

/**
 * What a model call costs, in integer MICRO-DOLLARS. Pure and client-safe.
 *
 * The app's own copy of the rates, deliberately not an import of the eval harness's
 * (`scripts/eval/lib/pricing.mts`): nothing under `src` imports from `scripts`.
 *
 * Rates are dollars per million tokens, from Anthropic pricing, as recorded by the claude-api
 * skill's model table, 2026-09-24. A dollar per million tokens is exactly one micro-dollar per
 * token, so a rate here is also the micro-dollar price of one token. Cache reads cost 0.1x input
 * and cache writes 1.25x input (the 5-minute TTL, the only one the API defaults to); the app
 * sends no `cache_control`, so both meters read zero today and are priced anyway.
 *
 * A model with no row here is a HARD ERROR, never a zero: a ledger that priced an unknown model
 * at nothing would let the spend cap wave every call through.
 */
export const RATES: Readonly<Record<string, { input: number; output: number }>> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  // The Overview's model from 2026-10-11 (claude-api skill's model table, cached 2026-10-06).
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-opus-5": { input: 5, output: 25 },
};

export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

/**
 * Models that make no API call at all, and so cost nothing: the synopsis stub every non-live run
 * uses (`src/lib/synopsis/stub.ts`), which records `"stub"` as its model. Named here rather than
 * priced at zero in `RATES`, so a zero can only ever mean "no request was made".
 */
const UNBILLED_MODELS: ReadonlySet<string> = new Set([STUB_MODEL]);

function ratesFor(model: string): { input: number; output: number } {
  if (UNBILLED_MODELS.has(model)) return { input: 0, output: 0 };
  const r = RATES[model];
  if (!r) throw new Error(`prices: no rate for model ${model}`);
  return r;
}

/** What one settled call cost, from its (both-attempt) usage. Rounded UP to a whole micro-dollar. */
export function costMicroUsd(model: string, usage: ModelUsage): number {
  const r = ratesFor(model);
  const inputUnits =
    usage.inputTokens +
    usage.cacheReadTokens * CACHE_READ_MULTIPLIER +
    usage.cacheWriteTokens * CACHE_WRITE_MULTIPLIER;
  return Math.ceil(inputUnits * r.input + usage.outputTokens * r.output);
}

/**
 * The most one call can cost: both attempts (a malformed reply is sent once more), each with the
 * whole input ceiling at the plain input rate and the reply at its `max_tokens`. Plain input rate
 * because the app sends no `cache_control`, so no token is billed as a cache write.
 */
export function worstCaseMicroUsd(model: string, inputCeilingTokens: number, maxTokens: number): number {
  const r = ratesFor(model);
  return 2 * (inputCeilingTokens * r.input + maxTokens * r.output);
}

/**
 * Each feature's call, as the spend cap prices it before it is made. ONE definition each.
 *
 * INPUT CEILINGS, measured on staging read-only 2026-09-24 with the count_tokens API over all 19
 * staging decks: the tuning prompt ran 3,748 to 5,116 tokens; the synopsis prompt 6,551 to 10,342,
 * and a synopsis section retry adds the kept synopsis on top, up to its 3,000-token output. The
 * ceilings are those maxima with room to grow: tuning 12,000, synopsis 24,000.
 *
 * The deeper read (intake), measured the same way 2026-09-25 against staging's tags: 3,434 tokens
 * with the picker's 307 labels and the worst 800 characters of words (`READ_WORDS_MAX_CHARS`,
 * dense names and digits), and 3,946 were every one of the 401 tags offered. Its ceiling is 6,000.
 */
export const FEATURE_CALLS: Readonly<Record<ModelFeature, {
  model: string;
  inputCeilingTokens: number;
  maxTokens: number;
  /** Model calls one reservation can make. A synopsis write is up to TWO: the first answer and
   *  contract B's automatic repair, both under the one unit (Hugh, 2026-09-24). */
  callsPerWrite: number;
}>> = {
  tuning: { model: TUNING_MODEL, inputCeilingTokens: 12_000, maxTokens: TUNING_MAX_TOKENS, callsPerWrite: 1 },
  // Priced at the LARGER of the two contracts' ceilings whatever the switch says: a reservation is
  // priced from the feature, not from the contract that created it, so a flag turned off or a
  // rollback while a contract-8 call is in flight would otherwise price it below what it can cost.
  synopsis: { model: SYNOPSIS_MODEL, inputCeilingTokens: 24_000, maxTokens: SYNOPSIS_MAX_TOKENS_V8, callsPerWrite: 2 },
  intake: { model: INTAKE_MODEL, inputCeilingTokens: 6_000, maxTokens: INTAKE_MAX_TOKENS, callsPerWrite: 1 },
  // MEASURED 2026-10-10 (`pnpm eval:cuts-model --text`, dry run, five staging decks): the largest
  // request with type, mana value and card text was 15,266 input tokens, and the largest reply 4,049
  // output tokens against the 8,000 ceiling.
  proposed_cuts: { model: TUNING_MODEL, inputCeilingTokens: 20_000, maxTokens: TUNING_MAX_TOKENS, callsPerWrite: 1 },
};

/**
 * A feature's worst case at `model` (the model its reservation recorded; the feature's own when
 * the row predates the column).
 */
export function featureWorstCaseMicroUsd(feature: ModelFeature, model: string | null = null): number {
  const call = FEATURE_CALLS[feature];
  return call.callsPerWrite * worstCaseMicroUsd(model ?? call.model, call.inputCeilingTokens, call.maxTokens);
}
