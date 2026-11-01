/**
 * Home's news feed (menu and Home, plan `2026-10-22-menu-home.md`): What's new, the lead story, the badges, Settings'
 * news section. Always on (the `HOME_FEED_ENABLED` switch is retired). Every caller passes the reader's resolved env
 * (`requestSwitchEnv`).
 */
import { announcementsEnabled } from "../announcements/flag";
import { FEED_KINDS, type FeedKind } from "./kinds";

/**
 * Whether a kind can be offered and read for this reader, the feed itself aside: a price drop is always available (the wishlist's switch is retired); a trade match and a spare request are always
 * available too (`SOCIAL_FRIENDS_ENABLED` is retired); Wizards' announcements need `ANNOUNCEMENTS_ENABLED`, all three kinds alike. A kind that is not available is
 * neither offered in Settings nor read, nor pushed (`catalogPushKinds` and the flush's `stillWanted` read this set),
 * though a reader's choice for it is kept.
 */
export function feedKindAvailable(kind: FeedKind, env: NodeJS.ProcessEnv): boolean {
  switch (kind) {
    case "new-set":
    case "combo":
    case "new-precon":
    case "price-drop":
    case "trade-match":
    case "spare-request":
      return true;
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
