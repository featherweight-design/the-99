"use client";

import { useEffect } from "react";
import { scrollLockCount, subscribeScrollLock } from "../a11y/dialog";

/**
 * Whether anything is open over the page, for a moment deciding if it may arrive (STATES-moments, "When a moment may
 * not arrive"; plan `2026-10-16-moments.md`, E6). Two sources:
 *
 * - every sheet and dialog, through `dialog.ts`'s scroll-lock counter, which each already holds while it is up;
 * - a surface that does not lock scroll (a menu, a popover, a toast), through `useMomentHold`.
 *
 * Client-only module state, like the counter it reads.
 */
let holds = 0;
const listeners = new Set<() => void>();

function moved() {
  for (const l of listeners) l();
}

export function overPageCount(): { locks: number; holds: number } {
  return { locks: scrollLockCount(), holds };
}

export function subscribeOverPage(listener: () => void): () => void {
  listeners.add(listener);
  const off = subscribeScrollLock(listener);
  return () => {
    listeners.delete(listener);
    off();
  };
}

/** Holds every moment off while `active`: for a menu, popover or toast that is open over the page without locking it. */
export function useMomentHold(active: boolean) {
  useEffect(() => {
    if (!active) return;
    holds += 1;
    moved();
    return () => {
      holds -= 1;
      moved();
    };
  }, [active]);
}
