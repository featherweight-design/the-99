"use client";
// One rule for a search field that picks from a list (DECK INPUT UX, Hugh 2026-10-12): Escape, or a
// press anywhere outside the field and its list, closes the list AND clears the text, in one step.
// A pick clears the text too; each field does that in its own pick handler, since what a pick is
// differs (a theme toggles, a card is added once the server agrees).
//
// Filter-in-place fields (the /collection or /decks search, whose text is the page's state and sits
// in the URL) do not take this rule, and neither does the `[[` card lookup, whose pick replaces
// the text it was typed in.

import { useEffect, useRef, type KeyboardEvent } from "react";

/**
 * `active`: whether there is anything to dismiss (typed text, or an open list).
 * `dismiss`: clears the text and closes the list.
 *
 * Returns the ref for the element that holds the field AND its list (a press inside it is not
 * outside), and the Escape half for the field's own key handler: it answers true when it took the
 * key, and stops it there: a sheet's own Escape listener sits on `window` and reads no
 * `defaultPrevented`, so a key that only cleared the field would close the sheet too. With nothing
 * to dismiss it leaves Escape alone, so the sheet or dialog around the field closes on it.
 */
export function useSearchDismiss<T extends HTMLElement>(active: boolean, dismiss: () => void) {
  const ref = useRef<T | null>(null);
  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  useEffect(() => {
    if (!active) return;
    // Pointerdown, not click: a press that starts here and drags off is still outside, and the
    // list is gone before whatever was pressed acts on it.
    const onPointerDown = (e: PointerEvent) => {
      const root = ref.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) dismissRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [active]);

  const onEscape = (e: KeyboardEvent<HTMLElement>): boolean => {
    if (e.key !== "Escape" || !active) return false;
    e.preventDefault();
    e.stopPropagation();
    dismissRef.current();
    return true;
  };

  return { ref, onEscape };
}
