"use client";
// Change commander's client state: whether the sheet is open, and for which deck. Mounted around
// the deck page's shell ONLY with `CHANGE_COMMANDER_ENABLED` on, the way `SwapToolsProvider` is, so
// with the switch off `useChangeCommander()` is null and every consumer draws what it drew before.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ChangeCommanderSheet } from "./change-commander-sheet";

type Door = { pair: boolean; openSheet: () => void };

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
  /** False for a brew: the confirm's "where it lands" line then says only another change undoes it. */
  hasVersion: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openSheet = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ pair, openSheet }), [pair, openSheet]);
  return (
    <Context.Provider value={value}>
      {children}
      {open ? (
        <ChangeCommanderSheet
          deckId={deckId}
          deckName={deckName}
          pair={pair}
          hasVersion={hasVersion}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Context.Provider>
  );
}
