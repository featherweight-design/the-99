"use client";

// Which decklist rows the draft changed — the brass rule the list draws, and the
// word a screen reader hears in their place.

import { createContext, useContext } from "react";

/** What the version held of a card, and what the draft holds. `from` is 0 for a
 *  card the version did not have at all — the plain add. Both above zero is a
 *  quantity move, up or down, which the row prints rather than leaving as a bare
 *  name. `to` is never 0: a card the draft cut entirely has no row left to rule. */
export type PendingChangeMove = { from: number; to: number };

export type PendingChange = {
  /** The draft's changed cards, each against the move that changed it. A map
   *  rather than a set of ids, because a row whose count merely moved has to
   *  print the pair, and membership alone cannot express one. */
  moves: Map<string, PendingChangeMove>;
};

/**
 * A context rather than a prop, for the reason `pass-mark.tsx` gives: the row is
 * mounted from five call sites behind three intermediate components, and the
 * mark is one boolean per row. Null outside a provider, which is every deck with
 * no draft.
 */
const PendingChangeContext = createContext<PendingChange | null>(null);

export function PendingChangeProvider({
  value,
  children,
}: {
  value: PendingChange | null;
  children: React.ReactNode;
}) {
  return <PendingChangeContext.Provider value={value}>{children}</PendingChangeContext.Provider>;
}

export function usePendingChange(): PendingChange | null {
  return useContext(PendingChangeContext);
}
