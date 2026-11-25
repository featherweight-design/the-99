/**
 * The tool discovery events (plan §6, handoff G21): each event's properties, every one a closed set. No query text,
 * typed card name or reader name can reach a property, because no property is typed `string`
 * (`tool-events.test.ts` fails the build on one). Sent by `captureToolEvent` (`posthog.ts`).
 */
import { FEED_KINDS, type FeedKind } from "../feed/kinds";

import type { ToolId } from "../discovery/tools";

/** Where a press that asks for Find a deck came from (counted at the press, before the card arrives): the call-out's Show them, a tile's button, a phone row's strip, a desktop row's button, the card window's door, or an Ask answer in the card search. */
export const FIND_A_DECK_FROM = ["callout_show_them", "tile_button", "row_strip", "row_button", "card_door", "ask", "quick_chip"] as const;
export type FindADeckFrom = (typeof FIND_A_DECK_FROM)[number];

/** Where the Where credits work sheet was opened from: Home's welcome strip (alone, or as the search panel's foot), or the /credits Welcome cell. */
export const WELCOME_WHERE_FROM = ["home_strip", "panel_foot", "credits_cell"] as const;
export type WelcomeWhereFrom = (typeof WELCOME_WHERE_FROM)[number];

/** How many rows a Show all sheet opened on, or a Clear all cleared: a bucket, never the count. */
export const FEED_COUNT_BUCKET = ["1_to_5", "6_to_10", "11_to_20", "21_plus"] as const;
export type FeedCountBucket = (typeof FEED_COUNT_BUCKET)[number];
export const feedCountBucket = (n: number): FeedCountBucket => (n <= 5 ? "1_to_5" : n <= 10 ? "6_to_10" : n <= 20 ? "11_to_20" : "21_plus");
/** How the Tuning tab was reached (B2): a press of the tab row, or an arrival by a URL or landing that named it. Ways in
 *  from inside the deck page (a strip cell, a nudge, the Games link) are not discovery and are not counted. A welcome
 *  sheet's Try it lands by URL and counts as `url`; README's `ask` waits on D. */
export const TUNING_OPENED_FROM = ["tab", "url"] as const;
export type TuningOpenedFrom = (typeof TUNING_OPENED_FROM)[number];
/** The tool the Tuning tab opened on, or `hub` for the tab's tile grid (README's null, kept a closed-set string). The
 *  set is README's; B2 sends `hub` and `consider` (the retired `?tab=consider`), and the other tools wait on a way in that names them. */
export const TUNING_OPENED_TOOL = ["hub", "consider", "suggested", "mana", "cuts", "history"] as const;
export type TuningOpenedTool = (typeof TUNING_OPENED_TOOL)[number];
/** Ask in the card search (D): where the search was opened from, where an answer was pressed, and the shape of a query, never its text. */
export const SEARCH_OPENED_FROM = ["rail", "header", "cmdk", "home_field", "home_starter"] as const;
export const ASK_PRESSED_FROM = ["desktop", "phone_sheet", "home_inline"] as const;
export const ASK_WORDS = ["1", "2", "3+"] as const;
export const ASK_COUNT = ["0", "1", "2", "3"] as const;
export const ASK_CARDS = ["none", "some"] as const;
export const ASK_RANK = ["1", "2", "3"] as const;
/** Which place in the deck picker a press chose (R12 PR B), or `none` for a tool pressed with no picker: a place, never a deck. */
export const ASK_PICKED = ["none", "1", "2", "3+"] as const;
export const askPicked = (index: number): (typeof ASK_PICKED)[number] => (index <= 0 ? "1" : index === 1 ? "2" : "3+");
/** Every tool's id, the closed set an Ask event names a tool from. */
export const ASK_TOOL_IDS = [
  "help-me-choose", "precons", "top-off", "proposed-cuts", "suggested-changes", "mana-balance", "stand-ins",
  "friend-spares", "find-a-deck", "wishlist", "collection-sync", "matchups", "lineup", "friends",
] as const satisfies readonly ToolId[];
// Written out rather than read off the registry: this module is in Home's startup graph, which keeps the registry (and the
// Tuning copy it imports) out. A tool added to the registry and missing here fails this line.
const everyToolId: Exclude<ToolId, (typeof ASK_TOOL_IDS)[number]> extends never ? true : never = true;
void everyToolId;

export type ToolEvents = {
  find_a_deck_opened: { from: FindADeckFrom };
  welcome_where_opened: { from: WelcomeWhereFrom };
  /** The Show all sheet opens (What's new, G20). */
  feed_show_all: { count: FeedCountBucket };
  /** A kind chip is pressed in the sheet. */
  feed_sheet_filter: { kind: FeedKind };
  /** Clear all in the sheet: how many it cleared, and whether a chip had narrowed it. */
  feed_sheet_clear: { count: FeedCountBucket; filtered: "all" | "kind" };
  tuning_opened: { from: TuningOpenedFrom; tool: TuningOpenedTool };
  search_opened: { from: (typeof SEARCH_OPENED_FROM)[number] };
  /** Once per settled query: how many tools answered (and the best), whether card names matched, how many words. */
  ask_result: { count: (typeof ASK_COUNT)[number]; first: ToolId | "none"; cards: (typeof ASK_CARDS)[number]; words: (typeof ASK_WORDS)[number] };
  /** A query of two or more words that matched no tool and no card. */
  ask_miss: { words: (typeof ASK_WORDS)[number] };
  ask_tool_pressed: { tool: ToolId; from: (typeof ASK_PRESSED_FROM)[number]; rank: (typeof ASK_RANK)[number]; picked: (typeof ASK_PICKED)[number] };
};

/** Each event's closed sets, property by property: what the guard test checks a built event against. */
export const TOOL_EVENT_VALUES: { [E in keyof ToolEvents]: { [P in keyof ToolEvents[E]]: readonly ToolEvents[E][P][] } } = {
  find_a_deck_opened: { from: FIND_A_DECK_FROM },
  welcome_where_opened: { from: WELCOME_WHERE_FROM },
  feed_show_all: { count: FEED_COUNT_BUCKET },
  feed_sheet_filter: { kind: FEED_KINDS },
  feed_sheet_clear: { count: FEED_COUNT_BUCKET, filtered: ["all", "kind"] },
  tuning_opened: { from: TUNING_OPENED_FROM, tool: TUNING_OPENED_TOOL },
  search_opened: { from: SEARCH_OPENED_FROM },
  ask_result: { count: ASK_COUNT, first: [...ASK_TOOL_IDS, "none"], cards: ASK_CARDS, words: ASK_WORDS },
  ask_miss: { words: ASK_WORDS },
  ask_tool_pressed: { tool: ASK_TOOL_IDS, from: ASK_PRESSED_FROM, rank: ASK_RANK, picked: ASK_PICKED },
};
