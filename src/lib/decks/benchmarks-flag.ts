/**
 * Whether this deployment grades a reading's evidence benchmarks (plan
 * `2026-10-10-evidence-benchmarks.md`). Server-side, like `analysisTabEnabled`, and off unless the
 * value is exactly `'true'`. Off means NOT COMPUTED: no read is made and no block is drawn.
 */
export function deckBenchmarksEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DECK_BENCHMARKS_ENABLED === "true";
}
