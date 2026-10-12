/**
 * `SOCIAL_FRIENDS_ENABLED`: friends, invites and pods (plan `boards/plan-social-foundation-2026-10-12.md`).
 * `'true'` on staging, unset on production until Hugh walks it. Exactly `'true'` turns it on. The
 * foundation ships dark: no route or action reads it yet, and the first UI PR gates on it.
 */
export function socialFriendsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SOCIAL_FRIENDS_ENABLED === "true";
}
