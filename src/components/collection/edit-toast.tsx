"use client";
// The toast an Edit copies save or removal leaves behind (collection edit R2 §D), with its Undo: a
// revert of that entry through the same confirmation History draws, so through §E.
//
// It lives in the place head, which the (list) layout keeps mounted, and not in the card modal's
// provider: removing the LAST card turns /collection into its empty state, which unmounts the
// provider and everything in it, and the toast carrying Undo for exactly that removal went with it.
// The sheet's host announces a toast through `announceEditToast`, and this draws it.
//
// The frame and its clock are shared: I got it's receipt on a deck page (`got-it-receipt.tsx`) is
// this toast with a detail line, a body, History and an in-toast Undo, held on hover and focus.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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

/**
 * The toast's window: `TOAST_MS`, counted only while `running` and while the toast can be pressed.
 * Another sheet over the page makes its subtree inert, and a window spent behind that is one the
 * reader never had. What is left survives a pause; `restart` starts it over.
 */
export function useToastClock(ref: RefObject<HTMLElement | null>, running: boolean, onExpire: () => void) {
  const left = useRef(TOAST_MS);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      if (ref.current?.closest("[inert]")) return;
      left.current -= TICK_MS;
      if (left.current <= 0) expire.current();
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [running, ref]);
  const restart = useCallback(() => {
    left.current = TOAST_MS;
  }, []);
  return { restart };
}

/**
 * The toast itself. `center` is /collection's slot, bottom centre. `deck` is the deck page's: the
 * phone column's foot above the tab bar, and bottom left of the deck pane from md (I got it, C1),
 * with the receipt's three lines (`title`, a mono `detail`, a `body` sentence) as IGI Toast draws
 * them. The role is the caller's: `status` for a receipt, `alert` for a failure, and never an
 * explicit `aria-live`, which would override `alert` (audit errata 2).
 */
export function ToastFrame({
  frameRef, role = "status", placement = "center", title, detail, body, actions, onHold,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  role?: "status" | "alert";
  placement?: "center" | "deck";
  title: ReactNode;
  detail?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  /**
   * Hover and focus hold the window (call 5), reported apart so the caller can end one (a focused
   * control the toast unmounts fires no blur) and leave the other standing.
   */
  onHold?: (kind: "hover" | "focus", on: boolean) => void;
}) {
  const holds = onHold
    ? {
        onPointerEnter: () => onHold("hover", true),
        onPointerLeave: () => onHold("hover", false),
        onFocus: () => onHold("focus", true),
        onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHold("focus", false);
        },
      }
    : {};
  if (placement === "center") {
    return (
      <div
        ref={frameRef}
        role={role}
        {...holds}
        className="fixed bottom-[calc(var(--tabbar-h,0px)+16px)] left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 items-center gap-[14px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[4px] pl-[16px] pr-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] md:bottom-[24px]"
      >
        <span className="min-w-0 flex-1 py-[8px] text-[13.5px] text-[color:var(--fg)]">{title}</span>
        {actions}
      </div>
    );
  }
  return (
    <div
      ref={frameRef}
      role={role}
      {...holds}
      data-toast="deck"
      className="fixed bottom-[calc(var(--tabbar-h,0px)+10px)] left-[16px] right-[16px] z-[60] flex min-h-[52px] items-start gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] pl-[14px] pr-[6px] shadow-[0_12px_30px_rgba(0,0,0,0.45)] md:bottom-[16px] md:left-[calc(var(--rail-w)+16px)] md:right-auto md:w-[440px]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] py-[10px]">
        <span className="text-[13.5px] leading-[1.35] text-[color:var(--fg)]">{title}</span>
        {detail ? <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{detail}</span> : null}
        {body ? <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-body)] [text-wrap:pretty]">{body}</span> : null}
      </span>
      {actions ? <span className="flex flex-none items-center gap-[2px] self-center">{actions}</span> : null}
    </div>
  );
}

export function CollectionEditToast() {
  const [toast, setToast] = useState<EditToast | null>(null);
  const [armed, setArmed] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  // The countdown ticks only while the toast can be pressed (see `useToastClock`).
  const { restart } = useToastClock(ref, toast !== null && !undoing && armed, () => setToast(null));

  useEffect(() => {
    const on = (e: Event) => {
      setUndoing(false);
      setArmed(false);
      restart();
      setToast((e as CustomEvent<EditToast>).detail);
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
          title={toast.text}
          actions={toast.done ? null : (
            <button
              type="button"
              onClick={() => setUndoing(true)}
              className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent)] underline underline-offset-2"
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
