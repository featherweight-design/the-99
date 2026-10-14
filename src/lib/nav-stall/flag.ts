/**
 * The stuck-loader diagnostic (plumbing): while on, a navigation whose loading screen has been up
 * for `STALL_AFTER_MS` sends one report, logged as a `[nav-stall]` line. It changes nothing a
 * reader sees.
 */
export function navStallLogEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NAV_STALL_LOG_ENABLED === "true";
}
