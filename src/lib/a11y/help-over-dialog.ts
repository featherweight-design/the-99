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

/** A count of surfaces holding a fact, read through `useSyncExternalStore`. */
function counter() {
  let n = 0;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const emit = () => {
    for (const l of listeners) l();
  };
  return {
    useHold(active: boolean) {
      useEffect(() => {
        if (!active) return;
        n += 1;
        emit();
        return () => {
          n -= 1;
          emit();
        };
      }, [active]);
    },
    useIsHeld(): boolean {
      return useSyncExternalStore(subscribe, () => n > 0, () => false);
    },
  };
}

const details = counter();
const open = counter();
const beside = counter();
let stop: HTMLElement | null = null;

/** Card details calls this: `active` while it is the dialog in front. */
export const useCardDetailsUp = details.useHold;

/** Whether a card details dialog is up and in front. */
export const useCardDetailsIsUp = details.useIsHeld;

/**
 * Card details calls this: `active` while it is open at all, in front or covered by a sheet or picker it opened (the
 * stand-ins sheet, Fits your decks), and not while it is leaving. A covered card has not closed: it comes back to the
 * front when the sheet over it goes.
 */
export const useCardDetailsOpen = open.useHold;

/** Whether a card details dialog is open, in front or covered by a surface it opened. */
export const useCardDetailsIsOpen = open.useIsHeld;

/**
 * The panel calls this while it is open stacked over card details, which then centres itself in the room between the
 * rail and the panel, so the panel opens beside it (H3's note) rather than over its right edge.
 */
export const usePanelBeside = beside.useHold;

/** Whether the panel is open beside card details. */
export const usePanelIsBeside = beside.useIsHeld;

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

/**
 * The lifted ?'s id. Card details names it in `aria-owns`, so the ? is inside the modal's accessibility tree, not only
 * its Tab cycle: a screen reader confined to an `aria-modal` dialog would otherwise never find it.
 */
export const HELP_STOP_ID = "help-over-card-details";

/** The extra Tab stop card details' trap takes, or null when no ? is lifted. */
export function helpStop(): HTMLElement | null {
  return stop !== null && stop.isConnected ? stop : null;
}
