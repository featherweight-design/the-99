/**
 * The ledger source an import's `I own these cards` add writes (no-collection entry plan, PR 1):
 * `deck:<deck id>`, naming the deck the import made in the same transaction. Its own module, and
 * client-safe, so the history list can tell the kind apart without importing the write path.
 */
export const DECK_SOURCE_PREFIX = "deck:";
export const deckSource = (deckId: string) => `${DECK_SOURCE_PREFIX}${deckId}`;
/** The deck a `deck:<id>` source names, or null for any other source. */
export const deckOfSource = (source: string | null): string | null =>
  source?.startsWith(DECK_SOURCE_PREFIX) ? source.slice(DECK_SOURCE_PREFIX.length) : null;
