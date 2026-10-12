// ONE pricing table, imported by the estimate and by the measurement.
//
// It was duplicated verbatim across `label-cards-run.mts` and
// `label-cards-collect.mts`, which is the worst place for a copy: a rate changed in
// one leaves the estimate and the measured cost priced differently, and the
// measured figure is what the report's full-run extrapolation rests on.
//
// Per million tokens, BATCH rate (half of standard). The rates are read from
// `src/lib/model/prices.ts` (`batchRates`), the app's own table, since admin audit
// finding 9: any app reader pricing `card_label_batches` uses the same function, so
// the script and the app cannot disagree about a run. Every caller of
// this module runs under tsx or Vitest, which load the TypeScript import.
//
// `caches` is MEASURED, not assumed. Two identical calls per model:
//   sonnet  pass 1 cacheWrite=1215, pass 2 cacheRead=1215  -> caching engages
//   haiku   pass 1 cacheWrite=0,    pass 2 cacheRead=0     -> inert
// The instruction block is ~1,285 estimated tokens (1,215 as billed), under Haiku's
// minimum cacheable prompt length, so its `cache_control` does nothing there.
import { batchRates } from "../../src/lib/model/prices.ts";

/** @typedef {"haiku" | "sonnet" | "sonnet5"} ModelKey */

/** @type {Record<ModelKey, {in:number,out:number,cacheWrite:number,cacheRead:number,caches:boolean}>} */
export const PRICING = {
  haiku: { ...batchRates("claude-haiku-4-5"), caches: false },
  sonnet: { ...batchRates("claude-sonnet-4-5"), caches: true },
  // Sonnet 5 at $2/$10 per million standard, halved by the Batch API, and
  // `card-labels-pricing.test.mts` holds it to the eval harness's table. It was 4.5's
  // $3/$15 here until review caught it, which UNDERSTATED the cap: the reservation is
  // computed from this row, so an opt-in run could be approved below its real ceiling.
  sonnet5: { ...batchRates("claude-sonnet-5"), caches: true },
};

/**
 * No row here is a BILL. The cost and usage endpoints need an Admin API key this script
 * does not have (measured: both answer 401), so every dollar figure is derived from
 * published rates and measured tokens — the tokens are exact and the dollars are arithmetic
 * over a rate table. That holds for all three models equally; it is not a Sonnet 5 caveat.
 *
 * This block used to say Sonnet 5 was priced at 4.5's rates and that its rates were
 * unverified. Both were true of the code and neither should have been: the verified rates
 * were already in this repository, at `scripts/eval/lib/pricing.mts`.
 */
/**
 * The models a DEFAULT run submits. `sonnet5` is deliberately NOT here — but the reason is
 * SPEND, not pricing. It is a third model on every ordinary run, so including it would
 * charge a comparison nobody asked for against the same $5 cap. It is opt-in through
 * `LABEL_MODELS=sonnet5`, which is how the comparison run was made.
 */
/** @type {Partial<Record<ModelKey, string>>} */
export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5",
};

/**
 * Every model the runner CAN submit, including opt-in ones.
 *
 * THIS is the declaration that has to be exhaustive, and the annotation was on `MODELS`
 * — which is deliberately a subset, so the annotation was false there and absent here.
 * Nothing tied `ALL_MODELS`'s keys to `PRICING`, so adding an opt-in model and
 * forgetting its rates would die at runtime in the preflight on `PRICING[m].caches`.
 *
 * Note it cannot be ENFORCED from here: `checkJs` is off, so no `.mjs` in this
 * repository is type-checked and these annotations are documentation that editors read.
 * `assertPriced` below is the runtime half, which is what actually holds.
 */
/** @type {Record<ModelKey, string>} */
export const ALL_MODELS = {
  ...MODELS,
  sonnet5: "claude-sonnet-5",
};

/**
 * Every submittable model must be priced, checked AT IMPORT rather than annotated.
 *
 * `checkJs` is off, so the `@type` annotations above are documentation an editor reads
 * and nothing a build enforces. Without this, adding a model to `ALL_MODELS` and
 * forgetting its rates typechecks, passes every test, and dies mid-run in the preflight
 * on `PRICING[m].caches` — after the caller has already decided to spend money.
 */
const unpriced = Object.keys(ALL_MODELS).filter((m) => !PRICING[m]);
if (unpriced.length > 0) {
  throw new Error(`ALL_MODELS names a model with no PRICING entry: ${unpriced.join(", ")}`);
}

/**
 * Dollars for one model's usage. Absent terms are zero.
 * @param {ModelKey} model
 * @param {{i?:number,cr?:number,o?:number,cw?:number}} usage
 */
export const costOf = (model, { i = 0, cr = 0, o = 0, cw = 0 }) => {
  const p = PRICING[model];
  if (!p) throw new Error(`no PRICING entry for model "${model}"`);
  return (i * p.in + cr * p.cacheRead + o * p.out + cw * p.cacheWrite) / 1e6;
};
