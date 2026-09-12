"use client";

// Which decklist rows the draft added — the brass rule the list draws, and the
// word a screen reader hears in their place.

import { createContext, useContext } from "react";

/** What the version held of a card, and what the draft holds. `from` is 0 for a
 *  card the version did not have at all — the plain add. Both above zero is a
 *  quantity move, which the row prints rather than leaving as a bare name. */
export type PendingAddMove = { from: number; to: number };

export type PendingAdd = {
  /** The draft's added cards, each against the move that added it. A map rather
   *  than a set of ids, because a row whose count merely moved has to print the
   *  pair, and membership alone cannot express one. */
  moves: Map<string, PendingAddMove>;
  label: string;
};

/**
 * A context rather than a prop, for the reason `pass-mark.tsx` gives: the row is
 * mounted from five call sites behind three intermediate components, and the
 * mark is one boolean per row. Null outside a provider, which is every deck with
 * no draft.
 */
const PendingAddContext = createContext<PendingAdd | null>(null);

export function PendingAddProvider({
  value,
  children,
}: {
  value: PendingAdd | null;
  children: React.ReactNode;
}) {
  return <PendingAddContext.Provider value={value}>{children}</PendingAddContext.Provider>;
}

export function usePendingAdd(): PendingAdd | null {
  return useContext(PendingAddContext);
}
