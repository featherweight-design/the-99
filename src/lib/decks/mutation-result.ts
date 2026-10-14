/**
 * User-facing outcome of a deck mutation.
 *
 * Rejections that the user can act on (off-color, not commander-legal, already
 * the commander) are returned rather than thrown: a thrown server action is redacted to an opaque
 * digest in production, so the client could never tell the reasons apart.
 */

import type { DeckAddRejection } from "./add-validation";

export type DeckMutationResult = { ok: true } | { ok: false; message: string };

export const DECK_ADD_FALLBACK_MESSAGE = "We couldn’t add that card just now. Give it another try in a moment.";

export const DECK_REMOVE_FALLBACK_MESSAGE = "We couldn’t remove that. It’s still in the deck.";

const REJECTION_MESSAGES: Record<DeckAddRejection, string> = {
  "not-commander-legal": "This card isn’t legal in Commander, so it can’t join the deck.",
  "off-color-identity": "This card’s colors sit outside your commander’s color identity.",
  "is-commander": "This card is already leading the deck as its commander.",
};

export function deckAddRejectionMessage(rejection: DeckAddRejection): string {
  return REJECTION_MESSAGES[rejection];
}
