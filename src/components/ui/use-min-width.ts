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

import { useCallback, useSyncExternalStore } from "react";

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
