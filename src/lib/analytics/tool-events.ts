/**
 * The tool discovery events (plan §6, handoff G21): each event's properties, every one a closed set. No query text,
 * typed card name or reader name can reach a property, because no property is typed `string`
 * (`tool-events.test.ts` fails the build on one). Sent by `captureToolEvent` (`posthog.ts`).
 */
import { FEED_KINDS, type FeedKind } from "../feed/kinds";

/** Where a press that asks for Find a deck came from (counted at the press, before the card arrives): the call-out's Show them, a tile's button, a phone row's strip, a desktop row's button, or the card window's door. */
export const FIND_A_DECK_FROM = ["callout_show_them", "tile_button", "row_strip", "row_button", "card_door"] as const;
export type FindADeckFrom = (typeof FIND_A_DECK_FROM)[number];

/** Where the Where credits work sheet was opened from: Home's welcome strip, or the /credits Welcome cell. */
export const WELCOME_WHERE_FROM = ["home_strip", "credits_cell"] as const;
export type WelcomeWhereFrom = (typeof WELCOME_WHERE_FROM)[number];

/** How many rows a Show all sheet opened on, or a Clear all cleared: a bucket, never the count. */
export const FEED_COUNT_BUCKET = ["1_to_5", "6_to_10", "11_to_20", "21_plus"] as const;
export type FeedCountBucket = (typeof FEED_COUNT_BUCKET)[number];
export const feedCountBucket = (n: number): FeedCountBucket => (n <= 5 ? "1_to_5" : n <= 10 ? "6_to_10" : n <= 20 ? "11_to_20" : "21_plus");
/** Where the Tuning tab or one of its tools was opened from (B2): the tab row, or a URL or landing that named it. `ask` and `welcome_sheet` arrive with D and C. */
export const TUNING_OPENED_FROM = ["tab", "url"] as const;
export type TuningOpenedFrom = (typeof TUNING_OPENED_FROM)[number];
/** The tool the Tuning tab opened on, or `hub` for the tab's tile grid (README's null, kept a closed-set string). */
export const TUNING_OPENED_TOOL = ["hub", "consider", "suggested", "mana", "cuts", "history"] as const;
export type TuningOpenedTool = (typeof TUNING_OPENED_TOOL)[number];

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
};

/** Each event's closed sets, property by property: what the guard test checks a built event against. */
export const TOOL_EVENT_VALUES: { [E in keyof ToolEvents]: { [P in keyof ToolEvents[E]]: readonly ToolEvents[E][P][] } } = {
  find_a_deck_opened: { from: FIND_A_DECK_FROM },
  welcome_where_opened: { from: WELCOME_WHERE_FROM },
  feed_show_all: { count: FEED_COUNT_BUCKET },
  feed_sheet_filter: { kind: FEED_KINDS },
  feed_sheet_clear: { count: FEED_COUNT_BUCKET, filtered: ["all", "kind"] },
  tuning_opened: { from: TUNING_OPENED_FROM, tool: TUNING_OPENED_TOOL },
};
