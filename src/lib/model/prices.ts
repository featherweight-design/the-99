import { INTAKE_MAX_TOKENS, INTAKE_MODEL, READ_JUDGE_MAX_TOKENS, READ_JUDGE_MODEL, READ_SHORTLIST_MAX_TOKENS, READ_SHORTLIST_MODEL } from "../intake/limits";
import { SYNOPSIS_MAX_TOKENS_V8 } from "../synopsis/limits";
import { SYNOPSIS_MODEL } from "../synopsis/model";
import { STUB_MODEL } from "../synopsis/stub";
import { FITS_READ_INPUT_CEILING, FITS_READ_MAX_TOKENS, FITS_READ_MODEL } from "../swaps/fits-read-limits";
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
 * and cache writes 1.25x input (the 5-minute TTL, the only one the app sends). Only Help me choose's
 * read sends `cache_control` (`cacheSystem`); every other call's cache meters read zero and are
 * priced anyway.
 *
 * A model with an `above` row has TWO rate cards, chosen by the prompt's length: Claude Haiku 5.5
 * costs $0.10 / $0.50 up to 100K prompt tokens and $0.50 / $2.50 above (claude-api skill's model
 * table, 2026-10-11). The prompt is every input token, cached or not.
 *
 * A model with no row here is a HARD ERROR, never a zero: a ledger that priced an unknown model
 * at nothing would let the spend cap wave every call through.
 */
type Rate = { input: number; output: number };
export const RATES: Readonly<Record<string, Rate & { above?: Rate & { promptTokens: number } }>> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  // The Overview's model from 2026-10-11 (claude-api skill's model table, cached 2026-10-06).
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  // Help me choose's shortlist step from 2026-10-11 (rework plan, the orchestrator's ruling).
  "claude-haiku-5-5": { input: 0.1, output: 0.5, above: { promptTokens: 100_000, input: 0.5, output: 2.5 } },
  "claude-opus-5": { input: 5, output: 25 },
  // The card-label job's model, called only through the Batch API (`batchRates`); no press uses it.
  "claude-sonnet-4-5": { input: 3, output: 15 },
};

export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

/**
 * Models that make no API call at all, and so cost nothing: the synopsis stub every non-live run
 * uses (`src/lib/synopsis/stub.ts`), which records `"stub"` as its model. Named here rather than
 * priced at zero in `RATES`, so a zero can only ever mean "no request was made".
 */
const UNBILLED_MODELS: ReadonlySet<string> = new Set([STUB_MODEL]);

/**
 * The Batch API halves every meter, cache reads and writes included (the discounts stack).
 *
 * ONE source for the card-label job's rates (admin audit finding 9): the label scripts
 * (`scripts/lib/card-labels-pricing.mjs`) read `batchRates`, and any app reader of
 * `card_label_batches` (the admin's Card label runs is the planned one) prices from the same
 * function, because the table stores tokens and no dollars and a second rate table could disagree.
 */
export const BATCH_DISCOUNT = 0.5;

/** Dollars per million tokens at Batch API rates (so also micro-dollars per token). */
export type BatchRates = { in: number; out: number; cacheWrite: number; cacheRead: number };

// Rounded to a millionth of a dollar, so a product like 3 x 0.1 x 0.5 reads 0.15 and not 0.15000000000000002.
const exact = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * The rate card a stored model id names. A dated snapshot id (`claude-haiku-4-5-20251001`, as the
 * label job stores it on `card_label_batches.model`) is priced as its base model.
 */
export function batchRateCard(model: string): (typeof RATES)[string] | undefined {
  return RATES[model] ?? RATES[model.replace(/-\d{8}$/, "")];
}

/**
 * Batch rates for a model with ONE rate card. A model whose price steps up past a prompt length
 * (an `above` row) is refused: batch meters are summed across requests, so no single card can be
 * chosen for them, and the lower one would understate every long request.
 */
export function batchRates(model: string): BatchRates {
  const r = batchRateCard(model);
  if (!r) throw new Error(`prices: no rate for model ${model}`);
  if (r.above) throw new Error(`prices: ${model} has a rate step past ${r.above.promptTokens} prompt tokens, so summed batch meters cannot be priced`);
  return {
    in: exact(r.input * BATCH_DISCOUNT),
    out: exact(r.output * BATCH_DISCOUNT),
    cacheWrite: exact(r.input * CACHE_WRITE_MULTIPLIER * BATCH_DISCOUNT),
    cacheRead: exact(r.input * CACHE_READ_MULTIPLIER * BATCH_DISCOUNT),
  };
}

export type BatchTokens = { inTokens: number; outTokens: number; cacheWriteTokens: number; cacheReadTokens: number };

/** What batched requests cost, in whole micro-dollars, from their summed meters. */
export function batchCostMicroUsd(model: string, t: BatchTokens): number {
  const r = batchRates(model);
  return Math.round(t.inTokens * r.in + t.outTokens * r.out + t.cacheWriteTokens * r.cacheWrite + t.cacheReadTokens * r.cacheRead);
}

/** The rate card for a prompt of `promptTokens` input tokens, cached or not. */
function ratesFor(model: string, promptTokens: number): Rate {
  if (UNBILLED_MODELS.has(model)) return { input: 0, output: 0 };
  const r = RATES[model];
  if (!r) throw new Error(`prices: no rate for model ${model}`);
  return r.above && promptTokens > r.above.promptTokens ? r.above : r;
}

/**
 * What one settled call cost, from its (both-attempt) usage. Rounded UP to a whole micro-dollar.
 * The rate card is chosen on the usage's whole prompt, which sums both attempts when there were
 * two: a retried call near a card's line can be priced on the dearer card. That errs toward the
 * cap, never away from it.
 */
export function costMicroUsd(model: string, usage: ModelUsage): number {
  const r = ratesFor(model, usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens);
  const inputUnits =
    usage.inputTokens +
    usage.cacheReadTokens * CACHE_READ_MULTIPLIER +
    usage.cacheWriteTokens * CACHE_WRITE_MULTIPLIER;
  return Math.ceil(inputUnits * r.input + usage.outputTokens * r.output);
}

/**
 * The most one call can cost: both attempts (a malformed reply is sent once more), each with the
 * whole input ceiling and the reply at its `max_tokens`. The input is at the plain rate, or, for a
 * call that writes a cache (`cacheWrite`), all of it at the cache-write rate: a cold cache on both
 * attempts is the worst case. The rate card is the one BOTH attempts' summed prompt picks, because
 * that is how `costMicroUsd` settles them: a retry of a 60,000-token Haiku prompt settles at the
 * rate above 100,000, and a reservation priced per attempt would be a third of what it costs.
 */
export function worstCaseMicroUsd(model: string, inputCeilingTokens: number, maxTokens: number, opts: { cacheWrite?: boolean } = {}): number {
  const r = ratesFor(model, 2 * inputCeilingTokens);
  const input = inputCeilingTokens * (opts.cacheWrite ? CACHE_WRITE_MULTIPLIER : 1);
  return Math.ceil(2 * (input * r.input + maxTokens * r.output));
}

/** One call a feature's reservation can make, as the spend cap prices it. */
export type FeatureStep = { model: string; inputCeilingTokens: number; maxTokens: number; cacheWrite?: boolean };

/**
 * Each feature's call, as the spend cap prices it before it is made. ONE definition each.
 *
 * INPUT CEILINGS, measured on staging read-only 2026-09-24 with the count_tokens API over all 19
 * staging decks: the tuning prompt ran 3,748 to 5,116 tokens; the synopsis prompt 6,551 to 10,342,
 * and a synopsis section retry adds the kept synopsis on top, up to its 3,000-token output. The
 * ceilings are those maxima with room to grow: tuning 12,000, synopsis 24,000.
 *
 * The retired one-call read (intake), measured the same way 2026-09-25 against staging's tags: 3,434 tokens
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
  /** A reservation whose calls differ in model or size: priced as the sum of its steps, in place of
   *  `callsPerWrite` of the one call above. */
  steps?: readonly FeatureStep[];
}>> = {
  tuning: { model: TUNING_MODEL, inputCeilingTokens: 12_000, maxTokens: TUNING_MAX_TOKENS, callsPerWrite: 1 },
  // Priced at the LARGER of the two contracts' ceilings whatever the switch says: a reservation is
  // priced from the feature, not from the contract that created it, so a flag turned off or a
  // rollback while a contract-8 call is in flight would otherwise price it below what it can cost.
  synopsis: { model: SYNOPSIS_MODEL, inputCeilingTokens: 24_000, maxTokens: SYNOPSIS_MAX_TOKENS_V8, callsPerWrite: 2 },
  // Help me choose's read (rework plan, 2026-10-11): two calls under one reservation. The shortlist
  // reads the whole commander list as a cached prefix, MEASURED 147,736 tokens on claude-haiku-5-5
  // (`scripts/eval/measure-pool-list.mts`, staging, 3,467 commanders), so its ceiling is that list
  // plus the request with room to grow, priced as a cold cache write on the >100K rate card. The
  // judgement reads only the shortlist. The first fields are the retired one-call read's, kept only as the shape's required
  // base; `steps` prices every reservation.
  intake: {
    model: INTAKE_MODEL, inputCeilingTokens: 6_000, maxTokens: INTAKE_MAX_TOKENS, callsPerWrite: 1,
    steps: [
      { model: READ_SHORTLIST_MODEL, inputCeilingTokens: 175_000, maxTokens: READ_SHORTLIST_MAX_TOKENS, cacheWrite: true },
      { model: READ_JUDGE_MODEL, inputCeilingTokens: 30_000, maxTokens: READ_JUDGE_MAX_TOKENS },
    ],
  },
  // MEASURED 2026-10-10 (`pnpm eval:cuts-model --text`, dry run, five staging decks): the largest
  // request with type, mana value and card text was 15,266 input tokens, and the largest reply 4,049
  // output tokens against the 8,000 ceiling.
  proposed_cuts: { model: TUNING_MODEL, inputCeilingTokens: 20_000, maxTokens: TUNING_MAX_TOKENS, callsPerWrite: 1 },
  // Find a deck read (eval 2026-10-12, `docs/superpowers/eval/metrics-find-a-deck-read.md`): one
  // call. MEASURED 63,360 input tokens at most on the eval (21 candidates) and 4,257 output; the
  // press refuses a prompt over `FITS_READ_INPUT_CEILING`, so this prices the worst it can settle at.
  fits_read: { model: FITS_READ_MODEL, inputCeilingTokens: FITS_READ_INPUT_CEILING, maxTokens: FITS_READ_MAX_TOKENS, callsPerWrite: 1 },
};

/**
 * A feature's worst case at `model` (the model its reservation recorded; the feature's own when
 * the row predates the column).
 */
export function featureWorstCaseMicroUsd(feature: ModelFeature, model: string | null = null): number {
  const call = FEATURE_CALLS[feature];
  // A reservation made with the stub costs nothing however many steps the feature has.
  if (model !== null && UNBILLED_MODELS.has(model)) return 0;
  if (call.steps) return call.steps.reduce((sum, s) => sum + worstCaseMicroUsd(s.model, s.inputCeilingTokens, s.maxTokens, { cacheWrite: s.cacheWrite }), 0);
  return call.callsPerWrite * worstCaseMicroUsd(model ?? call.model, call.inputCeilingTokens, call.maxTokens);
}
