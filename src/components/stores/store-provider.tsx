"use client";

// The reader's store (design #3200), handed to every price surface below a page without threading a prop through the
// builder. Outside a provider it is Mana Pool, the default, so a surface no page has moved yet reads as it shipped.

import { createContext, useContext, type ReactNode } from "react";
import { STORE_INFO, type StoreInfo } from "../../lib/stores/info";
import type { Store } from "../../lib/stores/rows";

const StoreContext = createContext<Store>("manapool");

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The reader's store as the copy and links read it. */
export function useStoreInfo(): StoreInfo {
  return STORE_INFO[useContext(StoreContext)];
}
