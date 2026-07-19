/**
 * Pure validation helpers for adding a card to a Commander deck.
 * Kept separate from actions.ts (a "use server" module) so tests can import
 * these functions without triggering the server-action module boundary.
 */

export type CardForValidation = {
  commanderLegal: boolean;
  colorIdentity: string[];
  oracleId: string;
};

export type DeckContextForValidation = {
  commanderOracleId: string;
  commanderColorIdentity: string[];
  built: number;
};

/**
 * Validates that a card may be added to a Commander deck.
 * Returns an error string when the card is rejected, or null when it is allowed.
 *
 * Rules:
 *  - Deck must be under 99 built cards.
 *  - Card must be commander_legal.
 *  - Card's color identity must be a subset of the deck commander's identity.
 *  - Card must not be the commander itself.
 */
export function validateCardForDeck(
  card: CardForValidation,
  deck: DeckContextForValidation,
): string | null {
  if (deck.built >= 99) return "deck is full (99 cards)";
  if (!card.commanderLegal) return "card is not legal in Commander";
  const identitySet = new Set(deck.commanderColorIdentity);
  if (!card.colorIdentity.every((c) => identitySet.has(c))) {
    return "card color identity is outside the commander's identity";
  }
  if (card.oracleId === deck.commanderOracleId) {
    return "cannot add the commander itself as a deck card";
  }
  return null;
}
