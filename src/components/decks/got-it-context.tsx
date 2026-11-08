"use client";
// What a row reads of I got it: the shape, the context and the hook. Null outside a deck page, and then a Shopping tag is the
// plain tag. The provider that owns the confirm, the receipt and the writes is `got-it.tsx`, which re-exports these; this file
// imports no action, so a surface that draws the row without a deck page can read it.

import { createContext, useContext } from "react";

import type { DeckDetailCard } from "../../lib/decks/grouping";

/**
 * How a confirm opened from somewhere other than its row's tag hears it close. Card details pass it
 * (A11): the card is held under the confirm while it is up, so the caller withdraws that hold, re-reads
 * the card after a write, and returns focus itself, since the link it was opened from is inert until
 * the card comes back.
 */
export type GotItOpenOptions = { onClose: (wrote: boolean) => void };
export type GotIt = {
  deckId: string;
  /** The card whose confirm is open, or null. */
  openFor: string | null;
  /** That confirm's write is in flight. */
  pending: boolean;
  open: (card: DeckDetailCard, name: string, newestAsOf: Date | null, trigger: HTMLElement, opts?: GotItOpenOptions) => void;
  /**
   * The rows bought in this read of the list, as they were drawn before the write (call 8). The
   * decklist draws one as a held slot where its row was while the card is off the Shopping list,
   * so the slot holds across the action's revalidation, which no longer lists the card.
   */
  held: ReadonlyMap<string, DeckDetailCard>;
  /** The cards an undo is in flight for, whichever toast is showing: their tags are disabled (A9). */
  undoing: ReadonlySet<string>;
  /** The list is read again (a tab switch): every held slot goes. */
  clearHeld: () => void;
};

export const GotItContext = createContext<GotIt | null>(null);

export function useGotIt(): GotIt | null {
  return useContext(GotItContext);
}
