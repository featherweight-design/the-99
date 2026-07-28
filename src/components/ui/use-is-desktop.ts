"use client";
// The one md-breakpoint media-query hook. It lived in filter-bar.tsx (which
// still re-exports it for its existing callers) until filter-panel.tsx needed
// it too: the panel mounts EITHER a popover or a sheet, never both, so the
// choice has to be made in JS rather than with a `hidden md:block` pair — the
// sheet is aria-modal and a hidden duplicate listbox breaks the a11y tree.
//
// SSR snapshot is false (mobile); hydration corrects it.

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeDesktop(onStoreChange: () => void): () => void {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}
