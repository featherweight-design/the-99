"use client";

import { createContext, useContext } from "react";

/**
 * Feature switches the deck page reads on the server and hands to client components that sit
 * several layers down, where drilling a prop would thread it through every component between.
 * Holds `socialFriends` and `spareAsks`; the deck page's older switches are still passed as props.
 *
 * The default is every switch OFF, so a component rendered outside the provider (a test, a
 * specimen on /about) draws exactly what it drew before the switch existed.
 */
export type DeckPageSwitchState = {
  /** `SOCIAL_FRIENDS_ENABLED` for the reader: the stand-ins modal reads friends' spares (Social R2 PR 8a). */
  socialFriends: boolean;
  /** `SOCIAL_FRIENDS_ENABLED` for the reader: Shopping's spares modal offers Ask and the rows draw the ask's mark (PR 3b). */
  spareAsks: boolean;
};

const OFF: DeckPageSwitchState = { socialFriends: false, spareAsks: false };

const DeckPageSwitchContext = createContext<DeckPageSwitchState>(OFF);

export function DeckPageSwitches({
  socialFriends = false,
  spareAsks = false,
  children,
}: Partial<DeckPageSwitchState> & { children: React.ReactNode }) {
  return (
    <DeckPageSwitchContext.Provider value={{ socialFriends, spareAsks }}>{children}</DeckPageSwitchContext.Provider>
  );
}

export function useDeckPageSwitches(): DeckPageSwitchState {
  return useContext(DeckPageSwitchContext);
}
