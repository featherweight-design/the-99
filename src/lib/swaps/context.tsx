"use client";

/**
 * What a deck page's swap surfaces need to know: that the tools are on, which deck this is, and the
 * limit it marks against. Mounted by the deck page ONLY when `SWAP_TOOLS_ENABLED` is set, so a
 * surface reading `null` draws nothing of the swap tools. That is how the flag reaches a row
 * without threading a prop through every component between the page and it.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { DeckDetailCard } from "../decks/grouping";
import { effectiveLimit } from "./limit";

export type SwapTools = {
  deckId: string;
  /** The deck's name, for the stand-ins sheet's `replacing, in {deck}`. */
  deckName: string;
  /** The deck's own limit, in cents; null for the $10 default. */
  storedLimitCents: number | null;
  /** The limit rows are marked against: the stored one, or the default. */
  limitCents: number;
  /** The takes made on this visit, each drawn in its cut row's slot until it is undone. */
  receipts: SwapReceipt[];
  addReceipt: (r: SwapReceipt) => void;
  dropReceipt: (swapId: string) => void;
  /**
   * The row whose stand-ins sheet is open, as it was when pressed. Held here rather than by the row,
   * because a take removes the row from the list and the sheet has to outlive it to show `taken`.
   */
  standIns: DeckDetailCard | null;
  openStandIns: (card: DeckDetailCard) => void;
  closeStandIns: () => void;
};

/**
 * What a take leaves on the Shopping list. It lives for the visit, like any client cache here: the
 * swap itself is stored (`deck_swaps`) and Undo swap reads it back by id, but the receipt is the
 * page's note that it happened, and a reload shows the deck as it now stands.
 */
export type SwapReceipt = {
  swapId: string;
  cutOracleId: string;
  cut: string;
  add: string;
  /** The type group the cut sat in, so the receipt draws in its slot. */
  group: string;
  /** From the take's own read, never the list's (audit note). */
  free: boolean;
  /** Copies of the cut still in the draft: the row stays and the receipt sits under it. */
  cutLeft: number;
};

const SwapToolsContext = createContext<SwapTools | null>(null);

export function SwapToolsProvider({
  deckId,
  deckName,
  storedLimitCents,
  children,
}: {
  deckId: string;
  deckName: string;
  storedLimitCents: number | null;
  children: ReactNode;
}) {
  const [receipts, setReceipts] = useState<SwapReceipt[]>([]);
  const [standIns, setStandIns] = useState<DeckDetailCard | null>(null);
  const closeStandIns = useCallback(() => setStandIns(null), []);
  const addReceipt = useCallback((r: SwapReceipt) => setReceipts((all) => [...all.filter((x) => x.swapId !== r.swapId), r]), []);
  const dropReceipt = useCallback((swapId: string) => setReceipts((all) => all.filter((x) => x.swapId !== swapId)), []);
  const value = useMemo(
    () => ({
      deckId, deckName, storedLimitCents, limitCents: effectiveLimit(storedLimitCents),
      receipts, addReceipt, dropReceipt, standIns, openStandIns: setStandIns, closeStandIns,
    }),
    [deckId, deckName, storedLimitCents, receipts, addReceipt, dropReceipt, standIns, closeStandIns],
  );
  return (
    <SwapToolsContext.Provider value={value}>
      {children}
    </SwapToolsContext.Provider>
  );
}

/** The deck's swap tools, or null when the flag is off (or outside a deck page). */
export function useSwapTools(): SwapTools | null {
  return useContext(SwapToolsContext);
}
