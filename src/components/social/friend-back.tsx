"use client";
// The friend head's way back (FromDeck D4): the layout mounts the head once over every tab and reads no address, so the
// Spares tab, which does, hands the head the place Open the trade came from (`resolveTradeBack`, checked on the
// server). Leaving the tab hands it back, and the head draws `‹ Friends` again.
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import type { FriendBack } from "../../lib/social/trade-back";

const Ctx = createContext<{ back: FriendBack | null; set: (b: FriendBack | null) => void } | null>(null);

export function FriendBackProvider({ children }: { children: ReactNode }) {
  const [back, set] = useState<FriendBack | null>(null);
  return <Ctx.Provider value={{ back, set }}>{children}</Ctx.Provider>;
}

/** The head's origin, or null for the plain `‹ Friends`. */
export function useFriendBack(): FriendBack | null {
  return useContext(Ctx)?.back ?? null;
}

/** Sets the head's origin while mounted; draws nothing. */
export function FriendBackFrom({ back }: { back: FriendBack | null }) {
  const set = useContext(Ctx)?.set;
  const href = back?.href;
  const label = back?.label;
  useLayoutEffect(() => {
    if (!set) return;
    set(href !== undefined && label !== undefined ? { href, label } : null);
    return () => set(null);
  }, [set, href, label]);
  return null;
}
