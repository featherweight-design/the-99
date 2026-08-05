// Shared deck membership helpers. Colour identity is named by `colorLabel` in
// ./format — this module briefly carried a second, letter-based formatter, and
// the two shipped different names for one constraint on the same screen.

/** Derives a Set<oracleId> from the deck card list. */
export function buildDeckOracleSet(cards: { oracleId: string }[]): Set<string> {
  return new Set(cards.map((c) => c.oracleId));
}

/** Derives inDeck for a given oracleId — no server round-trip needed. */
export function isInDeck(set: Set<string>, oracleId: string): boolean {
  return set.has(oracleId);
}
