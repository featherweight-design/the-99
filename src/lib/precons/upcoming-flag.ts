import { preconsEnabled } from "./flag";

/**
 * `UPCOMING_PRECONS_ENABLED`: the Announced group on Precons and the arrivals banner on Home (plan
 * `2026-10-14-upcoming-precons.md`). Both live under Precons, so it needs `PRECONS_ENABLED` as well.
 * Exactly `'true'` turns it on.
 */
export function upcomingPreconsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.UPCOMING_PRECONS_ENABLED === "true" && preconsEnabled(env);
}
