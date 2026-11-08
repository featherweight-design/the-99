/**
 * The shared spend switch for the evals that call the model: DRY BY DEFAULT, `--spend` to pay.
 *
 * `eval:tuning-v2` (#2314) set the pattern: a bare run prints its plan and worst case and calls nothing,
 * `--spend` is the only way to send, and `--dry-run` wins over `--spend` when both are given. Thirteen
 * evals had it the other way round (`--dry-run` was opt-in, or there was no dry mode, so a bare run
 * paid), which is how a typo or a copied command line spends. Hugh, 2026-11-08: every eval that calls
 * the real API is dry by default, with its hard cap still checked before each send. Those already dry
 * by default keep their own switch (`--send` on cuts-model, cuts-plan, cuts-blind and fits-read,
 * `--run` on labels-55-compare); `spend-flag.test.mts` lists the scripts that use this one.
 *
 * Spread `SPEND_OPTIONS` into a `parseArgs` `options` block and ask `isDryRun` for the mode, so the
 * rule is written once.
 */
export const SPEND_OPTIONS = {
  "dry-run": { type: "boolean", default: false },
  spend: { type: "boolean", default: false },
} as const;

/** True unless the run asked for `--spend` and did not also ask for `--dry-run`. */
export const isDryRun = (args: { "dry-run"?: boolean; spend?: boolean }): boolean =>
  args["dry-run"] === true || args.spend !== true;
