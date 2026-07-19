// Pure helpers for export dialog — filename assembly + text assembly.
// Tested in export-helpers.test.ts.

/**
 * Assemble the decklist text copied / downloaded — spec format (#8): commander
 * first, then `N Card Name` lines, Moxfield/Archidekt-ready. The dialog's
 * preview header/separator are presentational only and never part of this text.
 */
export function buildDecklistText(args: {
  commanderName: string;
  /** Body cards — commander excluded */
  cards: { name: string; quantity: number }[];
}): string {
  const { commanderName, cards } = args;
  const lines = [`1 ${commanderName}`, ...cards.map((c) => `${c.quantity} ${c.name}`)];
  return lines.join("\n");
}

/**
 * Assemble the shopping list text: names only, one per line.
 */
export function buildShoppingText(cards: { name: string }[]): string {
  return cards.map((c) => c.name).join("\n");
}

/** Deck names are user-controlled — strip path separators, OS-reserved and control characters. */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\/\\:*?"<>|\u0000-\u001F]/g, "-")
    .trim()
    // Windows also rejects trailing dots/spaces and reserved names "." / "..".
    .replace(/[. ]+$/, "");
  return cleaned.length > 0 ? cleaned : "deck";
}

/**
 * Filename for the decklist download.
 */
export function decklistFilename(deckName: string): string {
  return `${sanitizeFilename(deckName)}.txt`;
}

/**
 * Filename for the shopping list download.
 */
export function shoppingFilename(deckName: string): string {
  return `${sanitizeFilename(deckName)} — shopping.txt`;
}
