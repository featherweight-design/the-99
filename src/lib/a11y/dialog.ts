"use client";
// useDialogA11y — shared focus-trap + Escape + focus-return hook.
// Consumers: every role="dialog" surface — CardModal, Issue Inspector, the
// export dialog, ConfirmModal, and the account menu.

import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Consumers render parallel mobile/desktop trees and hide one via display:none
// (e.g. ExportDialog) — hidden elements have no client rects and must not
// receive focus or participate in Tab wrapping.
// Also filter out elements that opted OUT of keyboard focus: the FOCUSABLE
// selector's `button:not([disabled])` clause matches buttons with
// `tabindex="-1"`, which are usually intentionally excluded (e.g. the Issue
// Inspector's clear ✕ when its input is empty and it's aria-hidden).
// And filter out anything under an `inert` ancestor. A dialog that covers part of
// itself — the card modal's zoom is the first — leaves the covered controls mounted
// for layout and marks them inert, which stops the browser focusing them but not
// `querySelectorAll` finding them. Left in the list they break the trap in both
// directions: Tab from the last control tries to focus an inert first element and
// lands nowhere, and Shift+Tab from the first is never wrapped, so focus escapes the
// dialog entirely.
function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.getClientRects().length > 0 &&
      el.tabIndex >= 0 &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.closest("[inert]") === null,
  );
}

// Module-level because the lock is a property of the page, not of any one
// dialog: every hook instance has to see the same count.
let scrollLocks = 0;
let overflowBeforeLock = "";

/**
 * Hold the page still while a surface is up, and let go when the last one closes.
 *
 * Counted rather than saved-and-restored per caller. Two surfaces can be up at
 * once — the deck builder's add sheet and export dialog are independent flags —
 * and whichever unmounts first would otherwise restore the overflow it captured
 * and free a page the other one still needs held. The count releases only on the
 * last unlock, and the original value is captured once, by the first locker.
 *
 * Exported because two sheets trap focus themselves and cannot take
 * `useDialogA11y` wholesale: the rack's sheet owns its own Escape and drag
 * dismissal, and `FilterPanel` keeps DOM focus on its search field by design, so
 * a hook that moves focus to the first focusable would break its one rule. They
 * still have to hold the page — an `aria-modal` sheet over a page that scrolls
 * behind it reads as broken — so the lock is the part they share.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (scrollLocks === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) {
        document.body.style.overflow = overflowBeforeLock;
      }
    };
  }, [locked]);
}

export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: {
    initialFocusRef?: RefObject<HTMLElement | null>;
    /**
     * Hold the body at overflow:hidden while the dialog is up. On by default:
     * a modal that lets the page scroll behind it reads as broken, and every
     * consumer that opted in individually was really just correcting the
     * default. Consumers that stay mounted while closed pass their open flag
     * here rather than a literal, so the lock tracks the dialog rather than the
     * component's lifetime.
     */
    lockScroll?: boolean;
    /**
     * Let Escape dismiss the dialog. On by default. ConfirmModal passes false
     * while its replace is in flight: the work is already running and
     * un-undoable, so closing would only hide it.
     */
    closeOnEscape?: boolean;
    /**
     * Where focus goes on close, when the caller knows better than
     * `document.activeElement` did at mount.
     *
     * The capture below reads the active element in the dialog's OWN mount
     * effect, which is after the commit that rendered it — so a dialog opened
     * from a control the same commit marks `inert` records `body` instead, and
     * closing drops the reader at the top of the document. `/collection`'s set
     * panel is exactly that: pressing the Set row opens the panel and makes the
     * sheet around the row inert in one render.
     */
    returnFocusRef?: RefObject<HTMLElement | null>;
  },
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = options?.initialFocusRef;
  const returnFocusRef = options?.returnFocusRef;
  const lockScroll = options?.lockScroll ?? true;
  const closeOnEscape = options?.closeOnEscape ?? true;

  // Remember what had focus before the dialog opened; return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      // An explicit target beats the capture, which may have read `body` — see
      // `returnFocusRef`. Never both: focusing the capture first and the target
      // second would move focus twice and announce the wrong control on the way.
      //
      // Read AT CLEANUP on purpose, which is what the rule below warns about and
      // what this needs: the caller's control may have been re-mounted, or may
      // have arrived after this effect ran. Copying it into a variable inside
      // the effect — the rule's own suggestion — would pin whatever the ref held
      // when the dialog opened, which for a control the same commit marks
      // `inert` is the null this option exists to route around.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- the value at cleanup is the point
      (returnFocusRef?.current ?? triggerRef.current)?.focus();
    };
  }, [returnFocusRef]);

  // Focus initialFocusRef when provided (avoids a visible focus flash on the
  // first DOM-order focusable); otherwise fall back to the first visible child.
  useEffect(() => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }
    if (!dialogRef.current) return;
    visibleFocusables(dialogRef.current)[0]?.focus();
  }, [dialogRef, initialFocusRef]);

  useScrollLock(lockScroll);

  // Escape closes; Tab wraps within the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // No-op while no dialog is mounted (consumer rendered closed/null).
      const root = dialogRef.current;
      if (!root) return;

      // Another dialog's key is not this one's business. The listener is on
      // `window`, so EVERY mounted hook sees every key — and two dialogs can be
      // up together, which the scroll-lock counting above exists for. This
      // guard covers Escape as much as Tab: without it, Escape pressed inside
      // the foreground dialog also closed the one behind it, and Tab had the
      // background dialog yank focus into itself.
      const active = document.activeElement as HTMLElement | null;
      const activeDialog = active?.closest('[role="dialog"]') ?? null;
      if (activeDialog !== null && activeDialog !== root) return;

      if (e.key === "Escape") {
        // Swallowed either way: a dialog that refuses Escape should still stop
        // the key reaching whatever is behind it.
        e.preventDefault();
        if (closeOnEscape) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = visibleFocusables(root);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // A dialog that took initial focus on ITS OWN root holds focus on an
      // element the trap cannot see: the root carries `tabIndex={-1}` so it is
      // deliberately excluded from `visibleFocusables`, and it is therefore
      // neither `first` nor `last`. Both branches below then missed, and the
      // very first Shift+Tab after opening walked out of an `aria-modal`
      // surface into the page behind it. Anything not in the list — the root,
      // or a child that opted out — enters at the appropriate end instead.
      const inTrap = active !== null && focusables.includes(active);
      if (!inTrap) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogRef, onClose, closeOnEscape]);
}
