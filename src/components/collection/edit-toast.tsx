"use client";
// The toast an Edit copies save or removal leaves behind (collection edit R2 §D), with its Undo: a
// revert of that entry through the same confirmation History draws, so through §E.
//
// It lives in the place head, which the (list) layout keeps mounted, and not in the card modal's
// provider: removing the LAST card turns /collection into its empty state, which unmounts the
// provider and everything in it, and the toast carrying Undo for exactly that removal went with it.
// The sheet's host announces a toast through `announceEditToast`, and this draws it.

import { useEffect, useRef, useState } from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { RevertConfirm } from "./revert-confirm";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;

/** The toast lasts this long (R2 §D: eight seconds), unless a revert is being decided. */
export const TOAST_MS = 8000;
const TICK_MS = 250;
const EVENT = "collection-edit-toast";
const ARM = "collection-edit-toast-arm";
const SAVED = "collection-edit-saved";

export type EditToast = { text: string; entryId: string; removed: boolean; /** No Undo: the revert already went through. */ done?: boolean };

export function announceEditToast(toast: EditToast) {
  window.dispatchEvent(new CustomEvent<EditToast>(EVENT, { detail: toast }));
}

/**
 * The sheet that saved has closed and its page is inert no more: the countdown starts now, not when
 * the toast was announced, or a slow settle would spend the Undo window while nothing could be pressed.
 */
/** The place head re-reads its totals and its History tab when a save has settled. */
export const COLLECTION_SAVED_EVENT = SAVED;
export function announceCollectionSaved() {
  window.dispatchEvent(new Event(SAVED));
}

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

  // The countdown ticks, and only while the toast can be pressed: another sheet opening over the
  // page (a second edit, an Add) makes this subtree inert, and an Undo window spent behind that is
  // one the reader never had.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!toast || undoing || !armed) return;
    let left = TOAST_MS;
    const tick = setInterval(() => {
      if (ref.current?.closest("[inert]")) return;
      left -= TICK_MS;
      if (left <= 0) setToast(null);
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [toast, undoing, armed]);

  return (
    <>
      {/* Out of the way while a revert is being decided: the toast sits above the confirmation's
          z-layer and would cover its buttons on a phone. Its timer is paused meanwhile. */}
      {toast && !undoing ? (
        <div
          ref={ref}
          role="status"
          className="fixed bottom-[calc(var(--tabbar-h,0px)+16px)] left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 items-center gap-[14px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[4px] pl-[16px] pr-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] md:bottom-[24px]"
        >
          <span className="min-w-0 flex-1 py-[8px] text-[13.5px] text-[color:var(--fg)]">{toast.text}</span>
          {toast.done ? null : (
            <button
              type="button"
              onClick={() => setUndoing(true)}
              className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent)] underline underline-offset-2"
            >
              {toast.removed ? r.undo : c.undo}
            </button>
          )}
        </div>
      ) : null}
      {toast && undoing ? (
        <RevertConfirm
          entryId={toast.entryId}
          title={toast.removed ? collectionEditCopy.history.kinds.remove : collectionEditCopy.history.kinds.edit}
          when={c.undoWhen}
          onClose={() => setUndoing(false)}
          onReverted={() => {
            void (async () => {
              let fresh = false;
              for (let attempt = 0; attempt < 3 && !fresh; attempt++) {
                fresh = await settleCollectionWrite().then(() => true, () => false);
              }
              setUndoing(false);
              // The revert committed either way. A list that could not be refreshed says so, rather
              // than vanishing the toast over a page still showing the old count.
              setToast(fresh ? null : { entryId: toast.entryId, removed: false, text: c.undoneStale, done: true });
              // The head's totals moved back too.
              announceCollectionSaved();
            })();
          }}
        />
      ) : null}
    </>
  );
}
