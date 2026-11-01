/**
 * RETIRED (Hugh 2026-11-01): nothing gates on this any more. The deck page's Analysis tab (the bracket read, the
 * Overview, the strategy block, the Tuning hub with Suggested changes, Mana Balance and Proposed cuts) always draws.
 * Its paid runs (the Overview, Suggested changes, Proposed cuts) still reserve through `reserveModelCall`, so the
 * model-call kill switch (`MODEL_CALLS_ENABLED`) stops them. Only the admin registry reads this, until the switch is
 * deleted. It read true only for the exact string `'true'`.
 */
export function analysisTabEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.ANALYSIS_TAB_ENABLED === "true";
}
