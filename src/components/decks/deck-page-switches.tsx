"use client";

import { createContext, useContext } from "react";

/**
 * Feature switches the deck page reads on the server and hands to client components that sit
 * several layers down, where drilling a prop would thread it through every component between.
 * Holds `howItWorks` and `socialFriends`; the deck page's older switches are still passed as props.
 *
 * The default is every switch OFF, so a component rendered outside the provider (a test, a
 * specimen on /about) draws exactly what it drew before the switch existed.
 */
export type DeckPageSwitchState = {
  howItWorks: boolean;
  /** `SOCIAL_FRIENDS_ENABLED` for the reader: the stand-ins modal reads friends' spares (Social R2 PR 8a). */
  socialFriends: boolean;
  /** `SPARE_REQUESTS_ENABLED` for the reader: Shopping's spares modal offers Ask and the rows draw the ask's mark (PR 3b). */
  spareRequests: boolean;
};

const OFF: DeckPageSwitchState = { howItWorks: false, socialFriends: false, spareRequests: false };

const DeckPageSwitchContext = createContext<DeckPageSwitchState>(OFF);

export function DeckPageSwitches({
  howItWorks,
  socialFriends = false,
  spareRequests = false,
  children,
}: Pick<DeckPageSwitchState, "howItWorks"> & Partial<DeckPageSwitchState> & { children: React.ReactNode }) {
  return (
    <DeckPageSwitchContext.Provider value={{ howItWorks, socialFriends, spareRequests }}>{children}</DeckPageSwitchContext.Provider>
  );
}

export function useDeckPageSwitches(): DeckPageSwitchState {
  return useContext(DeckPageSwitchContext);
}
