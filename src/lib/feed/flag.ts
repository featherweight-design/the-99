/**
 * `HOME_FEED_ENABLED`: Home's news feed (menu and Home, plan `2026-10-22-menu-home.md`): What's new, the lead
 * story, the badges, Settings' news section. Unset on production until the line closes. Exactly `'true'` turns it
 * on. Every caller passes the reader's resolved env (`requestSwitchEnv`).
 */
import { socialFriendsEnabled } from "../social/flag";
import { wishlistEnabled } from "../wishlist/flag";
import { FEED_KINDS, type FeedKind } from "./kinds";

export function homeFeedEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.HOME_FEED_ENABLED === "true";
}

/**
 * Whether a kind can be offered and read for this reader, the feed itself aside: a price drop is about the
 * wishlist; a trade match needs friends and the wishlist; a spare request ships with its own flow (G5, a later
 * round) and is never available yet. A kind that is not available is neither offered in Settings nor read,
 * though a reader's choice for it is kept.
 */
export function feedKindAvailable(kind: FeedKind, env: NodeJS.ProcessEnv): boolean {
  switch (kind) {
    case "new-set":
    case "new-precon":
    case "combo":
      return true;
    case "price-drop":
      return wishlistEnabled(env);
    case "trade-match":
      return socialFriendsEnabled(env) && wishlistEnabled(env);
    case "spare-request":
      return false;
  }
}

/** The kinds available to this reader, in `FEED_KINDS` order; none while the feed itself is off. */
export function availableFeedKinds(env: NodeJS.ProcessEnv): FeedKind[] {
  if (!homeFeedEnabled(env)) return [];
  return FEED_KINDS.filter((k) => feedKindAvailable(k, env));
}
