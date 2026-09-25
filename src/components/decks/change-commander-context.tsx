"use client";
// Change commander's client state: which door opened the sheet, and the deck it is for. Mounted
// around the deck page's shell ONLY with `CHANGE_COMMANDER_ENABLED` on, the way
// `SwapToolsProvider` is, so with the switch off `useChangeCommander()` is null and every consumer
// draws what it drew before.
//
// The provider does NOT render the sheet. The card modal a name opens needs `CardDetailProvider`,
// which lives inside the shell this wraps, so the door that was pressed renders it (through a
// portal, since one of the two spines is always `display: none`).

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type DoorWidth = "desktop" | "mobile";

type Door = {
  deckId: string;
  deckName: string;
  pair: boolean;
  /** False for a brew: the confirm then says only another change undoes it. */
  hasVersion: boolean;
  /** The door whose sheet is open, or null. */
  openFrom: DoorWidth | null;
  openSheet: (from: DoorWidth) => void;
  closeSheet: () => void;
};

const Context = createContext<Door | null>(null);

export function useChangeCommander(): Door | null {
  return useContext(Context);
}

export function ChangeCommanderProvider({
  deckId, deckName, pair, hasVersion, children,
}: {
  deckId: string;
  deckName: string;
  pair: boolean;
  hasVersion: boolean;
  children: ReactNode;
}) {
  const [openFrom, setOpenFrom] = useState<DoorWidth | null>(null);
  const value = useMemo(() => ({
    deckId, deckName, pair, hasVersion, openFrom,
    openSheet: (from: DoorWidth) => setOpenFrom(from),
    closeSheet: () => setOpenFrom(null),
  }), [deckId, deckName, pair, hasVersion, openFrom]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
