"use client";
// The all-decks cart's phone toast stack (small items 7, item 3, `Cart-Toasts`). Below md the cart's receipt (I got it,
// with its Undo) and a failed ask (By friend's `spareCopy.request.failed`) can be up at once: they stand in one fixed
// column on the shipped floor, 10px above the tab bar, the receipt on the floor because it holds Undo and the one alert
// 10px above it. Each keeps its own clock; when the receipt goes the alert drops to the floor in the same layout, and
// when the alert goes the receipt has not moved. Nothing measures another toast and nothing is lifted.
//
// From md both toasts keep the fixed slots they shipped in (this work leaves them unchanged; between md and about
// 1224px the centre alert and the right-hand receipt can overlap, a pre-existing edge that is not drawn here), so the
// stack is phone-only: it is `md:hidden`.
//
// The column is a host the shell draws (inside its lock's `--tabbar-h`, and outside the page's stacking context); a tree
// with no shell (a test) gets one made on the body.

import { useCallback, useSyncExternalStore } from "react";
import { COVERED_WITH_MAIN } from "../../shell/covered-layer";

const HOST = "data-cart-toast-stack";

/** Phone: 16px gutters, its floor 10px above the tab bar, 10px between the toasts. Pointer events pass through the
 *  column (its gap, and the band beside a short toast) to the page; each toast takes its own. Hidden from md. */
export const CART_STACK_CLASS =
  "pointer-events-none fixed bottom-[calc(var(--tabbar-h,0px)+10px)] left-[16px] right-[16px] z-[60] flex flex-col gap-[10px] md:hidden";

/** The host the shell draws once, empty: cart toasts portal into it on the phone. */
export function CartToastStackHost() {
  // Part of the page under <main>, though drawn outside it: a navigation's screen makes it inert with <main>, so a
  // receipt cannot start an old page's mutation over the loading screen, and its clock stops (`covered-layer.ts`).
  return <div {...{ [HOST]: "", [COVERED_WITH_MAIN]: "" }} className={CART_STACK_CLASS} />;
}

/** The stack to portal a phone cart toast into (only ever asked for in the browser: a cart toast mounts from a press). */
export function cartToastStack(): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[${HOST}]`);
  if (found) return found;
  const made = document.createElement("div");
  made.setAttribute(HOST, "");
  made.setAttribute(COVERED_WITH_MAIN, "");
  made.className = CART_STACK_CLASS;
  document.body.appendChild(made);
  return made;
}

const WIDE = "(min-width: 768px)";

/** Below md. The server snapshot and a window with no `matchMedia` read as the phone, as `useMinWidth` does. */
export function useCartPhone(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia?.(WIDE);
    mq?.addEventListener("change", onChange);
    return () => mq?.removeEventListener("change", onChange);
  }, []);
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia?.(WIDE)?.matches ?? false, () => false);
  return !wide;
}
