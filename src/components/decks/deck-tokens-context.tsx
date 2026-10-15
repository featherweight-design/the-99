"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ProvenanceForm } from "../../lib/decks/price";
import type { DeckTokensRead } from "../../lib/tokens/read";
import { TokenRefusalToast } from "./token-refusal-toast";

/**
 * The deck's tokens, read on the server and handed to the decklist several layers down, where drilling
 * a prop would thread it through the builder shell. Absent (null) wherever the switch is off, which is
 * exactly what a component rendered outside the provider sees: the Tokens group then draws nothing.
 */
type DeckTokensValue = {
  deckId: string; read: DeckTokensRead; provenance: ProvenanceForm | null; ownProvenance: ProvenanceForm | null;
  /** A token press the server refused or that threw: the one refusal toast of this deck (a newer replaces it). */
  refuse: (token: { oracleId: string; name: string }) => void;
  /** A new press of this token clears a refusal it left standing (a retry that lands must not leave "unchanged" up). */
  clear: (oracleId: string) => void;
  /** The refusal showing now, by the token it names (the oracle id identifies it, the name is for display): a sheet's own box
   *  announces it inside the dialog, since the toast is outside. */
  refusal: { oracleId: string; name: string; key: number } | null;
} | null;

const DeckTokensContext = createContext<DeckTokensValue>(null);

export function DeckTokensProvider({
  deckId, read, provenance = null, ownProvenance = null, children,
}: {
  deckId: string;
  read: DeckTokensRead;
  /**
   * Dates the buy box's COMBINED figure, built on the server (`provenanceForm` pins the clock there): the
   * older of the card prices' date and the token prices', because the token ingest can refuse and leave its
   * prices behind the cards'. Null when the deck has no priced token.
   */
  provenance?: ProvenanceForm | null;
  /** The token prices' own date, for a figure the cards contribute nothing to. Null when no token is priced. */
  ownProvenance?: ProvenanceForm | null;
  children: React.ReactNode;
}) {
  const [refusal, setRefusal] = useState<{ oracleId: string; name: string; key: number } | null>(null);
  const refuse = useCallback((token: { oracleId: string; name: string }) => setRefusal({ ...token, key: Date.now() }), []);
  const clear = useCallback((oracleId: string) => setRefusal((cur) => (cur?.oracleId === oracleId ? null : cur)), []);
  const value = useMemo(() => ({ deckId, read, provenance, ownProvenance, refuse, clear, refusal }), [deckId, read, provenance, ownProvenance, refuse, clear, refusal]);
  return (
    <DeckTokensContext.Provider value={value}>
      {children}
      {refusal ? <TokenRefusalToast key={refusal.key} name={refusal.name} onDone={() => setRefusal(null)} /> : null}
    </DeckTokensContext.Provider>
  );
}

export function useDeckTokens(): DeckTokensValue {
  return useContext(DeckTokensContext);
}
