/**
 * `SOCIAL_FRIENDS_ENABLED`: friends, invites and pods (plan `boards/plan-social-foundation-2026-10-12.md`).
 * `'true'` on staging, unset on production until Hugh walks it. Exactly `'true'` turns it on. The
 * foundation ships dark: no route or action reads it yet, and the first UI PR gates on it.
 */
export function socialFriendsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SOCIAL_FRIENDS_ENABLED === "true";
}

/**
 * `SOCIAL_GAMES_ENABLED`: opponents in the game log (scope §4, Feature C). `'true'` on staging, unset on
 * production until Hugh walks it. It requires `SOCIAL_FRIENDS_ENABLED` (scope §6: every child switch does,
 * except the wishlist), checked here so an override of this one never raises its parent. Dark until its
 * UI PR; the write path that gates on it comes first, in its own PR.
 */
export function socialGamesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SOCIAL_GAMES_ENABLED === "true" && socialFriendsEnabled(env);
}
