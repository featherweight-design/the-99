// Pure helpers for export dialog — filename assembly + text assembly.
// Tested in export-helpers.test.ts.

/** One exported deck row: the printed name, and the printing it was printed on. */
export type DecklistCard = {
  name: string;
  quantity: number;
  setCode?: string;
  collectorNumber?: string;
};

/**
 * One body line: `2 Cultivate`, or `1 Battle of Olympus (SLD) 2208` when the
 * printing is known.
 *
 * Exported because the dialog's preview composes its own lines and has to match
 * the text that is actually copied — the format lives here once, not twice.
 * Both halves of the printing are required before either is emitted: `(SLD)`
 * with no number, or a bare collector number, is not a form any deckbuilder
 * reads back.
 */
export function bodyLine(c: DecklistCard): string {
  const printing =
    c.setCode && c.collectorNumber ? ` (${c.setCode}) ${c.collectorNumber}` : "";
  return `${c.quantity} ${c.name}${printing}`;
}

/** The commander lines, `1 Name (SET) CN` where the deck names a printing for one (deck
 *  printings, E4), through `bodyLine` so a commander line and a body line cannot differ in shape.
 *  The preview and the copied text both read this. */
export function commanderLines(args: {
  commanderName: string;
  partnerName: string | null;
  commanderPrinting?: { setCode?: string; collectorNumber?: string } | null;
  partnerPrinting?: { setCode?: string; collectorNumber?: string } | null;
}): string[] {
  return [
    bodyLine({ name: args.commanderName, quantity: 1, ...(args.commanderPrinting ?? {}) }),
    ...(args.partnerName
      ? [bodyLine({ name: args.partnerName, quantity: 1, ...(args.partnerPrinting ?? {}) })]
      : []),
  ];
}

/**
 * Assemble the decklist text copied / downloaded — spec format (#8): a
 * `Commander` section holding one or both commanders, then a `Deck` section of
 * `N Card Name (SET) CN` lines, Moxfield/Archidekt-ready. The dialog's preview
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
  /** The printing each commander's line names, as a body card's does; absent names none. */
  commanderPrinting?: { setCode?: string; collectorNumber?: string } | null;
  partnerPrinting?: { setCode?: string; collectorNumber?: string } | null;
  /**
   * Body cards — both commanders excluded. `name` is the name printed on the
   * copy the player owns, and `setCode` / `collectorNumber` name that same
   * printing. The printing is omitted on a card they do not own: the export
   * describes the specific cards in the deck, and there is no printing to name
   * for one that is not in the binder.
   */
  cards: DecklistCard[];
}): string {
  return [
    "Commander",
    ...commanderLines(args),
    "",
    "Deck",
    ...args.cards.map(bodyLine),
  ].join("\n");
}

/**
 * Assemble the shopping list text: names only, one per line.
 *
 * Deliberately NOT the decklist's `Name (SET) CN` form. #330 ruled that we
 * recommend an oracle card and let the player choose the printing on Mana
 * Pool's all-printings grid — `manapoolCardUrl` is keyed on the oracle name for
 * the same reason. Pinning a printing on a list of cards the player is about to
 * *buy* would quote them the priciest one.
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
