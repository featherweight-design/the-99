"use client";

import { createContext, useContext } from "react";
import type { DeckTokensRead } from "../../lib/tokens/read";

/**
 * The deck's tokens, read on the server and handed to the decklist several layers down, where drilling
 * a prop would thread it through the builder shell. Absent (null) wherever the switch is off, which is
 * exactly what a component rendered outside the provider sees: the Tokens group then draws nothing.
 */
type DeckTokensValue = { deckId: string; read: DeckTokensRead } | null;

const DeckTokensContext = createContext<DeckTokensValue>(null);

export function DeckTokensProvider({
  deckId, read, children,
}: { deckId: string; read: DeckTokensRead; children: React.ReactNode }) {
  return <DeckTokensContext.Provider value={{ deckId, read }}>{children}</DeckTokensContext.Provider>;
}

export function useDeckTokens(): DeckTokensValue {
  return useContext(DeckTokensContext);
}
