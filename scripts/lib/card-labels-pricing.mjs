// ONE pricing table, imported by the estimate and by the measurement.
//
// It was duplicated verbatim across `label-cards-run.mts` and
// `label-cards-collect.mjs`, which is the worst place for a copy: a rate changed in
// one leaves the estimate and the measured cost priced differently, and the
// measured figure is what the report's full-run extrapolation rests on.
//
// Per million tokens, BATCH rate (half of standard). Published rates as of
// 2026-09-25.
//
// `caches` is MEASURED, not assumed. Two identical calls per model:
//   sonnet  pass 1 cacheWrite=1215, pass 2 cacheRead=1215  -> caching engages
//   haiku   pass 1 cacheWrite=0,    pass 2 cacheRead=0     -> inert
// The instruction block is ~1,285 estimated tokens (1,215 as billed), under Haiku's
// minimum cacheable prompt length, so its `cache_control` does nothing there.
/** @typedef {"haiku" | "sonnet" | "sonnet5"} ModelKey */

/** @type {Record<ModelKey, {in:number,out:number,cacheWrite:number,cacheRead:number,caches:boolean}>} */
export const PRICING = {
  haiku: { in: 0.50, out: 2.50, cacheWrite: 0.625, cacheRead: 0.05, caches: false },
  sonnet: { in: 1.50, out: 7.50, cacheWrite: 1.875, cacheRead: 0.15, caches: true },
  // Rates UNVERIFIED — see the note above MODELS. Tokens are measured; dollars are a
  // projection at Sonnet 4.5's rates and are labelled as such wherever they appear.
  sonnet5: { in: 1.50, out: 7.50, cacheWrite: 1.875, cacheRead: 0.15, caches: true },
};

/** @type {Record<ModelKey, string>} */
/**
 * `sonnet5` is priced at SONNET 4.5's published rates, and that is an assumption this
 * file cannot discharge: the cost and usage endpoints need an Admin API key, which this
 * script does not have (measured: both answer 401). So the dollar figures for it are a
 * PROJECTION at 4.5's rates, while the TOKEN counts are exact. Any report quoting them
 * has to say which is which.
 */
export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5",
  sonnet5: "claude-sonnet-5",
};

/**
 * Dollars for one model's usage. Absent terms are zero.
 * @param {ModelKey} model
 * @param {{i?:number,cr?:number,o?:number,cw?:number}} usage
 */
export const costOf = (model, { i = 0, cr = 0, o = 0, cw = 0 }) => {
  const p = PRICING[model];
  return (i * p.in + cr * p.cacheRead + o * p.out + cw * p.cacheWrite) / 1e6;
};
