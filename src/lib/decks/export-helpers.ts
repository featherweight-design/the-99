// Pure helpers for export dialog — filename assembly + text assembly.
// Tested in export-helpers.test.ts.

/**
 * Assemble the full decklist text displayed / copied / downloaded:
 * first line `# ${deckName}`, then commander line, then one line per card.
 */
export function buildDecklistText(args: {
  deckName: string;
  commanderName: string;
  /** Body cards — commander excluded */
  cards: { name: string; quantity: number }[];
}): string {
  const { deckName, commanderName, cards } = args;
  const lines = [`# ${deckName}`, `1 ${commanderName}`, "//", ...cards.map((c) => `${c.quantity} ${c.name}`)];
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
  const cleaned = name.replace(/[\/\\:*?"<>|\u0000-\u001F]/g, "-").trim();
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
