/**
 * "A card you can put in a deck", as opposed to the other cardboard Scryfall catalogs.
 *
 * Scryfall's oracle bulk holds objects that are not Magic cards in any game this app models:
 * Jumpstart and Secret Lair FRONT cards named for a theme ("Lands", "Artifacts", "Cats"),
 * Planechase planes, Archenemy schemes, Vanguard avatars, Unstable hosts and augments, and a
 * handful of `normal` objects whose whole type line is `Card` (the Experience and Poison
 * counters, "Red Mana"), and Unfinity's sticker sheets, which are commander-legal on Scryfall but
 * never one of the 99. The ingest used to skip only tokens, emblems and art series, so the
 * rest reached `cards`, and a pasted section header then resolved to one by exact name: "Lands"
 * sat in a deck as a card (Hugh's staging walk, 2026-09-25).
 *
 * Read from the layout, and from the type line for the `normal` ones, never from a name list.
 * It is NOT `commander_legal`: a banned card is a real card a player can own and import, and the
 * legality notice exists to say so. Pure, with no database import, because the ingest transforms
 * read it too.
 */

/**
 * Layouts that are skipped outright and REPORTED as skipped: an upload row whose Scryfall id is
 * one of these says "token", not "unmatched" (§9.1). Kept apart from the rest because that
 * report is a promise about what the row is.
 */
export const TOKEN_LAYOUTS: ReadonlySet<string> = new Set([
  "token",
  "double_faced_token",
  "emblem",
  "art_series",
]);

/**
 * Every layout that is not a card. The ones past the token layouts read as UNRESOLVED on every
 * import path, so the player is asked what they meant rather than told it was a token.
 */
export const NON_GAME_LAYOUTS: ReadonlySet<string> = new Set([
  ...TOKEN_LAYOUTS,
  "front_card",
  "planar",
  "scheme",
  "vanguard",
  "host",
  "augment",
]);

/**
 * Type lines of `normal` objects that are not cards: Scryfall's bare `Card` and its two-faced
 * form, and `Stickers` (Hugh, 2026-09-25: a sticker sheet is never one of the 99, so it is
 * neither matched nor offered). Compared whole, never as a prefix.
 */
export const NON_GAME_TYPE_LINES: ReadonlySet<string> = new Set(["Card", "Card // Card", "Stickers"]);

export function isGameCard(card: { layout: string | null; typeLine: string | null }): boolean {
  if (card.layout !== null && NON_GAME_LAYOUTS.has(card.layout)) return false;
  if (card.typeLine !== null && NON_GAME_TYPE_LINES.has(card.typeLine.trim())) return false;
  return true;
}
