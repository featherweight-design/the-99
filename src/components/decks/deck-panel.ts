"use client";

import { createContext, useContext, useState } from "react";
import type { DeckPanel } from "./group-toggle";

// Which body the All / Shopping / Stats control shows: the list, or Stats.
//
// HELD BY THE BUILDER FOR ONE VISIT TO ONE DECK, never stored. It was a per-device preference
// (`the99:deck-panel` in localStorage), so a reader who looked at Stats in one deck found the next
// deck opening on Stats instead of its list. The builder stays mounted across its own tab
// switches and `[id]/page.tsx` keys it by deck, so state held there survives in-deck navigation
// and resets when a deck is opened.
//
// The list remounts on a tab switch, which is why the state lives above it. Rendered with no
// builder around it (its own tests), the list keeps the choice itself.

export type DeckPanelState = readonly [DeckPanel, (next: DeckPanel) => void];

export const DeckPanelContext = createContext<DeckPanelState | null>(null);

export function useDeckPanel(): DeckPanelState {
  const own = useState<DeckPanel>("list");
  return useContext(DeckPanelContext) ?? own;
}
