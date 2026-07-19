"use client";
// useDialogA11y — shared focus-trap + Escape + focus-return hook.
// Consumers: CardModal (collection), AddPanel sheet (deck builder), Export dialog (Task 10).

import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Consumers render parallel mobile/desktop trees and hide one via display:none
// (e.g. ExportDialog) — hidden elements have no client rects and must not
// receive focus or participate in Tab wrapping.
function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus before the dialog opened; return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Auto-focus first visible focusable child on mount.
  useEffect(() => {
    if (!dialogRef.current) return;
    visibleFocusables(dialogRef.current)[0]?.focus();
  }, [dialogRef]);

  // Escape closes; Tab wraps within the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = visibleFocusables(dialogRef.current);
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
