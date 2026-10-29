"use client";
// One rule for a search field that picks from a list (DECK INPUT UX, Hugh 2026-10-12): Escape, or a
// press anywhere outside the field and its list, closes the list AND clears the text, in one step.
// A single-select pick clears the text too; each field does that in its own pick handler, since what a
// pick is differs (a card is added once the server agrees). A multi-select pick keeps it, so several
// of what one search finds are picked in a row (Hugh, 2026-10-29).
//
// Filter-in-place fields (the /collection or /decks search, whose text is the page's state and sits
// in the URL) do not take this rule, and neither does the `[[` card lookup, whose pick replaces
// the text it was typed in.

import { useEffect, useId, useRef, type KeyboardEvent } from "react";

/** Marks a part of a field that is drawn elsewhere in the DOM (a portalled toast) as inside it: `{...insideProps}`. */
const INSIDE = "data-search-inside";

/**
 * `active`: whether there is anything to dismiss (typed text, or an open list).
 * `dismiss`: clears the text and closes the list.
 *
 * Returns the ref for the element that holds the field AND its list (a press inside it is not
 * outside), and the Escape half for the field's own key handler: it answers true when it took the
 * key (`escapeDismisses`). With nothing to dismiss it leaves Escape alone, so the sheet or dialog
 * around the field closes on it. `insideProps` go on a part of the field portalled out of `ref` (quick-add's failed-search
 * toast, whose Try again must not clear the text it retries): a press there is not outside either.
 */
export function useSearchDismiss<T extends HTMLElement>(active: boolean, dismiss: () => void) {
  const ref = useRef<T | null>(null);
  const id = useId();
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
      if (!root || !(e.target instanceof Node) || root.contains(e.target)) return;
      const part = e.target instanceof Element ? e.target : e.target.parentElement;
      if (part?.closest(`[${INSIDE}="${id}"]`)) return;
      dismissRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [active, id]);

  const onEscape = (e: KeyboardEvent<HTMLElement>) => escapeDismisses(e, active, () => dismissRef.current());

  return { ref, onEscape, insideProps: { [INSIDE]: id } };
}

/**
 * The Escape half on its own, for a field whose surface already closes on a press outside it (a
 * sheet's scrim, a popover's own outside press): with something to dismiss, Escape clears it and
 * stops there, and the next Escape reaches the surface. Answers true when it took the key.
 *
 * Stopped, not only prevented: a sheet's Escape listener (`useDialogA11y`) sits on `window` and reads
 * no `defaultPrevented`, so a key that only cleared the field would close the sheet too.
 */
export function escapeDismisses(e: KeyboardEvent<HTMLElement>, active: boolean, dismiss: () => void): boolean {
  if (e.key !== "Escape" || !active) return false;
  e.preventDefault();
  e.stopPropagation();
  dismiss();
  return true;
}
