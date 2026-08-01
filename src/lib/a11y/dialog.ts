"use client";
// useDialogA11y — shared focus-trap + Escape + focus-return hook.
// Consumers: CardModal (collection), AddPanel sheet (deck builder), Export dialog (Task 10).

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
  },
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = options?.initialFocusRef;
  const lockScroll = options?.lockScroll ?? false;

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

  // Restores the prior value rather than clearing it, so a dialog opened over
  // an already-locked page hands the lock back instead of freeing it.
  useEffect(() => {
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lockScroll]);

  // Escape closes; Tab wraps within the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // No-op while no dialog is mounted (consumer rendered closed/null).
      const root = dialogRef.current;
      if (!root) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
  }, [dialogRef, onClose]);
}
