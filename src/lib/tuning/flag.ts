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

/**
 * Whether this deployment computes Proposed cuts (tuning roadmap, sub-project 4): the tier-1 cut
 * shortlist for a deck over 100 cards. Logic only until the Tuning hub mounts it. It lives inside
 * Analysis (ruling 2), so it is on only when `PROPOSED_CUTS_ENABLED` AND `ANALYSIS_TAB_ENABLED`
 * are both the exact string `'true'`, the same shape as `tuningEnabled`.
 */
export function proposedCutsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PROPOSED_CUTS_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}
