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

export type DeckAddRejection =
  | "deck-full"
  | "not-commander-legal"
  | "off-color-identity"
  | "is-commander";

/**
 * Validates that a card may be added to a Commander deck.
 * Returns a rejection code when the card is rejected, or null when it is
 * allowed. Codes rather than prose keeps the wording in one place — every
 * refusal string lives in mutation-result.ts, which both the action and the
 * rows read, so a copy change never has to be made twice.
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
): DeckAddRejection | null {
  if (deck.built >= 99) return "deck-full";
  if (!card.commanderLegal) return "not-commander-legal";
  const identitySet = new Set(deck.commanderColorIdentity);
  if (!card.colorIdentity.every((c) => identitySet.has(c))) {
    return "off-color-identity";
  }
  if (card.oracleId === deck.commanderOracleId) {
    return "is-commander";
  }
  return null;
}
