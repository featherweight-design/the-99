// Shared deck membership and identity helpers.

/** Derives a Set<oracleId> from the deck card list. */
export function buildDeckOracleSet(cards: { oracleId: string }[]): Set<string> {
  return new Set(cards.map((c) => c.oracleId));
}

/** Derives inDeck for a given oracleId — no server round-trip needed. */
export function isInDeck(set: Set<string>, oracleId: string): boolean {
  return set.has(oracleId);
}

/** Build a label like "WUB-legal" from a color identity array. */
export function identityLabel(colors: string[]): string {
  if (colors.length === 0) return "Colorless";
  return colors.join("") + "-legal";
}
