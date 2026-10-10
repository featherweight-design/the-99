"use client";

import { useLayoutEffect } from "react";

/**
 * Holds the rest of the page still while a side sheet is up (collection edit R1, B1): the sheet is
 * `role=dialog aria-modal` with NO scrim, so the collection stays readable behind it, but nothing
 * behind it takes a press, a focus or a screen reader's attention.
 *
 * Marks `inert` every sibling on the way from the sheet's host up to `<body>`, rather than
 * `<main>` itself: the host is portalled INTO `<main>` (so every probe scoped to the page still
 * finds the sheet), and an inert `<main>` would make the sheet inert with it.
 *
 * A layout effect, so its cleanup runs before the dialog hook's passive one restores focus: the
 * control that opened the sheet is out of `inert` by the time focus returns to it.
 */
export function useInertPage(host: HTMLElement | null, active: boolean) {
  useLayoutEffect(() => {
    if (!active || !host) return;
    const marked: Element[] = [];
    for (let el: Element | null = host; el && el !== document.body; el = el.parentElement) {
      const parent: Element | null = el.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling === el || sibling.hasAttribute("inert")) continue;
        if (sibling.tagName === "SCRIPT" || sibling.tagName === "STYLE") continue;
        sibling.setAttribute("inert", "");
        marked.push(sibling);
      }
    }
    return () => {
      for (const el of marked) el.removeAttribute("inert");
    };
  }, [host, active]);
}
