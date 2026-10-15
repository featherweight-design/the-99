"use client";

import { createContext, useContext } from "react";

/**
 * Feature switches the deck page reads on the server and hands to client components that sit
 * several layers down, where drilling a prop would thread it through every component between.
 * Holds `howItWorks`, `socialFriends` and `phoneShoppingRowB`; the deck page's older switches are still passed as props.
 *
 * The default is every switch OFF, so a component rendered outside the provider (a test, a
 * specimen on /about) draws exactly what it drew before the switch existed.
 */
export type DeckPageSwitchState = {
  howItWorks: boolean;
  /** `SOCIAL_FRIENDS_ENABLED` for the reader: the stand-ins modal reads friends' spares (Social R2 PR 8a). */
  socialFriends: boolean;
  /** `PHONE_SHOPPING_ROW_B_ENABLED` for the reader: the phone Shopping row's option B (Social R2 PR 7). */
  phoneShoppingRowB: boolean;
};

const OFF: DeckPageSwitchState = { howItWorks: false, socialFriends: false, phoneShoppingRowB: false };

const DeckPageSwitchContext = createContext<DeckPageSwitchState>(OFF);

export function DeckPageSwitches({
  howItWorks,
  socialFriends = false,
  phoneShoppingRowB = false,
  children,
}: Pick<DeckPageSwitchState, "howItWorks"> & Partial<DeckPageSwitchState> & { children: React.ReactNode }) {
  return (
    <DeckPageSwitchContext.Provider value={{ howItWorks, socialFriends, phoneShoppingRowB }}>{children}</DeckPageSwitchContext.Provider>
  );
}

export function useDeckPageSwitches(): DeckPageSwitchState {
  return useContext(DeckPageSwitchContext);
}
