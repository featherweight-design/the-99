"use client";

import { addCardToDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { useAnnounceUndo, useUndoSpentSlot } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

/**
 * The spent slot's Undo, for both of its receipts (the row and the tile).
 *
 * Optimistic under a builder shell: the card is back in the list the moment Undo is pressed, and a
 * refusal brings the receipt back with `addPanelCopy.undo.failed` or the server's own reason. With
 * no shell to own that refusal, it waits on the server and says so itself.
 *
 * `relock` (Locked L1, D2): a card that left locked comes back locked. It revives a dormant lock
 * if the removal left one and does nothing otherwise, so it is passed on every undo.
 */
export function useSpentSlotUndo(deckId: string, card: DeckDetailCard) {
  const { isPending, error: ownError, run } = useDeckMutation(false, addPanelCopy.undo.failed);
  const announceUndo = useAnnounceUndo();
  const shell = useUndoSpentSlot();

  const error = shell
    ? shell.failure?.oracleId === card.oracleId ? shell.failure.message : null
    : ownError;

  function undo() {
    // From the click: an announcement made inside the transition waits for the server.
    announceUndo(card);
    if (!shell) {
      run(() => addCardToDeck(deckId, card.oracleId, { relock: true }));
      return;
    }
    run(
      async () => {
        let result;
        try {
          result = await addCardToDeck(deckId, card.oracleId, { relock: true });
        } catch (cause) {
          shell.reportFailure(card.oracleId, addPanelCopy.undo.failed);
          throw cause;
        }
        if (!result.ok) shell.reportFailure(card.oracleId, result.message);
        return result;
      },
      () => shell.restore(card),
    );
  }

  return { error, isPending, undo };
}
