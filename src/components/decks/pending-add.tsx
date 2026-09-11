"use client";

// Which decklist rows the draft added — the brass rule the list draws, and the
// word a screen reader hears in their place.

import { createContext, useContext } from "react";

export type PendingAdd = {
  /** The draft's added cards. A set rather than the change list, because the
   *  question a row asks is one boolean about itself. */
  oracleIds: Set<string>;
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
