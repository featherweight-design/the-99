"use client";
// The deck page's one toast stack (small items 3, item 8, `Deck-Toasts`). Every toast in the deck slot (the I got it
// receipt in each of its phases, a refusal, quick-add's failed search) renders into one fixed column that stands on one
// floor: 10px above the bar holding the page's foot (the quick-add dock, or on a phone the top-off commit bar that
// stands in for it), or the shipped slot when no bar is there. The receipt keeps the floor because it holds Undo, and
// the one alert sits 10px above it, so nothing measures another toast and nothing is lifted: when the receipt goes, the
// alert drops to the floor in the same layout, with no motion.
//
// The column is a host the shell draws (inside its lock's `--tabbar-h`, and outside any page's stacking context, such
// as the sticky dock's `z-20`, that a toast drawn inside it could not climb out of); a tree with no shell (a test)
// gets one made on the body.

import { useEffect, useLayoutEffect, useRef } from "react";
import { COVERED_WITH_MAIN } from "../shell/covered-layer";

/** The root custom property the stack's floor reads: how far the bar at the page's foot stands above the slot. */
export const DECK_FOOT_VAR = "--deck-foot-h";

const HOST = "data-deck-toast-stack";

/**
 * Phone: 16px gutters, its floor 10px above the bar's top edge (the tab bar's, with no bar). From md: the shipped left
 * edge (rail + 16) and 440 wide, at 16px from the bottom or 10px above the dock, whichever is higher. A 10px gap
 * between the two toasts. Pointer events pass through the column (its gap, and the band beside a short toast) to the
 * page; each toast takes its own.
 */
export const DECK_STACK_CLASS =
  "pointer-events-none fixed bottom-[calc(var(--tabbar-h,0px)+var(--deck-foot-h,0px)+10px)] left-[16px] right-[16px] z-[60] flex flex-col gap-[10px] md:bottom-[max(16px,var(--deck-foot-h,0px)+10px)] md:left-[calc(var(--rail-w)+16px)] md:right-auto md:w-[440px]";

/** The host the shell draws once, empty: deck toasts portal into it. */
export function DeckToastStackHost() {
  // Part of the page under <main>, though drawn outside it: a navigation's screen makes it inert with <main>, so a
  // receipt cannot start an old page's mutation over the loading screen, and its clock stops (`covered-layer.ts`).
  return <div {...{ [HOST]: "", [COVERED_WITH_MAIN]: "" }} className={DECK_STACK_CLASS} />;
}

/** The stack to portal a deck toast into (only ever asked for in the browser: a deck toast mounts from a press). */
export function deckToastStack(): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[${HOST}]`);
  if (found) return found;
  const made = document.createElement("div");
  made.setAttribute(HOST, "");
  made.setAttribute(COVERED_WITH_MAIN, "");
  made.className = DECK_STACK_CLASS;
  document.body.appendChild(made);
  return made;
}

// Every bar publishing a foot at once (the dock hidden on a phone while the top-off bar stands in for it): the floor
// is the highest of them, so the two never fight over the one property.
const feet = new Map<object, number>();
function writeFoot() {
  const root = document.documentElement;
  if (feet.size === 0) root.style.removeProperty(DECK_FOOT_VAR);
  else root.style.setProperty(DECK_FOOT_VAR, `${Math.max(...feet.values())}px`);
}

/**
 * How far a bar pinned at the page's foot reaches above the slot's own bottom edge (the tab bar's top on a phone, the
 * window's foot from md), in px: its height while it is pinned there, more when the page's end has carried it up
 * (the Fan Content notice under a sticky dock), 0 when it is not drawn, is in flow (`md:static`), or is off screen.
 */
export function footClearance(el: HTMLElement, viewportHeight: number): number {
  const style = getComputedStyle(el);
  if (style.position !== "fixed" && style.position !== "sticky") return 0;
  const box = el.getBoundingClientRect();
  if (box.height <= 0 || box.bottom <= 0) return 0;
  const edge = viewportHeight - (parseFloat(style.bottom) || 0);
  return Math.max(0, Math.round(edge - box.top));
}

/**
 * A bar that holds the page's foot (the quick-add dock, the phone top-off bar) calls this with itself: its clearance
 * is published on the root as `--deck-foot-h`, the way `useDockClearance` publishes `--dock-h`, and the toast stack
 * stands 10px above it. Re-measured as the bar resizes, the window resizes, and the page scrolls (only a change is
 * written, so a pinned bar costs a scroll nothing).
 */
export function useDeckFootClearance(el: HTMLElement | null) {
  useLayoutEffect(() => {
    if (!el) return;
    const key = {};
    const write = () => {
      const next = footClearance(el, window.innerHeight);
      if (feet.get(key) === next) return;
      feet.set(key, next);
      writeFoot();
    };
    write();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(write);
    observer?.observe(el);
    window.addEventListener("resize", write);
    window.addEventListener("scroll", write, { capture: true, passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", write);
      window.removeEventListener("scroll", write, { capture: true });
      feet.delete(key);
      writeFoot();
    };
  }, [el]);
}

/** An alert in the deck stack (a refusal, the failed search) announces itself with this when it mounts, and any other
 *  alert leaves: one alert at a time per deck whoever owns it, the newer replacing the older whichever kind it is. The
 *  detail is the announcer's own token, so an alert does not answer its own claim. */
export const DECK_ALERT_CLAIM = "the99:deck-refusal-claim";

export function useDeckAlertClaim(onDone: () => void) {
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const self = useRef({});
  useEffect(() => {
    const leave = (e: Event) => { if ((e as CustomEvent).detail !== self.current) done.current(); };
    window.addEventListener(DECK_ALERT_CLAIM, leave);
    window.dispatchEvent(new CustomEvent(DECK_ALERT_CLAIM, { detail: self.current }));
    return () => window.removeEventListener(DECK_ALERT_CLAIM, leave);
  }, []);
}
