"use client";
// The host of Edit copies (collection edit R2 §C/§D; collection screens plan, PR 7): what the card
// modal's `Edit copies` link opens. The modal closes first, so there is never a modal plus a sheet.
// The sheet is `AddCardsSheet mode="edit"`; Save or Cancel hands the card back to the provider,
// which reopens its details re-read. A save that wrote leaves a toast with Undo, which is a revert
// of that entry through the same confirmation History draws, and so through §E.
//
// A Server Action that revalidates re-renders the page it was called from, and the edit action
// invalidates in `after()` for that reason, so this host settles the write ITSELF once the sheet
// has gone (`settleCollectionWrite`), before the card is read again: the re-read then sees the
// collection as the save left it.

import { useEffect, useState } from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import type { EditCard } from "../../lib/collection/edit-lines";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";
import type { EditResult } from "./edit-copies-sheet";
import { RevertConfirm } from "./revert-confirm";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;

/** The toast lasts this long (R2 §D: eight seconds), unless a revert is being decided. */
export const TOAST_MS = 8000;

type Toast = { text: string; entryId: string; removed: boolean };

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
  const [toast, setToast] = useState<Toast | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (!toast || undoing) return;
    const t = setTimeout(onDone, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, undoing, onDone]);

  async function savedAndClosed(saved: NonNullable<EditResult["saved"]>) {
    // The sheet stays up, frozen on `Saving…`, until the readers behind it are fresh.
    await settleCollectionWrite().catch(() => {});
    setSheet(false);
    setToast({
      entryId: saved.entryId,
      removed: saved.removed,
      text: saved.removed ? r.toast(card.name, saved.copiesRemoved) : c.saved(card.name, saved.total),
    });
    // A card that is gone has no details to go back to.
    if (!saved.removed) onReopen();
  }

  return (
    <>
      {sheet ? (
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
      ) : null}
      {/* Out of the way while a revert is being decided: the toast sits above the confirmation's
          z-layer and would cover its buttons on a phone. Its timer is paused meanwhile. */}
      {toast && !undoing ? (
        <div
          role="status"
          className="fixed bottom-[calc(var(--tabbar-h,0px)+16px)] left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 items-center gap-[14px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[4px] pl-[16px] pr-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] md:bottom-[24px]"
        >
          <span className="min-w-0 flex-1 py-[8px] text-[13.5px] text-[color:var(--fg)]">{toast.text}</span>
          <button
            type="button"
            onClick={() => setUndoing(true)}
            className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent)] underline underline-offset-2"
          >
            {toast.removed ? r.undo : c.undo}
          </button>
        </div>
      ) : null}
      {toast && undoing ? (
        <RevertConfirm
          entryId={toast.entryId}
          title={toast.removed ? collectionEditCopy.history.kinds.remove : collectionEditCopy.history.kinds.edit}
          when={c.undoWhen}
          onClose={() => setUndoing(false)}
          onReverted={() => {
            void settleCollectionWrite().catch(() => {}).then(() => {
              setUndoing(false);
              setToast(null);
              onDone();
            });
          }}
        />
      ) : null}
    </>
  );
}
