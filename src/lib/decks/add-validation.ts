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
  /** The second commander, or null for the single-commander deck most decks are. */
  partnerOracleId: string | null;
  partnerColorIdentity: string[] | null;
  built: number;
};

export type DeckAddRejection =
  | "not-commander-legal"
  | "off-color-identity"
  | "is-commander";

/**
 * Validates that a card may be added to a Commander deck.
 * Returns a rejection code when the card is rejected, or null when it is
 * allowed. Codes rather than prose keep the wording in one place — every
 * refusal string lives in mutation-result.ts, which both the action and the
 * rows read, so a copy change never has to be made twice.
 *
 * This validator deliberately does not enforce the format's ninety-nine-card
 * body limit. A deck may pass 99, which surfaces as the `Over`
 * status rather than a refusal — building long and trimming back is a normal
 * way to reach a legal list, and an add the player has to undo to continue is
 * a worse outcome than a count that says what it is.
 *
 * Rules:
 *  - Card must be commander_legal.
 *  - Card's color identity must be a subset of the deck's identity, which for a
 *    pair is the union of both commanders'.
 *  - Card must not be either commander.
 */
export function validateCardForDeck(
  card: CardForValidation,
  deck: DeckContextForValidation,
): DeckAddRejection | null {
  if (!card.commanderLegal) return "not-commander-legal";
  // A pair's identity is the union of both commanders'. Measured against the
  // primary alone, half of a Jeskai pair deck is unaddable to its own list.
  const identitySet = new Set([
    ...deck.commanderColorIdentity,
    ...(deck.partnerColorIdentity ?? []),
  ]);
  if (!card.colorIdentity.every((c) => identitySet.has(c))) {
    return "off-color-identity";
  }
  if (card.oracleId === deck.commanderOracleId || card.oracleId === deck.partnerOracleId) {
    return "is-commander";
  }
  return null;
}
