"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Sibling, SiblingCard } from "../cards/card-detail-provider";

/**
 * The deck page's card list, in the order the decklist draws it, for the header's commander opens.
 *
 * The commander's card details used to open with no list, so it read "1 of 1" with both arrows
 * dead (Hugh, 2026-10-13: it should step on into the deck). The header and the decklist are
 * siblings on the page, and the list's order is the decklist's own (its grouping, its sort, the
 * spent cards it leaves out), so the decklist PUBLISHES what it draws and the header reads it.
 *
 * A store rather than state in the provider: the decklist re-renders on every edit, and lifting
 * its list into state would re-render the whole page with it. Only a reader re-renders, and only
 * when the ids or art in the list actually change.
 */
type Store = {
  get: () => readonly SiblingCard[];
  publish: (list: readonly SiblingCard[]) => void;
  subscribe: (notify: () => void) => () => void;
};

const EMPTY: readonly SiblingCard[] = [];
// Every field the modal draws from a sibling, so a printing pick that renames or re-arts a card
// reaches the reader.
const keyOf = (list: readonly SiblingCard[]) =>
  list.map((c) => `${c.oracleId}|${c.name ?? ""}|${c.imageUri ?? ""}|${c.colorIdentity?.join("") ?? ""}`).join("\n");

function createStore(): Store {
  let list = EMPTY;
  let key = "";
  const listeners = new Set<() => void>();
  return {
    get: () => list,
    publish(next) {
      const nextKey = keyOf(next);
      if (nextKey === key) return;
      list = next;
      key = nextKey;
      for (const notify of listeners) notify();
    },
    subscribe(notify) {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
  };
}

const DeckSiblingsContext = createContext<Store | null>(null);
const NO_SUBSCRIPTION = () => () => {};

export function DeckSiblingsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);
  return <DeckSiblingsContext.Provider value={store}>{children}</DeckSiblingsContext.Provider>;
}

/**
 * The decklist hands over the list it draws. A no-op outside a provider. When the decklist
 * unmounts (another tab, or an emptied deck) the list goes with it, so the commander pages alone
 * rather than through a list that may have changed since.
 */
export function usePublishDeckSiblings(list: readonly SiblingCard[]) {
  const store = useContext(DeckSiblingsContext);
  useEffect(() => {
    store?.publish(list);
  }, [store, list]);
  useEffect(() => () => store?.publish(EMPTY), [store]);
}

/**
 * What a commander's card details page through on the deck page: the commanders first, then the
 * deck's cards as the decklist draws them. `undefined` outside a provider, which opens the card
 * alone exactly as before.
 *
 * Before the decklist has drawn (another tab is open, or it has not mounted yet) the list is the
 * commanders alone.
 */
export function useCommanderSiblings(commanders: readonly SiblingCard[]): readonly Sibling[] | undefined {
  const store = useContext(DeckSiblingsContext);
  const list = useSyncExternalStore(
    store?.subscribe ?? NO_SUBSCRIPTION,
    () => store?.get() ?? EMPTY,
    () => EMPTY,
  );
  // Keyed on the commanders' content, so a caller building the array inline does not rebuild the
  // list on every render.
  const key = keyOf(commanders);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is `commanders`' content
  const heads = useMemo(() => commanders, [key]);
  return useMemo(() => {
    if (!store) return undefined;
    const ids = new Set(heads.map((c) => c.oracleId));
    return [...heads, ...list.filter((c) => !ids.has(c.oracleId))];
  }, [store, list, heads]);
}
