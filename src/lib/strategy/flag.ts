/**
 * Whether this deployment reads a deck's top strategies and lets a player pick its focus (handoff
 * `design/design_handoff_the99_strategy_focus/`). The same shape as `manaBalanceEnabled`: server-side, per request, OFF
 * for anything but the exact string `'true'`, and it needs the Analysis tab, where the ring mounts. It gates a surface,
 * not a spend: neither the scores nor the pick makes a model call.
 */
export function strategyFocusEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.STRATEGY_FOCUS_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}
