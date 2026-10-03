"use client";
// The one media-query subscriber. It lived in filter-bar.tsx, moved to
// use-is-desktop.ts when filter-panel.tsx needed it too, and is here now that a
// second breakpoint exists — the drift each move was correcting is a second
// copy of the subscriber, so there is one, taking the query as an argument.
//
// A component mounts EITHER a popover or a sheet, never both, so the choice has
// to be made in JS rather than with a `hidden md:block` pair: the sheet is
// aria-modal and a hidden duplicate listbox breaks the a11y tree.
//
// SSR snapshot is false (the narrow branch); hydration corrects it. That way a
// server render never emits a modal, which is the more expensive thing to undo.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { writeViewCookie } from "./view-cookie";

export function useMinWidth(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * `useMinWidth` for a surface whose SERVER render must already be laid out for the reader's width
 * (`/collection`'s default view, whose rows-then-grid flash was `useMinWidth`'s `false` server
 * snapshot). `hint` is what the page read from `cookie` on a past visit: the server render and the
 * hydration pass return it, and the render after reads the real query. Null when there is no hint,
 * which is the caller's cue to draw for both widths until it knows.
 *
 * Once it knows, it writes the answer to `cookie` when the hint was missing or wrong, so the next
 * visit's server draws the right layout. Width can change between visits; a stale hint costs one
 * flip, the same as no hint.
 */
export function useMinWidthHinted(query: string, hint: boolean | null, cookie: string): boolean | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  const matches = useSyncExternalStore<boolean | null>(
    subscribe,
    () => window.matchMedia(query).matches,
    () => hint,
  );
  useEffect(() => {
    const now = window.matchMedia(query).matches;
    if (now !== hint) writeViewCookie(cookie, now ? "1" : "0");
  }, [query, hint, cookie, matches]);
  return matches;
}
