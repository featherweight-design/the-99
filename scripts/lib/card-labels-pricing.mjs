// ONE pricing table, imported by the estimate and by the measurement.
//
// It was duplicated verbatim across `label-cards-run.mjs` and
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
export const PRICING = {
  haiku: { in: 0.50, out: 2.50, cacheWrite: 0.625, cacheRead: 0.05, caches: false },
  sonnet: { in: 1.50, out: 7.50, cacheWrite: 1.875, cacheRead: 0.15, caches: true },
};

export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5",
};

/** Dollars for one model's usage. Absent terms are zero. */
export const costOf = (model, { i = 0, cr = 0, o = 0, cw = 0 }) => {
  const p = PRICING[model];
  return (i * p.in + cr * p.cacheRead + o * p.out + cw * p.cacheWrite) / 1e6;
};
