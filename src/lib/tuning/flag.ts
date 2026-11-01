import { analysisTabEnabled } from "../decks/analysis-flag";

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
export function tuningEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.TUNING_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}

/**
 * Whether a Suggested changes press may take the v2 run (plan 2026-10-27, P5, approved by Hugh): the count, the
 * request box, line-by-line saves and `suggested_changes_v2`'s own credit. Off, a v2 request is refused before
 * anything is reserved and the panel is v10 as shipped. The same shape as `tuningEnabled`, OFF for anything but the
 * exact string `'true'`, and it needs Suggested changes itself (and so the Analysis tab). Staging on, production
 * unset; the switch is REMOVED once v2 is everywhere.
 */
export function suggestedChangesV2Enabled(env: NodeJS.ProcessEnv): boolean {
  return env.SUGGESTED_CHANGES_V2_ENABLED === "true" && tuningEnabled(env);
}

/**
 * RETIRED (Hugh 2026-10-31): nothing gates on this any more. Proposed cuts (its panel, and the
 * model pass behind Look deeper on a deck over 100) follows its parent, the Analysis tab, where it
 * mounts: every caller reads `analysisTabEnabled`. Only the admin registry reads this, until the
 * switch is deleted. It once read true only when BOTH `PROPOSED_CUTS_ENABLED` and
 * `ANALYSIS_TAB_ENABLED` were `'true'`.
 */
export function proposedCutsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PROPOSED_CUTS_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}

/** A Tuning tool the hub can draw a tile for, in the hub's fixed order. */
export type HubTool = "suggested" | "mana" | "cuts";

/**
 * The tools the Tuning hub would draw, read from each tool's own switch: no switch of its own
 * (orchestrator, 2026-10-11). Each of these already needs the Analysis tab. Mana Balance and Proposed
 * cuts have no switch of their own (Proposed cuts' retired 2026-10-31), so both are tools whenever the
 * Analysis tab is on, and the hub draws wherever the tab does.
 */
export function hubTools(env: NodeJS.ProcessEnv): HubTool[] {
  return [
    ...(tuningEnabled(env) ? ["suggested" as const] : []),
    ...(analysisTabEnabled(env) ? ["mana" as const] : []),
    ...(analysisTabEnabled(env) ? ["cuts" as const] : []),
  ];
}

/**
 * Whether the Analysis tab draws the Tuning hub: the `Tuning` section with a tile per tool, the
 * tools opening in place (tuning hub handoff R1, canvas A), and the trim line's `Proposed cuts →`.
 * Two or more tools on draws it. `hubTools` returns Mana Balance and Proposed cuts together whenever
 * the Analysis tab is on, so the hub draws wherever the tab does; with the tab off, no tool is on.
 */
export function tuningHubEnabled(env: NodeJS.ProcessEnv): boolean {
  return hubTools(env).length >= 2;
}
