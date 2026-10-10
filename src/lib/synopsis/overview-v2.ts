/**
 * Whether this deployment writes the Overview with the v2 method (plan
 * `2026-10-10-overview-accuracy.md`): server-side, never `NEXT_PUBLIC_*`, off unless the
 * variable is exactly `'true'`. A change needs a redeploy, as with every switch here.
 */
export function overviewV2Enabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.OVERVIEW_V2_ENABLED === "true";
}
