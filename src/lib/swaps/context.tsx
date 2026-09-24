"use client";

/**
 * What a deck page's swap surfaces need to know: that the tools are on, which deck this is, and the
 * limit it marks against. Mounted by the deck page ONLY when `SWAP_TOOLS_ENABLED` is set, so a
 * surface reading `null` draws nothing of the swap tools. That is how the flag reaches a row
 * without threading a prop through every component between the page and it.
 */
import { createContext, useContext, type ReactNode } from "react";

import { effectiveLimit } from "./limit";

export type SwapTools = {
  deckId: string;
  /** The deck's name, for the stand-ins sheet's `replacing, in {deck}`. */
  deckName: string;
  /** The deck's own limit, in cents; null for the $10 default. */
  storedLimitCents: number | null;
  /** The limit rows are marked against: the stored one, or the default. */
  limitCents: number;
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
  return (
    <SwapToolsContext.Provider value={{ deckId, deckName, storedLimitCents, limitCents: effectiveLimit(storedLimitCents) }}>
      {children}
    </SwapToolsContext.Provider>
  );
}

/** The deck's swap tools, or null when the flag is off (or outside a deck page). */
export function useSwapTools(): SwapTools | null {
  return useContext(SwapToolsContext);
}
