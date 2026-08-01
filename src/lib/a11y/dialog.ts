"use client";
// useDialogA11y — shared focus-trap + Escape + focus-return hook.
// Consumers: every role="dialog" surface — CardModal, Issue Inspector, AddPanel
// sheet, Export dialog, ConfirmModal, and the commander Lightbox.

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
function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.getClientRects().length > 0 &&
      el.tabIndex >= 0 &&
      el.getAttribute("aria-hidden") !== "true",
  );
}

// Module-level because the lock is a property of the page, not of any one
// dialog: every hook instance has to see the same count.
let scrollLocks = 0;
let overflowBeforeLock = "";

export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: {
    initialFocusRef?: RefObject<HTMLElement | null>;
    /**
     * Hold the body at overflow:hidden while the dialog is up. Off by default —
     * CardModal and the Issue Inspector deliberately let the page scroll behind
     * them. Consumers that stay mounted while closed pass their open flag here
     * rather than a literal, so the lock tracks the dialog rather than the
     * component's lifetime.
     */
    lockScroll?: boolean;
    /**
     * Let Escape dismiss the dialog. On by default. ConfirmModal passes false
     * while its replace is in flight: the work is already running and
     * un-undoable, so closing would only hide it.
     */
    closeOnEscape?: boolean;
  },
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = options?.initialFocusRef;
  const lockScroll = options?.lockScroll ?? false;
  const closeOnEscape = options?.closeOnEscape ?? true;

  // Remember what had focus before the dialog opened; return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

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

  // Counted rather than saved-and-restored per dialog. Two dialogs can be up at
  // once — the deck builder's add sheet and export dialog are independent flags
  // — and whichever unmounts first would otherwise restore the overflow it
  // captured and free a page the other one still needs held. The count releases
  // only on the last unlock, and the original value is captured once, by the
  // first locker.
  useEffect(() => {
    if (!lockScroll) return;
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
  }, [lockScroll]);

  // Escape closes; Tab wraps within the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // No-op while no dialog is mounted (consumer rendered closed/null).
      const root = dialogRef.current;
      if (!root) return;
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
      const active = document.activeElement as HTMLElement | null;
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
