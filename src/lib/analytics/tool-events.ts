/**
 * The tool discovery events (plan §6, handoff G21): each event's properties, every one a closed set. No query text,
 * typed card name or reader name can reach a property, because no property is typed `string`
 * (`tool-events.test.ts` fails the build on one). Sent by `captureToolEvent` (`posthog.ts`).
 */

/** Where a press that asks for Find a deck came from (counted at the press, before the card arrives): the call-out's Show them, a tile's button, a phone row's strip, a desktop row's button, or the card window's door. */
export const FIND_A_DECK_FROM = ["callout_show_them", "tile_button", "row_strip", "row_button", "card_door"] as const;
export type FindADeckFrom = (typeof FIND_A_DECK_FROM)[number];

export type ToolEvents = {
  find_a_deck_opened: { from: FindADeckFrom };
};

/** Each event's closed sets, property by property: what the guard test checks a built event against. */
export const TOOL_EVENT_VALUES: { [E in keyof ToolEvents]: { [P in keyof ToolEvents[E]]: readonly ToolEvents[E][P][] } } = {
  find_a_deck_opened: { from: FIND_A_DECK_FROM },
};
