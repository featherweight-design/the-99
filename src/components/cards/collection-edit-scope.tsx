"use client";
// Add a card from anywhere, D (READINESS O3): card details' `Add to collection` / `Edit copies` link draws wherever
// card details opens inside the signed-in shell. The shell mounts this scope once, around the card search, so every
// `CardDetailProvider` under it (a deck page, a friend's deck, the search layer's own, the cart) turns the link on by
// default. A provider outside it (a signed-out page, which gets no shell) keeps it off, so a public page draws none.
//
// A context of its own, holding one constant: the providers read it once and never re-render for it.

import { createContext, useContext, type ReactNode } from "react";

const CollectionEditScopeContext = createContext(false);

export function CollectionEditScope({ children }: { children: ReactNode }) {
  return <CollectionEditScopeContext.Provider value>{children}</CollectionEditScopeContext.Provider>;
}

/** True inside the signed-in shell, where card details can add to the reader's collection. */
export function useCollectionEditScope(): boolean {
  return useContext(CollectionEditScopeContext);
}
