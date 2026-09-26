"use client";

import { useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { deleteDeck } from "../../app/decks/actions";
import { refreshCopy } from "../../lib/copy/refresh";
import { DeleteConfirm } from "../ui/delete-confirm";

/**
 * The deck's delete confirm inside `DeckCardOverflow`'s panel: the action and its guards. The pane
 * itself is `DeleteConfirm`, shared with the folder and game deletes.
 *
 * Replaces `window.confirm`, which could state nothing about what a deck takes
 * with it and — being browser chrome — had no error path at all: a throwing
 * `deleteDeck` left the menu sitting there having reported nothing. The pane is
 * the folder delete's from `shelf-menu.tsx`, specified by the folders handoff
 * (decision 25); only the copy differs.
 */
export function DeleteMode({
  deckId,
  deckName,
  onCancel,
  onBusy,
}: {
  deckId: string;
  deckName: string;
  onCancel: () => void;
  /**
   * Raised while the action is in flight. The pane's own `pending` and
   * `inFlight` guard the pane, and a pane that has been UNMOUNTED guards
   * nothing — so the panel above has to hold the fact too, exactly as
   * `ShelfMenu` does with its own `busy`.
   */
  onBusy: (busy: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Guards the double-press the `disabled` attribute cannot: a second click
  // dispatched in the same commit as the first sees the old prop.
  const inFlight = useRef(false);
  const c = refreshCopy.decks.del;

  // KEEP IT takes focus on entry, in the pane itself (`DeleteConfirm`).

  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    onBusy(true);
    startTransition(async () => {
      try {
        await deleteDeck(deckId);
      } catch (err) {
        // `deleteDeck` ends in `redirect()`, which signals BY THROWING, and the
        // throw arrives here before the router navigates. Swallowing it would
        // report a failure over a deletion that succeeded and strand the reader
        // on a route whose deck is gone — the same trap `create-picker.tsx`
        // documents. Rethrow first, then handle what is left: a real outage.
        unstable_rethrow(err);
        inFlight.current = false;
        onBusy(false);
        setError(c.failed);
        return;
      }
      // Deliberately not cleared on success — neither the local guard nor the
      // panel's: the redirect above is still in flight, and releasing either
      // would offer a second delete of a deck that is already gone.
    });
  }

  return (
    <DeleteConfirm
      heading={c.heading(deckName)}
      body={c.body}
      cancelLabel={c.cancel}
      confirmLabel={c.confirm}
      pendingLabel={c.pending}
      pending={pending}
      error={error}
      onCancel={onCancel}
      onConfirm={confirm}
    />
  );
}
