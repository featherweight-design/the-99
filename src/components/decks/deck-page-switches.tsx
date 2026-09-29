"use client";

import { createContext, useContext } from "react";

/**
 * Feature switches the deck page reads on the server and hands to client components that sit
 * several layers down, where drilling a prop would thread it through every component between.
 * Holds only `howItWorks` for now; the deck page's older switches are still passed as props.
 *
 * The default is every switch OFF, so a component rendered outside the provider (a test, a
 * specimen on /about) draws exactly what it drew before the switch existed.
 */
export type DeckPageSwitchState = { howItWorks: boolean };

const OFF: DeckPageSwitchState = { howItWorks: false };

const DeckPageSwitchContext = createContext<DeckPageSwitchState>(OFF);

export function DeckPageSwitches({ howItWorks, children }: DeckPageSwitchState & { children: React.ReactNode }) {
  return <DeckPageSwitchContext.Provider value={{ howItWorks }}>{children}</DeckPageSwitchContext.Provider>;
}

export function useDeckPageSwitches(): DeckPageSwitchState {
  return useContext(DeckPageSwitchContext);
}
