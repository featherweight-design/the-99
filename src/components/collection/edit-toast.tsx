"use client";
// The toast an Edit copies save or removal leaves behind (collection edit R2 §D), with its Undo: a
// revert of that entry through the same confirmation History draws, so through §E.
//
// It lives in the place head, which the (list) layout keeps mounted, and not in the card modal's
// provider: removing the LAST card turns /collection into its empty state, which unmounts the
// provider and everything in it, and the toast carrying Undo for exactly that removal went with it.
// The sheet's host announces a toast through `announceEditToast`, and this draws it.

import { useEffect, useState } from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { RevertConfirm } from "./revert-confirm";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;

/** The toast lasts this long (R2 §D: eight seconds), unless a revert is being decided. */
export const TOAST_MS = 8000;
const EVENT = "collection-edit-toast";
const ARM = "collection-edit-toast-arm";

export type EditToast = { text: string; entryId: string; removed: boolean };

export function announceEditToast(toast: EditToast) {
  window.dispatchEvent(new CustomEvent<EditToast>(EVENT, { detail: toast }));
}

/**
 * The sheet that saved has closed and its page is inert no more: the countdown starts now, not when
 * the toast was announced, or a slow settle would spend the Undo window while nothing could be pressed.
 */
export function armEditToast() {
  window.dispatchEvent(new Event(ARM));
}

export function CollectionEditToast() {
  const [toast, setToast] = useState<EditToast | null>(null);
  const [armed, setArmed] = useState(false);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      setUndoing(false);
      setArmed(false);
      setToast((e as CustomEvent<EditToast>).detail);
    };
    const arm = () => setArmed(true);
    window.addEventListener(EVENT, on);
    window.addEventListener(ARM, arm);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener(ARM, arm);
    };
  }, []);

  useEffect(() => {
    if (!toast || undoing || !armed) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, undoing, armed]);

  return (
    <>
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
            });
          }}
        />
      ) : null}
    </>
  );
}
