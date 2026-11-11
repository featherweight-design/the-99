// A reader as the About pages' tests need them: what the retired entry catalog would have written to `about_seen_ids` for
// someone who visited About at a given floor (frozen from the catalog when it was deleted, About deprecation PR 5).
import type { AboutLineSwitch, AboutSwitch } from "@/lib/copy/about";
import { lineKept, type SeenState } from "@/lib/about/visible";

/** Each catalog entry that carried a switch or a variant: its `since`, its switch, and its variant's switch. */
const SWITCHED_ENTRIES: readonly { id: string; since: number; switch: AboutSwitch | null; variant: AboutSwitch | null }[] = [
  { id: "collection-add", since: 12, switch: "COLLECTION_EDIT_ENABLED", variant: null },
  { id: "card-scan", since: 16, switch: "CARD_SCAN_ENABLED", variant: null },
  { id: "start-without-a-collection", since: 14, switch: "NO_COLLECTION_ENTRY_ENABLED", variant: null },
  { id: "upload-choice", since: 12, switch: "COLLECTION_EDIT_ENABLED", variant: "COLLECTION_SYNC_ENABLED" },
  { id: "all-decks-cart", since: 14, switch: "ALL_DECKS_CART_ENABLED", variant: null },
  { id: "added-copy", since: 14, switch: "ADDED_COPY_ENABLED", variant: null },
  { id: "card-search", since: 16, switch: "CARD_SEARCH_ENABLED", variant: null },
  { id: "edit-copies", since: 12, switch: "COLLECTION_EDIT_ENABLED", variant: null },
  { id: "remove-card", since: 12, switch: "COLLECTION_EDIT_ENABLED", variant: null },
  { id: "collection-history", since: 12, switch: "COLLECTION_EDIT_ENABLED", variant: null },
  { id: "wishlist", since: 14, switch: "SOCIAL_WISHLIST_ENABLED", variant: null },
  { id: "whats-new", since: 16, switch: "HOME_FEED_ENABLED", variant: null },
  { id: "help-me-choose", since: 9, switch: "HELP_ME_CHOOSE_ENABLED", variant: null },
  { id: "deck-analysis", since: 9, switch: "ANALYSIS_TAB_ENABLED", variant: null },
  { id: "deck-benchmarks", since: 13, switch: "DECK_BENCHMARKS_ENABLED", variant: null },
  { id: "combos-one-away", since: 16, switch: "NEAR_COMBOS_ENABLED", variant: null },
  { id: "card-marks", since: 9, switch: "ANALYSIS_TAB_ENABLED", variant: null },
  { id: "locked-cards", since: 9, switch: "NEVER_CUT_ENABLED", variant: null },
  { id: "fits-your-decks", since: 9, switch: "SWAP_TOOLS_ENABLED", variant: null },
  { id: "find-a-deck-read", since: 14, switch: "FIND_A_DECK_READ_ENABLED", variant: null },
  { id: "deck-tokens", since: 14, switch: "DECK_TOKENS_ENABLED", variant: null },
  { id: "stand-ins", since: 9, switch: "SWAP_TOOLS_ENABLED", variant: null },
  { id: "friend-spares", since: 14, switch: "SOCIAL_FRIENDS_ENABLED", variant: "SPARE_REQUESTS_ENABLED" },
  { id: "shopping-got-it", since: 14, switch: "SHOPPING_MARK_BOUGHT_ENABLED", variant: null },
  { id: "precons", since: 14, switch: "PRECONS_ENABLED", variant: null },
  { id: "upcoming-precons", since: 14, switch: "UPCOMING_PRECONS_ENABLED", variant: null },
  { id: "change-commander", since: 9, switch: "CHANGE_COMMANDER_ENABLED", variant: null },
  { id: "deck-printings", since: 14, switch: "DECK_PRINTINGS_ENABLED", variant: null },
  { id: "friends", since: 14, switch: "SOCIAL_FRIENDS_ENABLED", variant: null },
  { id: "friend-decks", since: 16, switch: "FRIEND_DECKS_ENABLED", variant: null },
  { id: "invites", since: 16, switch: "SOCIAL_INVITES_ENABLED", variant: null },
  { id: "rule-zero", since: 16, switch: "RULE_ZERO_ENABLED", variant: null },
  { id: "opponents", since: 14, switch: "SOCIAL_GAMES_ENABLED", variant: null },
  { id: "suggested-changes", since: 10, switch: "TUNING_ENABLED", variant: null },
  { id: "proposed-cuts", since: 14, switch: "PROPOSED_CUTS_ENABLED", variant: null },
  { id: "mana-balance", since: 14, switch: "MANA_BALANCE_ENABLED", variant: null },
  { id: "deck-focus", since: 16, switch: "STRATEGY_FOCUS_ENABLED", variant: null },
  { id: "deck-stats", since: 11, switch: "DECK_STATS_ENABLED", variant: null },
  { id: "decks-stats", since: 14, switch: "LINEUP_ENABLED", variant: null },
  { id: "notes", since: 14, switch: "DECK_NOTES_ENABLED", variant: null },
  { id: "buying-credits", since: 16, switch: "PAYMENTS_ENABLED", variant: null },
  { id: "getting-help", since: 16, switch: "HELP_PANEL_ENABLED", variant: null },
  { id: "push", since: 16, switch: "PUSH_ENABLED", variant: null },
];

/** What a reader at `floor` who visited About under `env` was written: the floor, and the id of every switched entry
 *  (and entry variant) that was drawn to them by then. */
export function readerAt(floor: number, env: NodeJS.ProcessEnv): SeenState {
  const ids = SWITCHED_ENTRIES.filter((e) => e.since <= floor && (e.switch === null || lineKept(e.switch as AboutLineSwitch, env))).flatMap((e) => [
    ...(e.switch ? [e.id] : []),
    ...(e.variant && lineKept(e.variant as AboutLineSwitch, env) ? [`${e.id}@${e.variant}`] : []),
  ]);
  return { version: floor, ids };
}
