"use client";

import { useEffect } from "react";

import { reportOrphan, type StallConfig } from "./nav-stall";

/**
 * The invariant `NavigationPendingProvider` leans on: a screen outlives its run by one fade and no longer.
 * `orphaned` is a screen up with no navigation pending and not already leaving, whatever put it there. The
 * guard takes it down (`onOrphan`) and, with the stall switch on, says so once: the 8s watch is keyed on a
 * pending target, so without this an orphan is up and silent, which is what "a loading screen that sticks
 * and never reports" looks like from the logs.
 */
export function useOrphanGuard(orphaned: boolean, pathname: string, stall: StallConfig, onOrphan: () => void): void {
  const on = stall !== null;
  const deployment = stall?.deployment ?? null;
  useEffect(() => {
    if (!orphaned) return;
    if (on) reportOrphan({ deployment }, pathname);
    onOrphan();
  }, [orphaned, pathname, on, deployment, onOrphan]);
}
