"use client";

import { useEffect } from "react";
import { noteAppScroll } from "../../lib/ui/reveal";

/**
 * The wash a Settings link lands on (`/settings#settings-decks-see` from a deck's ⋯ menu, draft hidden row #2988;
 * `/settings#settings-store` from Change store, store choice call 1): the named element scrolls into view and takes the
 * elevated fill and a hairline ring for two seconds, then fades. Set on a data attribute rather than in state (the
 * element's own styling is `data-[washed]`, `WASH`), with no fade under reduced motion. A hash outside `ids` washes
 * nothing, so a plain `/settings` visit, or a heading's own anchor, never washes.
 */
export const WASH_MS = 2000;
export const WASH =
  "data-[washed]:bg-[color:var(--elevated)] data-[washed]:shadow-[inset_0_0_0_1px_var(--border-strong)] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-500";

/** `ids` must be a stable array (a module constant): it is read once, on mount. */
export function useWashFromHash(ids: readonly string[]) {
  useEffect(() => {
    const timers: number[] = [];
    let washed: HTMLElement | null = null;
    // The page streams in after this mounts (and the router scrolls to the hash on its own as segments land), so the
    // element is brought back to the middle twice more while the wash runs, unless the reader has scrolled themselves.
    let moved = false;
    const mine = () => {
      moved = true;
    };
    const stop = () => {
      for (const t of timers.splice(0)) window.clearTimeout(t);
    };
    const run = () => {
      const id = window.location.hash.slice(1);
      if (!ids.includes(id)) return;
      const el = document.getElementById(id);
      if (!el) return;
      stop();
      washed?.removeAttribute("data-washed");
      washed = el;
      moved = false;
      // The app's own scroll, marked as such so quick return never reads it as the reader's (`app-scroll-marks.test.ts`).
      const center = () => {
        noteAppScroll();
        el.scrollIntoView({ block: "center" });
      };
      center();
      el.setAttribute("data-washed", "");
      for (const ms of [300, 900]) timers.push(window.setTimeout(() => (moved ? undefined : center()), ms));
      timers.push(window.setTimeout(() => el.removeAttribute("data-washed"), WASH_MS));
    };
    run();
    window.addEventListener("hashchange", run);
    window.addEventListener("pointerdown", mine, { passive: true });
    window.addEventListener("wheel", mine, { passive: true });
    window.addEventListener("touchmove", mine, { passive: true });
    window.addEventListener("keydown", mine);
    return () => {
      window.removeEventListener("hashchange", run);
      window.removeEventListener("pointerdown", mine);
      window.removeEventListener("wheel", mine);
      window.removeEventListener("touchmove", mine);
      window.removeEventListener("keydown", mine);
      stop();
      washed?.removeAttribute("data-washed");
    };
  }, [ids]);
}
