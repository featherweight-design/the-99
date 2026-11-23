"use client";

// The reader's store (design #3200), handed to every price surface below a page without threading a prop through the
// builder. Outside a provider it is Mana Pool, the default, so a surface no page has moved yet reads as it shipped.
// `canChange` is whether the reader may choose a store at all (`STORE_PREFERENCE_ENABLED` on for them): it draws the
// Change store link (call 2). Off, or outside a provider (the landing demo), no link is drawn.

import { createContext, useContext, type ReactNode } from "react";
import { STORE_INFO, type StoreInfo } from "../../lib/stores/info";
import type { Store } from "../../lib/stores/rows";

const StoreContext = createContext<{ store: Store; canChange: boolean }>({ store: "manapool", canChange: false });

export function StoreProvider({ store, canChange = false, children }: { store: Store; canChange?: boolean; children: ReactNode }) {
  return <StoreContext.Provider value={{ store, canChange }}>{children}</StoreContext.Provider>;
}

/** The reader's store as the copy and links read it. */
export function useStoreInfo(): StoreInfo {
  return STORE_INFO[useContext(StoreContext).store];
}

/** Whether the reader may change their store, so Change store is drawn. */
export function useCanChangeStore(): boolean {
  return useContext(StoreContext).canChange;
}
