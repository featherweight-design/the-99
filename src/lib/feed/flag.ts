/**
 * Home's news feed (menu and Home, plan `2026-10-22-menu-home.md`): What's new, the lead story, the badges, Settings'
 * news section. Always on (the `HOME_FEED_ENABLED` switch is retired). Every caller passes the reader's resolved env
 * (`requestSwitchEnv`).
 */
import { announcementsEnabled } from "../announcements/flag";
import { socialFriendsEnabled, spareRequestsEnabled } from "../social/flag";
import { wishlistEnabled } from "../wishlist/flag";
import { FEED_KINDS, type FeedKind } from "./kinds";

/**
 * Whether a kind can be offered and read for this reader, the feed itself aside: a price drop is about the wishlist; a trade match needs friends and the wishlist; a spare request needs `SPARE_REQUESTS_ENABLED` (G5), which
 * needs friends; Wizards' announcements need `ANNOUNCEMENTS_ENABLED`, all three kinds alike. A kind that is not available is
 * neither offered in Settings nor read, nor pushed (`catalogPushKinds` and the flush's `stillWanted` read this set),
 * though a reader's choice for it is kept.
 */
export function feedKindAvailable(kind: FeedKind, env: NodeJS.ProcessEnv): boolean {
  switch (kind) {
    case "new-set":
    case "combo":
    case "new-precon":
      return true;
    case "price-drop":
      return wishlistEnabled(env);
    case "trade-match":
      return socialFriendsEnabled(env) && wishlistEnabled(env);
    case "spare-request":
      return spareRequestsEnabled(env);
    case "secret-lair":
    case "commander-decklists":
    case "wizards-news":
      return announcementsEnabled(env);
  }
}

/** The kinds available to this reader, in `FEED_KINDS` order. */
export function availableFeedKinds(env: NodeJS.ProcessEnv): FeedKind[] {
  return FEED_KINDS.filter((k) => feedKindAvailable(k, env));
}
