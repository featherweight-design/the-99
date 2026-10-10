"use client";
// The host of Edit copies (collection edit R2 §C/§D; collection screens plan, PR 7): what the card
// modal's `Edit copies` link opens. The modal closes first, so there is never a modal plus a sheet.
// The sheet is `AddCardsSheet mode="edit"`; Save or Cancel hands the card back to the provider,
// which reopens its details re-read. A save that wrote announces a toast with Undo, which the place
// head draws (`edit-toast.tsx`): removing the last card unmounts this whole subtree.
//
// A Server Action that revalidates re-renders the page it was called from, and the edit action
// invalidates in `after()` for that reason, so this host settles the write ITSELF once the sheet
// has gone (`settleCollectionWrite`), before the card is read again: the re-read then sees the
// collection as the save left it.

import { useState } from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import type { EditCard } from "../../lib/collection/edit-lines";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";
import type { EditResult } from "./edit-copies-sheet";
import { announceCollectionSaved, announceEditToast, armEditToast } from "./edit-toast";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;

export function EditCopiesHost({
  card,
  onReopen,
  onDone,
}: {
  card: EditCard;
  /** The card's details again, re-read: Save or Cancel on a card that is still owned. */
  onReopen: () => void;
  /** Nothing is left to show. */
  onDone: () => void;
}) {
  const [sheet, setSheet] = useState(true);

  async function savedAndClosed(saved: NonNullable<EditResult["saved"]>) {
    // Said before anything can unmount this host: a removal that empties the collection replaces
    // the whole page, and the toast is drawn by the head, which stays.
    announceEditToast({
      entryId: saved.entryId,
      removed: saved.removed,
      text: saved.removed ? r.toast(card.name, saved.copiesRemoved) : c.saved(card.name, saved.total),
    });
    // The sheet stays up, frozen on `Saving…`, until the readers behind it are fresh. A settle that
    // keeps failing leaves them stale, so the card is NOT reopened over caches that would show the
    // save as not having happened: the toast stands, and the list catches up on its next read.
    let fresh = false;
    for (let attempt = 0; attempt < 3 && !fresh; attempt++) {
      fresh = await settleCollectionWrite().then(() => true, () => false);
    }
    setSheet(false);
    armEditToast();
    // The head keeps its totals in state of its own: it re-reads them, as it does after an Add.
    announceCollectionSaved();
    // A card that is gone has no details to go back to.
    if (fresh && !saved.removed) onReopen();
    onDone();
  }

  return sheet ? (
    <AddCardsSheet
      mode="edit"
      card={card}
      onClose={(result) => {
        if (result.saved) return void savedAndClosed(result.saved);
        setSheet(false);
        onReopen();
        onDone();
      }}
    />
  ) : null;
}
