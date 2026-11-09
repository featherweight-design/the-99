"use client";
// The toast an Edit copies save or removal leaves behind (collection edit R2 §D), with its Undo: a
// revert of that entry through the same confirmation History draws, so through §E.
//
// It lives in the shell, drawn once for every page (add a card from anywhere, READINESS O1), and not in
// the card modal's provider: removing the LAST card turns /collection into its empty state, which
// unmounts the provider and everything in it, and the toast carrying Undo for exactly that removal
// went with it. Card details adds from every page in the shell, so the toast cannot live in
// /collection's place head either. The sheet's host announces a toast through `announceEditToast`,
// and this draws it.
//
// The frame and its clock are shared: I got it's receipt on a deck page (`got-it-receipt.tsx`) is
// this toast with a detail line, a body, History and an in-toast Undo, held on hover and focus.

import { useEffect, useRef, useState } from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { RevertConfirm } from "./revert-confirm";
import { announceCollectionSaved, ARM, DECK_TOAST_CLAIM, EVENT, onDeckPage, ToastFrame, useToastClock, type EditToast } from "./edit-toast-frame";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;

export { TOAST_MS, DECK_TOAST_CLAIM, onDeckPage, announceEditToast, COLLECTION_SAVED_EVENT, announceCollectionSaved, armEditToast, useToastClock, ToastFrame, type EditToast } from "./edit-toast-frame";

export function CollectionEditToast() {
  const [toast, setToast] = useState<EditToast | null>(null);
  const [armed, setArmed] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  // The countdown ticks only while the toast can be pressed (see `useToastClock`).
  const { restart } = useToastClock(ref, toast !== null && !undoing && armed, () => setToast(null));

  // The deck floor holds one receipt, the newest (errata E5): this one claims it when it shows there, and a receipt
  // claiming it after (I got it's) dismisses this one. Claims carry who sent them, so this toast ignores its own.
  const self = useRef({});
  const onDeckFloor = toast !== null && toast.deck === true && !undoing;
  useEffect(() => {
    if (onDeckFloor) window.dispatchEvent(new CustomEvent(DECK_TOAST_CLAIM, { detail: self.current }));
  }, [onDeckFloor, toast]);
  useEffect(() => {
    // A revert being decided keeps its toast: the confirmation is up over the page, so no other receipt can arrive.
    if (undoing) return;
    const leave = (e: Event) => {
      if ((e as CustomEvent).detail === self.current) return;
      setToast((t) => (t?.deck ? null : t));
    };
    window.addEventListener(DECK_TOAST_CLAIM, leave);
    return () => window.removeEventListener(DECK_TOAST_CLAIM, leave);
  }, [undoing]);

  useEffect(() => {
    const on = (e: Event) => {
      setUndoing(false);
      setArmed(false);
      restart();
      // Where it lands decides where it stands: a deck page's toast goes in the deck stack, clear of the dock.
      setToast({ ...(e as CustomEvent<EditToast>).detail, deck: onDeckPage(window.location.pathname) });
    };
    const arm = () => setArmed(true);
    window.addEventListener(EVENT, on);
    window.addEventListener(ARM, arm);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener(ARM, arm);
    };
  }, [restart]);

  return (
    <>
      {/* Out of the way while a revert is being decided: the toast sits above the confirmation's
          z-layer and would cover its buttons on a phone. Its timer is paused meanwhile. */}
      {toast && !undoing ? (
        <ToastFrame
          frameRef={ref}
          placement={toast.deck ? "deck" : "center"}
          kind={toast.deck ? "receipt" : undefined}
          title={toast.text}
          actions={toast.done ? null : (
            <button
              type="button"
              onClick={() => setUndoing(true)}
              className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2"
            >
              {toast.removed ? r.undo : c.undo}
            </button>
          )}
        />
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
              restart();
              // The revert committed either way. A list that could not be refreshed says so, rather
              // than vanishing the toast over a page still showing the old count.
              setToast(fresh ? null : { entryId: toast.entryId, removed: false, text: c.undoneStale, done: true, deck: toast.deck });
              // The head's totals moved back too.
              announceCollectionSaved();
            })();
          }}
        />
      ) : null}
    </>
  );
}
