/**
 * The card-scan lab (plumbing, staging only): a camera page that runs the scanning spike's
 * pipeline on the device and records whether each guess was right. It exists to measure the
 * pipeline on real phone photos (`docs/superpowers/research/2026-10-15-card-scan-feasibility.md`)
 * and is never drawn in the app's navigation.
 */
export function scanLabEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SCAN_LAB_ENABLED === "true";
}
