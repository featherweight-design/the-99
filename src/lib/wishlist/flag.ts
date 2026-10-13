/**
 * `SOCIAL_WISHLIST_ENABLED`: the wishlist (scope §2, Hugh's rulings Q7 and Q9, 2026-10-12). `'true'` on
 * staging, unset on production until Hugh walks it. Exactly `'true'` turns it on. It stands alone, never
 * requiring `SOCIAL_FRIENDS_ENABLED`: a wishlist is useful without friends. The backend ships dark: no
 * route or action reads it yet, and the first wishlist UI PR gates on it.
 */
export function wishlistEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SOCIAL_WISHLIST_ENABLED === "true";
}
