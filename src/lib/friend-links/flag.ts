/**
 * `FRIEND_LINKS_ENABLED` (Hugh, H4, 2026-11-12): friend links R1, the reusable personal link, its QR and short code,
 * and the friend requests they send. Off, Add a friend keeps the single-use links and nothing new is read or written.
 * Exactly `'true'` turns it on.
 */
export function friendLinksEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.FRIEND_LINKS_ENABLED === "true";
}
