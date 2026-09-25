/**
 * Whether this deployment runs Locked (never cut): the lock mark, the mode, the action, and every
 * filter that reads a lock (Hugh's release ruling, 2026-09-24: each feature ships behind its own
 * switch, on in staging and off in production until he walks it).
 *
 * The FILTERS are gated too, not only the surfaces. A lock row written on staging must not change
 * what production's tuning or sweeps do while the switch there is off.
 *
 * The same shape as `swapToolsEnabled`: server-side, read per request, and OFF for anything but
 * the exact string `'true'`. Changing it on Vercel needs a redeploy.
 */
export function neverCutEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NEVER_CUT_ENABLED === "true";
}
