/**
 * `PRECONS_ENABLED`: Commander precons (plan `2026-10-11-commander-precons.md`). On staging, off in
 * production until Hugh walks it (brief lock 9). Exactly `'true'` turns it on.
 */
export function preconsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PRECONS_ENABLED === "true";
}
