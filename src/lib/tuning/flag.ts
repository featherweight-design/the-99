/**
 * Whether this deployment draws "Suggested changes" (deck tuning): the empty state's Analyze-time
 * description field, the limits box, Additional notes, and the server actions that run and act
 * on a suggestion. The same shape as `analysisTabEnabled` and `swapToolsEnabled`: server-side,
 * read per request, and OFF for anything but the exact string `'true'`, so production is
 * unaffected until the variable is set deliberately. Changing it on Vercel needs a redeploy.
 *
 * TUNING REQUIRES ANALYSIS. Suggested changes lives on the Analysis tab, over a reading
 * (placement addendum v2): with no tab there is nowhere for it to mount, and nothing reads a
 * profile to suggest swaps against. So this reads true only when BOTH `TUNING_ENABLED` is
 * `'true'` AND `ANALYSIS_TAB_ENABLED` is `'true'` — a deployment can ship the bracket and the
 * Overview with Tuning off, but never Tuning with the tab itself off.
 */
export function tuningEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TUNING_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}
