// Pure helpers for export dialog — filename assembly + text assembly.
// Tested in export-helpers.test.ts.

/**
 * Assemble the full decklist text displayed / copied / downloaded.
 * The brief specifies: first line `# ${deckName}`, then commander line,
 * then body from toDecklistText (which does NOT include the `#` header line).
 */
export function buildDecklistText(args: {
  deckName: string;
  commanderName: string;
  /** Body cards — commander excluded */
  cards: { name: string; quantity: number }[];
}): string {
  const { deckName, commanderName, cards } = args;
  const bodyLines = cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
  return `# ${deckName}\n1 ${commanderName}\n//\n${bodyLines}`;
}

/**
 * Assemble the shopping list text: names only, one per line.
 */
export function buildShoppingText(cards: { name: string }[]): string {
  return cards.map((c) => c.name).join("\n");
}

/**
 * Filename for the decklist download.
 */
export function decklistFilename(deckName: string): string {
  return `${deckName}.txt`;
}

/**
 * Filename for the shopping list download.
 */
export function shoppingFilename(deckName: string): string {
  return `${deckName} — shopping.txt`;
}
