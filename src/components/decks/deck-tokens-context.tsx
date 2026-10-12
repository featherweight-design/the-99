"use client";

import { createContext, useContext } from "react";
import type { ProvenanceForm } from "../../lib/decks/price";
import type { DeckTokensRead } from "../../lib/tokens/read";

/**
 * The deck's tokens, read on the server and handed to the decklist several layers down, where drilling
 * a prop would thread it through the builder shell. Absent (null) wherever the switch is off, which is
 * exactly what a component rendered outside the provider sees: the Tokens group then draws nothing.
 */
type DeckTokensValue = { deckId: string; read: DeckTokensRead; provenance: ProvenanceForm | null } | null;

const DeckTokensContext = createContext<DeckTokensValue>(null);

export function DeckTokensProvider({
  deckId, read, provenance = null, children,
}: {
  deckId: string;
  read: DeckTokensRead;
  /**
   * Dates the buy box's COMBINED figure, built on the server (`provenanceForm` pins the clock there): the
   * older of the card prices' date and the token prices', because the token ingest can refuse and leave its
   * prices behind the cards'. Null when the deck has no priced token.
   */
  provenance?: ProvenanceForm | null;
  children: React.ReactNode;
}) {
  return <DeckTokensContext.Provider value={{ deckId, read, provenance }}>{children}</DeckTokensContext.Provider>;
}

export function useDeckTokens(): DeckTokensValue {
  return useContext(DeckTokensContext);
}
