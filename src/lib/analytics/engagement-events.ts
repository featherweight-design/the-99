/**
 * The core action events (engagement tracking, PR 1): what a signed-in reader does with the product, for funnels and
 * retention in PostHog. The single home of the event names and each property's closed set. No property is typed
 * `string`, so no card name, deck name, query, reader name or Clerk id can ride along (`engagement-events.test.ts`
 * fails the build on one). Sent by `captureEngagement` (`posthog.ts`) from the browser, after the server action
 * answered ok; the identity is what `identifyReader` already set, and no new one is added.
 */

export const DECK_CREATED_SOURCE = ["scratch", "precon", "import", "guided"] as const;
export const DECK_CARD_ADDED_VIA = ["search", "suggestion", "combo"] as const;
export const COLLECTION_IMPORTED_VIA = ["csv", "sync"] as const;
/** How many cards an import carried, bucketed: the exact count is never sent. */
export const IMPORT_SIZE_BUCKET = ["1_to_10", "11_to_100", "101_to_1000", "1001_plus"] as const;
export const importSizeBucket = (n: number): (typeof IMPORT_SIZE_BUCKET)[number] =>
  n <= 10 ? "1_to_10" : n <= 100 ? "11_to_100" : n <= 1000 ? "101_to_1000" : "1001_plus";
export const UPGRADE_APPLIED_KIND = ["precon"] as const;

export type EngagementEvents = {
  deck_created: { source: (typeof DECK_CREATED_SOURCE)[number] };
  deck_card_added: { via: (typeof DECK_CARD_ADDED_VIA)[number] };
  deck_game_logged: Record<never, never>;
  collection_imported: { via: (typeof COLLECTION_IMPORTED_VIA)[number]; size: (typeof IMPORT_SIZE_BUCKET)[number] };
  wishlist_added: Record<never, never>;
  upgrade_applied: { kind: (typeof UPGRADE_APPLIED_KIND)[number] };
  friend_invite_created: Record<never, never>;
};

/** Each event's closed sets, property by property: what the guard test checks a built event against. */
export const ENGAGEMENT_EVENT_VALUES: { [E in keyof EngagementEvents]: { [P in keyof EngagementEvents[E]]: readonly EngagementEvents[E][P][] } } = {
  deck_created: { source: DECK_CREATED_SOURCE },
  deck_card_added: { via: DECK_CARD_ADDED_VIA },
  deck_game_logged: {},
  collection_imported: { via: COLLECTION_IMPORTED_VIA, size: IMPORT_SIZE_BUCKET },
  wishlist_added: {},
  upgrade_applied: { kind: UPGRADE_APPLIED_KIND },
  friend_invite_created: {},
};

/**
 * Sends per event name per reader session, the cap that bounds PostHog volume whatever the traffic. One for every
 * event except adds, which a reader makes in runs.
 */
export const ENGAGEMENT_SEND_CEILING: { [E in keyof EngagementEvents]: number } = {
  deck_created: 1,
  deck_card_added: 3,
  deck_game_logged: 1,
  collection_imported: 1,
  wishlist_added: 1,
  upgrade_applied: 1,
  friend_invite_created: 1,
};
