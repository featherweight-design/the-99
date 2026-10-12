// The section headers a decklist carries on lines of their own: the board names exporters write
// (`Commander`, `Deck`, `Sideboard (14):`) and the type headers a list grouped by type writes
// (`Creatures (30)`, `Lands (37)`), our own export included. One definition, read by the deck
// import (which also excludes what follows a sideboard or maybeboard header) and by the plain
// paste parser (which skips the header line itself, so a collection paste or a live count never
// reads `Commander` or `Deck` as a card).

export type SectionKind = "sideboard" | "maybeboard" | null;

// Section markers the exporters emit, on a line of their own. Moxfield writes
// "SIDEBOARD:", Archidekt "Sideboard:", and both bare-word forms occur. `section` is the board a
// header opens that a deck does not import (Commander has no sideboard); null opens one it does.
export const SECTION_MARKERS: { re: RegExp; section: SectionKind }[] = [
  { re: /^side ?board$/i, section: "sideboard" },
  { re: /^maybe ?board$/i, section: "maybeboard" },
  { re: /^considering$/i, section: "maybeboard" },
  { re: /^(deck|main ?board|main deck|commander|companion)$/i, section: null },
  // Type headers (bug batch 2026-10-12): a list grouped by type, as our export writes it and as
  // Moxfield's and Archidekt's "by type" views copy out. No card is named any of these words.
  {
    re: /^(creatures?|instants?|sorcer(?:y|ies)|artifacts?|enchantments?|planeswalkers?|lands?|battles?|other)$/i,
    section: null,
  },
];

/**
 * Reduces a candidate header to the bare word the markers match.
 *
 * Exporters decorate headers with a trailing colon, a count, or both — `Commander (1)`,
 * `Sideboard (14):`, `Deck (99)`. An undetected `Sideboard (14)` is the expensive one: its
 * fourteen lines stop being a skipped section and become fourteen cards in the deck.
 *
 * Safe against real card lines because every marker regex is anchored end to end — a card
 * named "Sideboard Shenanigans" still fails to match once the count is gone, and a line with a
 * leading quantity (`1 Deck`) never matches at all.
 */
export function normalizeHeader(trimmed: string): string {
  return trimmed.replace(/:$/, "").replace(/\s*\(\d+\)$/, "").trim();
}

/** The marker a trimmed line is, or null for a line that is not a header. */
export function sectionHeaderOf(trimmed: string): { section: SectionKind } | null {
  const bare = normalizeHeader(trimmed);
  return SECTION_MARKERS.find((m) => m.re.test(bare)) ?? null;
}
