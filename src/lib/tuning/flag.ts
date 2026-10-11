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

/**
 * Whether this deployment draws the Tuning hub: the `Tuning` section on the Analysis tab, with a
 * tile for each tool and the tools opening in place (tuning hub handoff R1, canvas A), plus the
 * trim line's `Proposed cuts →` shortcut. The same shape as the switches above, and OFF for
 * anything but the exact string `'true'`. Off, the Analysis tab mounts Suggested changes and
 * Proposed cuts directly, exactly as before the hub. On, a tile draws only for a tool whose own
 * switch is on, so the hub never offers a tool this deployment does not.
 */
export function tuningHubEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TUNING_HUB_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}
