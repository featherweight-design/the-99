"use client";
// The deck page's lock state as the rows read it: the shape, the context and the hook. Null outside a deck page, and then a row
// draws no lock. The shell that owns the state and writes it (`useCardLocks`, `setCardLocked`) is `lock-cards.tsx`, which
// re-exports these; this file imports no action, so a surface that draws the row without a deck page can read it.

import { createContext, useContext, type ReactNode } from "react";

import type { DeckDetailCard } from "../../lib/decks/grouping";

export type LockCards = {
  /** The Lock cards mode: every row's ✕ is a lock toggle while it is on. */
  mode: boolean;
  /** Lock the card if it is unlocked, unlock it if it is locked. Ignored while its last press is in flight. */
  toggle: (card: DeckDetailCard) => void;
  /** Cards whose write is in flight. */
  pending: ReadonlySet<string>;
  /** A refused toggle's message, by card, drawn under its row. */
  errors: ReadonlyMap<string, string>;
};

const LockCardsContext = createContext<LockCards | null>(null);

export function LockCardsProvider({ value, children }: { value: LockCards | null; children: ReactNode }) {
  return <LockCardsContext.Provider value={value}>{children}</LockCardsContext.Provider>;
}

/** The deck page's lock state, or null outside a deck page. */
export function useLockCards(): LockCards | null {
  return useContext(LockCardsContext);
}
