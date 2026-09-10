// Pure helpers for export dialog — filename assembly + text assembly.
// Tested in export-helpers.test.ts.

/**
 * Assemble the decklist text copied / downloaded — spec format (#8): a
 * `Commander` section holding one or both commanders, then a `Deck` section of
 * `N Card Name` lines, Moxfield/Archidekt-ready. The dialog's preview
 * header/separator are presentational only and never part of this text.
 *
 * The sections are written for a single commander too. The older bare-first-line
 * form said which card led the deck only by the convention that line one does,
 * which a pair cannot express; one shape reads back the same either way, and the
 * round-trip through `buildDeckImport` is what proves it.
 */
export function buildDecklistText(args: {
  commanderName: string;
  /** The second commander, or null for the single-commander deck most decks are. */
  partnerName: string | null;
  /** Body cards — both commanders excluded */
  cards: { name: string; quantity: number }[];
}): string {
  const { commanderName, partnerName, cards } = args;
  const commanders = [commanderName, ...(partnerName ? [partnerName] : [])];
  return [
    "Commander",
    ...commanders.map((n) => `1 ${n}`),
    "",
    "Deck",
    ...cards.map((c) => `${c.quantity} ${c.name}`),
  ].join("\n");
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
  // Windows-reserved device basenames are invalid even with an extension.
  if (cleaned.length === 0 || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(cleaned)) {
    return "deck";
  }
  return cleaned;
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
