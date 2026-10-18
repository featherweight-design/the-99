"use client";

import { useLayoutEffect, type RefObject } from "react";

/** The root custom property the Fan Content notice reads: how far a fixed bottom dock covers the page's foot. */
export const DOCK_CLEARANCE_VAR = "--dock-h";

/**
 * A page whose action dock is `fixed` over the foot of the page calls this with the dock's ref. The dock's height is
 * published on the root as `--dock-h` (the same shape as `--about-sheet-h` and `--header-h`), and the Fan Content
 * notice, which sits after `<main>` and so past each page's own foot padding, pads itself by it. Without that, the dock
 * covers the notice when the page is scrolled to its end.
 *
 * Only a dock that is `position: fixed` counts: `gate-dismiss` is static from `md`, and a static bar is already in flow.
 * Border box, as the pages' own reserves measure, because the dock's padding and top border cover the notice too.
 */
export function useDockClearance(ref: RefObject<HTMLElement | null>, enabled = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const root = document.documentElement;
    const write = () => {
      const fixed = getComputedStyle(el).position === "fixed";
      root.style.setProperty(DOCK_CLEARANCE_VAR, `${fixed ? Math.round(el.getBoundingClientRect().height) : 0}px`);
    };
    write();
    // A browser with no ResizeObserver re-measures on a window resize, which is when a dock changes height or position.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(write);
    observer?.observe(el);
    window.addEventListener("resize", write);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", write);
      root.style.removeProperty(DOCK_CLEARANCE_VAR);
    };
  }, [ref, enabled]);
}
