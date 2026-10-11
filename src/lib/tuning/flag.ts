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
 * Whether this deployment offers Proposed cuts' model pass (Look deeper on a deck over 100): the
 * server actions that run and stop it, and the reads behind them. The same shape as
 * `tuningEnabled`, and OFF for anything but the exact string `'true'`. It needs the Analysis tab
 * for the same reason Suggested changes does (the panel mounts there, over a reading), so it reads
 * true only when BOTH `PROPOSED_CUTS_ENABLED` and `ANALYSIS_TAB_ENABLED` are `'true'`. Independent
 * of `TUNING_ENABLED`: a deployment can ship either tool without the other.
 */
export function proposedCutsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PROPOSED_CUTS_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}

/**
 * Whether this deployment offers Mana Balance (tier 1, free): the counted read of a deck's colors
 * and its suggestions. The same shape as `proposedCutsEnabled`: server-side, per request, OFF for
 * anything but the exact string `'true'`, and it needs the Analysis tab, where the tool mounts.
 * Independent of `TUNING_ENABLED` and `PROPOSED_CUTS_ENABLED`. It gates the surface and not a
 * spend: tier 1 makes no model call.
 */
export function manaBalanceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MANA_BALANCE_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}

/** A Tuning tool the hub can draw a tile for, in the hub's fixed order. */
export type HubTool = "suggested" | "mana" | "cuts";

/**
 * The tools the Tuning hub would draw, read from each tool's own switch: no switch of its own
 * (orchestrator, 2026-10-11). Each of these already needs the Analysis tab.
 */
export function hubTools(env: NodeJS.ProcessEnv = process.env): HubTool[] {
  return [
    ...(tuningEnabled(env) ? ["suggested" as const] : []),
    ...(manaBalanceEnabled(env) ? ["mana" as const] : []),
    ...(proposedCutsEnabled(env) ? ["cuts" as const] : []),
  ];
}

/**
 * Whether the Analysis tab draws the Tuning hub: the `Tuning` section with a tile per tool, the
 * tools opening in place (tuning hub handoff R1, canvas A), and the trim line's `Proposed cuts →`.
 * Two or more tools on draws it. Exactly one mounts that tool directly, as before the hub, since a
 * landing with one tile is a step with no choice in it; none leaves the tab as it was.
 */
export function tuningHubEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return hubTools(env).length >= 2;
}
