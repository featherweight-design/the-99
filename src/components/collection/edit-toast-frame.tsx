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

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { deckToastStack } from "../decks/deck-toast-stack";
import { cartToastStack, useCartStacked } from "../decks/cart/cart-toast-stack";
import { useMomentHold } from "../../lib/moments/hold";
import { isUuid } from "../../lib/uuid";

/** The toast lasts this long (R2 §D: eight seconds), unless a revert is being decided. */
export const TOAST_MS = 8000;
/** A got-it receipt announces itself with this when it enters the deck stack, and a refusal there leaves (that press is
 *  older news). The failed search stays: its field still holds the query (small items 3, item 8). */
export const DECK_TOAST_CLAIM = "the99:deck-toast-claim";
export const TICK_MS = 250;
export const EVENT = "collection-edit-toast";
export const ARM = "collection-edit-toast-arm";
export const SAVED = "collection-edit-saved";

export type EditToast = {
  text: string;
  entryId: string;
  removed: boolean;
  /** No Undo: the revert already went through. */
  done?: boolean;
  /**
   * Drawn in the deck toast stack (add a card from anywhere, READINESS errata E5). Never announced: the toast decides
   * it from the page it lands on (`onDeckPage`), which every card details on that page shares, whichever provider
   * opened it (the deck's own, the search layer's, a review screen's).
   */
  deck?: boolean;
};

/**
 * A deck's own pages (`/decks/<id>` and below): the deck toast stack's floor there stands above the quick-add dock, so
 * a toast in the centre slot would cover the dock on a phone.
 */
export function onDeckPage(pathname: string): boolean {
  const [, first, id] = pathname.split("/");
  return first === "decks" && isUuid(id);
}

export function announceEditToast(toast: EditToast) {
  window.dispatchEvent(new CustomEvent<EditToast>(EVENT, { detail: toast }));
}

/** The place head re-reads its totals and its History tab when a save has settled. */
export const COLLECTION_SAVED_EVENT = SAVED;
export function announceCollectionSaved() {
  window.dispatchEvent(new Event(SAVED));
}

/**
 * The sheet that saved has closed and its page is inert no more: the countdown starts now, not when
 * the toast was announced, or a slow settle would spend the Undo window while nothing could be pressed.
 */
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
 * The toast itself. `center` is the app-wide slot (/collection, /credits), bottom center of the window.
 * `deck` is the deck page's: drawn into the deck toast stack (`deck-toast-stack.tsx`), whose floor stands above the quick-add dock,
 * with the receipt's three lines (`title`, a mono `detail`, a `body` sentence) as IGI Toast draws
 * them. The receipt (`kind="receipt"`) keeps the floor; an alert (any other kind) sits above it.
 * `inline` is that deck toast drawn in flow, for /about's specimen: same look, no fixed slot.
 * The role is the caller's: `status` for a receipt, `alert` for a failure, and never an
 * explicit `aria-live`, which would override `alert` (audit errata 2).
 */
export function ToastFrame({
  frameRef, role = "status", placement = "center", lift = 0, kind, marks, title, detail, body, actions, onHold,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  role?: "status" | "alert";
  placement?: "center" | "deck" | "cart" | "inline";
  /** `center` only: draw this many px above the slot, over a page's own sticky bar (the precon pick's foot). A deck
   *  toast is never lifted: the stack it is drawn into stands above the dock and above the receipt. */
  lift?: number;
  /** The toast's kind (`data-toast-kind`). In the deck stack `receipt` keeps the floor and every other kind is an alert,
   *  drawn above it. */
  kind?: string;
  /** Attributes for the frame itself, which a portal has taken out of its owner's DOM (quick-add's `useSearchDismiss`
   *  mark: a press on the toast is not a press outside the bar). */
  marks?: Record<string, string>;
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
  // A toast up over the page keeps every moment off it until it closes (moments plan, E6); the specimen does not.
  useMomentHold(placement !== "inline");
  // The cart's toasts stand in the phone stack (`cart-toast-stack.tsx`) below 1224px; from there each keeps its fixed slot.
  const cartStacked = useCartStacked();
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
        style={lift > 0 ? { translate: `-50% -${lift}px` } : undefined}
        className="fixed bottom-[calc(var(--tabbar-h,0px)+16px)] left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 items-center gap-[14px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[4px] pl-[16px] pr-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] md:bottom-[24px]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-[3px] py-[8px]">
          <span className="text-[13.5px] text-[color:var(--fg)]">{title}</span>
          {detail ? <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{detail}</span> : null}
        </span>
        {actions}
      </div>
    );
  }
  // The all-decks cart's toast (`cart`): bottom right at 380 on desktop; on the phone it stands in the cart's toast
  // stack (`decks/cart/cart-toast-stack.tsx`), above the tab bar over the foot of the cart's list, the receipt on the
  // floor and a failed ask 10px above it.
  const slot =
    placement === "inline" ? "w-full max-w-[440px]"
      : placement === "cart"
        ? (cartStacked ? `pointer-events-auto ${kind === "receipt" ? "order-2" : "order-1"}` : `fixed bottom-[22px] right-[22px] z-[60] w-[380px]`)
          // In the stack: the receipt last (the floor), an alert first (above it); a press takes the toast, never the gap.
          : `pointer-events-auto ${kind === "receipt" ? "order-2" : "order-1"}`;
  const frame = (
    <div
      ref={frameRef}
      role={role}
      {...holds}
      {...marks}
      data-toast={placement}
      data-toast-kind={kind}
      className={`${slot} flex min-h-[52px] items-start gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] pl-[14px] pr-[6px] shadow-[0_12px_30px_rgba(0,0,0,0.45)]`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] py-[10px]">
        <span className="text-[13.5px] leading-[1.35] text-[color:var(--fg)]">{title}</span>
        {detail ? <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{detail}</span> : null}
        {body ? <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-body)] [text-wrap:pretty]">{body}</span> : null}
      </span>
      {actions ? <span className="flex flex-none items-center gap-[2px] self-center">{actions}</span> : null}
    </div>
  );
  // A deck toast only ever mounts from a press, in the browser.
  if (placement === "cart" && cartStacked) return createPortal(frame, cartToastStack());
  return placement === "deck" ? createPortal(frame, deckToastStack()) : frame;
}
