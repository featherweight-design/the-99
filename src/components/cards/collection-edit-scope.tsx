"use client";
// Add a card from anywhere, D (READINESS O3): card details' `Add to collection` / `Edit copies` link draws wherever
// card details opens inside the signed-in shell. The shell mounts this scope once, around the card search, so every
// `CardDetailProvider` under it (a deck page, a friend's deck, the search layer's own, the cart) turns the link on by
// default. A provider outside it (a signed-out page, which gets no shell) keeps it off, so a public page draws none.
//
// The public card page (`/card/[slug]`) is outside it even for a signed-in reader, who still gets the shell there
// (READINESS O3: not the public card page). A context of its own, so the providers re-render only when it flips.

import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

const CollectionEditScopeContext = createContext(false);

export function CollectionEditScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <CollectionEditScopeContext.Provider value={!isPublicCardPath(pathname)}>{children}</CollectionEditScopeContext.Provider>;
}

/** The public card page and anything under it. */
export function isPublicCardPath(pathname: string | null): boolean {
  return pathname === "/card" || (pathname?.startsWith("/card/") ?? false);
}

/** True inside the signed-in shell, where card details can add to the reader's collection. */
export function useCollectionEditScope(): boolean {
  return useContext(CollectionEditScopeContext);
}
