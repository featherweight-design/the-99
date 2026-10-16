"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { scrollLocked } from "../../lib/a11y/dialog";
import { appScrolling } from "../../lib/ui/reveal";
import {
  AWAY_MS,
  BACK_MS,
  headerOffset,
  INITIAL,
  quickReturnStep,
  SETTLE_MS,
  type QuickReturnMode,
  type QuickReturnState,
} from "../../lib/ui/quick-return";

/**
 * Runs quick return for the phone header (`lib/ui/quick-return.ts` holds the rules). It publishes two custom
 * properties on `<html>`: `--header-h`, the header's own height, which its spacer in the page holds, and
 * `--header-offset`, the room a returned header takes, which sticky page heads ride under. It also keeps
 * `data-field-focus` on `<html>` while a text field in the page has focus, which the rules read.
 *
 * Scroll is read once a frame. A scroll inside 300ms of a navigation or a history move (a restore) is the app's, as is
 * any `reveal()` for its whole run; both move the reference points and never the header.
 */
export type QuickReturnView = {
  mode: QuickReturnMode;
  /**
   * Whether the header slides into this mode. Only between away and back: arriving away from the page it has already
   * scrolled off, so a slide there would draw it sliding up across the screen.
   */
  slides: boolean;
};

export function slidesInto(next: QuickReturnMode, prev: QuickReturnView): boolean {
  return next === "shown" || (next === "away" && (prev.mode === "shown" || (prev.mode === "away" && prev.slides)));
}

export function useQuickReturn(header: RefObject<HTMLElement | null>): QuickReturnView {
  const pathname = usePathname();
  const [view, setView] = useState<QuickReturnView>({ mode: "page", slides: false });
  const state = useRef<QuickReturnState>(INITIAL);
  const height = useRef(0);
  const settleUntil = useRef(0);
  const frame = useRef<number | null>(null);
  // A keyboard reader tabbed into the header while it was away: the next step brings it back.
  const bringBack = useRef(false);

  // Schedules one step for the next frame; set by the listeners' effect, called by the navigation effect too.
  const scheduleRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const el = header.current;
    if (!el) return;
    const root = document.documentElement;
    const measure = () => {
      height.current = el.offsetHeight;
      root.style.setProperty("--header-h", `${height.current}px`);
      // The offset is the height while the header is back, so it moves with it (and goes to 0 when the header is
      // hidden from `md` up).
      scheduleRef.current();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--header-h");
      root.style.removeProperty("--header-offset");
      root.style.removeProperty("--header-ms");
      root.style.removeProperty("--header-ease");
    };
  }, [header]);

  useEffect(() => {
    const tick = () => {
      frame.current = null;
      const root = document.documentElement;
      // Read from the focus itself, not only kept by the focus events: a focused field that unmounts sends no
      // `focusout`, and focus can be in a field before these listeners attach.
      if (isPageField(document.activeElement)) root.setAttribute("data-field-focus", "");
      else root.removeAttribute("data-field-focus");
      // Clamped to the scrollable range: iOS's rubber band past the bottom reads beyond it, and its rebound would
      // otherwise count as upward travel.
      const max = Math.max(0, root.scrollHeight - window.innerHeight);
      let next = quickReturnStep(state.current, {
        y: Math.min(window.scrollY, max),
        height: height.current,
        locked: scrollLocked(),
        fieldFocus: root.hasAttribute("data-field-focus"),
        programmatic: appScrolling() || performance.now() < settleUntil.current,
      });
      root.style.setProperty("--header-offset", `${headerOffset(next.mode, height.current)}px`);
      if (bringBack.current) {
        bringBack.current = false;
        if (next.mode === "away") next = { mode: "shown", y: next.y, mark: next.y };
      }
      // The heads riding under it move on the header's own slide, so their edges stay together both ways.
      if (next.mode !== state.current.mode || !root.style.getPropertyValue("--header-ms")) {
        const away = next.mode === "away";
        root.style.setProperty("--header-ms", away ? `${AWAY_MS}ms` : `${BACK_MS}ms`);
        root.style.setProperty("--header-ease", away ? "cubic-bezier(0.4, 0, 1, 1)" : "var(--motion-ease-out)");
      }
      state.current = next;
      setView((prev) => (prev.mode === next.mode ? prev : { mode: next.mode, slides: slidesInto(next.mode, prev) }));
    };
    const schedule = () => {
      if (frame.current === null) frame.current = requestAnimationFrame(tick);
    };
    scheduleRef.current = schedule;
    const settle = () => {
      settleUntil.current = performance.now() + SETTLE_MS;
    };
    const root = document.documentElement;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (isPageField(target)) root.setAttribute("data-field-focus", "");
      // A keyboard reader tabbing into the header while it is away brings it back to where they are.
      // Through the next step, so it slides back on the entrance's own timing like any other return.
      else if (target && header.current?.contains(target)) bringBack.current = true;
      schedule();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!isPageField(e.relatedTarget as Element | null)) root.removeAttribute("data-field-focus");
      schedule();
    };
    window.addEventListener("scroll", schedule, { passive: true });
    // A link to the fragment already in the address bar scrolls with no `hashchange` (as `about/jump-mark.tsx` knows),
    // so a press on any same-page fragment link marks the scroll it starts as the app's.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (link && link.pathname === location.pathname && link.hash) settle();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", settle);
    // An in-page anchor jump is the app's scroll too.
    window.addEventListener("hashchange", settle);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("scroll", schedule);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", settle);
      window.removeEventListener("hashchange", settle);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.removeAttribute("data-field-focus");
      // Cleared, not only cancelled: a pending id left behind (StrictMode's remount runs this) would read as a frame
      // already scheduled, and no scroll would ever be read again.
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [header]);

  // A new page arrives with the header in place, and its own scroll restore is the app's.
  useEffect(() => {
    settleUntil.current = performance.now() + SETTLE_MS;
    state.current = { mode: "page", y: window.scrollY, mark: window.scrollY };
    scheduleRef.current();
  }, [pathname]);

  return view;
}

const NOT_TEXT = new Set(["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image", "hidden"]);

/** A field the phone keyboard rises for, inside the page (`<main>`), never the shell's own controls. */
export function isPageField(el: Element | null): boolean {
  if (!el || !el.closest("main")) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !NOT_TEXT.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable === true;
}
