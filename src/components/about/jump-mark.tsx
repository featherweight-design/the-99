"use client";

import { useEffect } from "react";
import { CURRENT_BAND } from "./contents-rail";

/** The attribute the page's CSS draws the mark from (R6 §P1). */
export const JUMPED = "data-jumped";

/**
 * The jumped-to entry (About R6 §P). When a hash lands on an entry, its title
 * line takes the `--elevated` wash and focus moves to its heading, so the reader
 * can see and hear where the jump put them.
 *
 * Client state only, never `:target`: `:target` would draw the mark again on a
 * reload, and M1 says no mark outlives the visit (§P5). It clears when the
 * entry leaves the band the rail watches, or when another jump lands (§P4). The
 * browser's own hash navigation does the scrolling and the history entry, so
 * Back returns to wherever the jump started (§P6).
 *
 * Renders nothing. The page is a server component; this is the one piece of it
 * that has to watch the address.
 */
export function JumpMark() {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let marked: HTMLElement | null = null;

    const clear = () => {
      observer?.disconnect();
      observer = null;
      marked?.removeAttribute(JUMPED);
      marked = null;
    };

    const land = () => {
      clear();
      const id = decodeURIComponent(window.location.hash.slice(1));
      const entry = id ? document.getElementById(id) : null;
      const line = entry?.querySelector<HTMLElement>("[data-entry-title]");
      if (!entry || !line) return;
      marked = line;
      line.setAttribute(JUMPED, "");
      line.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });

      if (typeof IntersectionObserver === "undefined") return;
      let seenInBand = false;
      observer = new IntersectionObserver(([hit]) => {
        // The first callback can arrive before the scroll has finished; only a
        // departure AFTER the entry was in the band clears it.
        if (hit.isIntersecting) seenInBand = true;
        else if (seenInBand) clear();
      }, CURRENT_BAND);
      observer.observe(entry);
    };

    land();
    window.addEventListener("hashchange", land);
    return () => {
      window.removeEventListener("hashchange", land);
      clear();
    };
  }, []);

  return null;
}
