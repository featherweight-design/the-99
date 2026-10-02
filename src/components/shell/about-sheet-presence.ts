"use client";

import { useSyncExternalStore } from "react";

// Whether the one-time About sheet is on screen (H1, Hugh's walk 2026-10-02).
//
// On a phone the sheet and the tab bar's locked-slot note both sit at
// `bottom: calc(var(--tabbar-h) + 10px)`, both at z-40, and the sheet renders after
// the tab bar, so a note opened under it was drawn and covered. The ruling (d9,
// 2026-10-02): the sheet holds the slot and the note WAITS. A tap still opens the
// note; it is drawn once the sheet closes. The sheet is one-time, so a note is only
// ever deferred for one visit.
//
// A module store rather than a context, because the two are siblings under `Shell`
// and neither owns the other: the sheet reports, the tab bar reads.

let up = false;
const listeners = new Set<() => void>();

export function setAboutSheetUp(next: boolean): void {
  if (next === up) return;
  up = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAboutSheetUp(): boolean {
  return useSyncExternalStore(subscribe, () => up, () => false);
}
