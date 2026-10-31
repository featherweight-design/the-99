"use client";
// The all-decks cart's toast stack (small items 7, item 3, `Cart-Toasts`; widened to 1223px by small items 8, item 3). Below 1224px the cart's receipt (I got it,
// with its Undo) and a failed ask (By friend's `spareCopy.request.failed`) can be up at once: they stand in one fixed
// column on the shipped floor, 10px above the tab bar, the receipt on the floor because it holds Undo and the one alert
// 10px above it. Each keeps its own clock; when the receipt goes the alert drops to the floor in the same layout, and
// when the alert goes the receipt has not moved. Nothing measures another toast and nothing is lifted.
//
// From md up to 1223px (Small items 8, item 3) the same column takes the receipt's fixed slot, 22px in from the bottom
// and right edge and 380 wide, so an alert that would have overlapped the receipt there stands 10px above it. From
// 1224px each toast keeps the fixed slot it shipped in, and the column is hidden. Alone, each keeps its own place.
//
// The column is a host the shell draws (inside its lock's `--tabbar-h`, and outside the page's stacking context); a tree
// with no shell (a test) gets one made on the body.

import { useCallback, useSyncExternalStore } from "react";
import { COVERED_WITH_MAIN } from "../../shell/covered-layer";

const HOST = "data-cart-toast-stack";

/** Phone: 16px gutters, its floor 10px above the tab bar, 10px between the toasts. From md it is the receipt's slot
 *  (bottom right, 22px in, 380 wide). Pointer events pass through the column (its gap, and the band beside a short
 *  toast) to the page; each toast takes its own. Hidden from 76.5rem (1224px). */
export const CART_STACK_CLASS =
  "pointer-events-none fixed bottom-[calc(var(--tabbar-h,0px)+10px)] left-[16px] right-[16px] z-[60] flex flex-col gap-[10px] " +
  "md:bottom-[22px] md:left-auto md:right-[22px] md:w-[380px] min-[76.5rem]:hidden";

/** The host the shell draws once, empty: cart toasts portal into it below 1224px. */
export function CartToastStackHost() {
  // Part of the page under <main>, though drawn outside it: a navigation's screen makes it inert with <main>, so a
  // receipt cannot start an old page's mutation over the loading screen, and its clock stops (`covered-layer.ts`).
  return <div {...{ [HOST]: "", [COVERED_WITH_MAIN]: "" }} className={CART_STACK_CLASS} />;
}

/** The stack to portal a cart toast into below 1224px (only ever asked for in the browser: a cart toast mounts from a press). */
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

/** Where the stack ends: keep it equal to the `min-[76.5rem]:hidden` in `CART_STACK_CLASS`. */
const STACK_ENDS = "(min-width: 76.5rem)";

/** Below 1224px, where a cart toast stands in the stack. The server snapshot and a window with no `matchMedia` read as
 *  the stack, as `useMinWidth` reads the phone. */
export function useCartStacked(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia?.(STACK_ENDS);
    mq?.addEventListener("change", onChange);
    return () => mq?.removeEventListener("change", onChange);
  }, []);
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia?.(STACK_ENDS)?.matches ?? false, () => false);
  return !wide;
}
