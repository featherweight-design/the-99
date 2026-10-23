import { useEffect, useRef } from "react";

/** The deck's name heading the reader can see: the spine draws one per width, and the other is hidden. */
function visibleDeckHeading(): HTMLElement | null {
  const headings = [...document.querySelectorAll<HTMLElement>("[data-deck-title]")]
    .map((t) => t.closest<HTMLElement>("h1"))
    .filter((h): h is HTMLElement => h !== null);
  return headings.find((h) => h.getClientRects().length > 0) ?? null;
}

/**
 * When a surface over the deck page closes and its opener has gone with it (the combos sheet closing
 * on its last combo removes the segment that opened it), the dialog's own focus return has nowhere to
 * land and focus falls to the page. Only then, focus goes to the deck's name, a stable heading. A
 * parent's effect runs after its child's unmount cleanup, so this sees where the dialog put focus.
 */
export function useDeckTitleFocusOnClose(open: boolean) {
  const was = useRef(open);
  useEffect(() => {
    const closed = was.current && !open;
    was.current = open;
    if (!closed) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const heading = visibleDeckHeading();
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [open]);
}
