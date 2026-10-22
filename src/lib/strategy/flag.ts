/**
 * Whether this deployment reads a deck's top strategies and offers lean-in (brief
 * `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md`). The same shape as `manaBalanceEnabled`: server-side,
 * per request, OFF for anything but the exact string `'true'`, and it needs the Analysis tab, where the radar will
 * mount. It gates a surface, not a spend: neither the scores nor lean-in makes a model call.
 */
export function strategyFocusEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.STRATEGY_FOCUS_ENABLED === "true" && env.ANALYSIS_TAB_ENABLED === "true";
}
