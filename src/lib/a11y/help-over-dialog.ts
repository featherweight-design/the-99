"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * The ? over card details at 1280 (discovery R2·9, readiness gap 5). Card details is modal over a fixed backdrop that
 * covers the rail, so its entries were out of reach while it was open. While it is up, the rail's ? is lifted above
 * the backdrop, joins the dialog's Tab cycle as one extra stop after its last control, and opens the panel as its own
 * dialog stacked over it, holding the trap while it is open (one trap live at a time).
 *
 * Two facts cross the tree between the page's card details and the shell's ?, so they live here: whether a card
 * details dialog is up and in front (not covered by a sheet it opened), and which element is the ?'s Tab stop.
 */

let up = 0;
let stop: HTMLElement | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Card details calls this: `active` while it is the dialog in front. */
export function useCardDetailsUp(active: boolean) {
  useEffect(() => {
    if (!active) return;
    up += 1;
    for (const l of listeners) l();
    return () => {
      up -= 1;
      for (const l of listeners) l();
    };
  }, [active]);
}

/** Whether a card details dialog is up and in front. */
export function useCardDetailsIsUp(): boolean {
  return useSyncExternalStore(subscribe, () => up > 0, () => false);
}

/** The lifted ? registers itself as the extra stop while it is lifted; the cleanup clears only its own. */
export function useHelpStop(el: HTMLElement | null) {
  useEffect(() => {
    if (el === null) return;
    stop = el;
    return () => {
      if (stop === el) stop = null;
    };
  }, [el]);
}

/** The extra Tab stop card details' trap takes, or null when no ? is lifted. */
export function helpStop(): HTMLElement | null {
  return stop !== null && stop.isConnected ? stop : null;
}
