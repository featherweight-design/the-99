"use client";

// Rule 4 of the Android back findings (boards/handoffs/android-back-findings-2026-11-12.md): an installed app opened on a page
// deeper than Home (a push, a link) has no entry to go Back to and exits. Once, on mount, stand Home underneath that page.
// The decision and the write are `lib/pwa/home-underneath.ts`.
import { useEffect } from "react";
import { homeUnderneathNeeded, standHomeUnderneath } from "../../lib/pwa/home-underneath";

export function HomeUnderneath() {
  useEffect(() => {
    if (!homeUnderneathNeeded()) return;
    standHomeUnderneath(window.history, window.location.pathname + window.location.search + window.location.hash);
  }, []);
  return null;
}
