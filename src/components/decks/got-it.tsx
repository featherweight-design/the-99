"use client";

/**
 * I got it on a deck page (collection home sub-project 4, plan PR 2): which Shopping row's confirm
 * is open, whether its write is in flight, and the one confirm itself. Mounted by the deck page ONLY
 * when `shoppingMarkBoughtEnabled()` (both switches), so a row reading `null` draws main's inert
 * tag, main's phone stack and no key item (E1). The swap tools reach their rows the same way.
 *
 * One confirm across the list (B11): opening one replaces whatever was open, and the confirm is a
 * modal, so no other row's tag can be pressed while it is up.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

import type { DeckDetailCard } from "../../lib/decks/grouping";
import { GotItConfirm } from "./got-it-confirm";

type Target = { card: DeckDetailCard; name: string; newestAsOf: Date | null };

export type GotIt = {
  deckId: string;
  /** The card whose confirm is open, or null. */
  openFor: string | null;
  /** That confirm's write is in flight. */
  pending: boolean;
  open: (card: DeckDetailCard, name: string, newestAsOf: Date | null, trigger: HTMLElement) => void;
};

const GotItContext = createContext<GotIt | null>(null);

export function useGotIt(): GotIt | null {
  return useContext(GotItContext);
}

export function GotItProvider({ deckId, children }: { deckId: string; children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [pending, setPending] = useState(false);
  // Focus goes back to the tag that opened the confirm, held explicitly: a pointer press does not
  // focus a button in every browser. After a write the row usually leaves before the confirm
  // unmounts, so a tag no longer in the document hands focus to the Shopping filter instead.
  const trigger = useRef<HTMLElement | null>(null);
  const returnFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        const el = trigger.current;
        return el?.isConnected ? el : document.querySelector<HTMLElement>("[data-shopping-filter]");
      },
    }),
    [],
  );
  const open = useCallback((card: DeckDetailCard, name: string, newestAsOf: Date | null, from: HTMLElement) => {
    trigger.current = from;
    setPending(false);
    setTarget({ card, name, newestAsOf });
  }, []);
  const close = useCallback(() => {
    setPending(false);
    setTarget(null);
  }, []);
  const value = useMemo<GotIt>(
    () => ({ deckId, openFor: target?.card.oracleId ?? null, pending, open }),
    [deckId, target, pending, open],
  );
  return (
    <GotItContext.Provider value={value}>
      {children}
      {target ? (
        <GotItConfirm
          // A fresh form per card: nothing chosen for one card may carry into another's.
          key={target.card.oracleId}
          deckId={deckId}
          card={target.card}
          cardName={target.name}
          newestAsOf={target.newestAsOf}
          onPendingChange={setPending}
          returnFocusRef={returnFocus}
          onClose={close}
          // The action invalidates the deck page before it answers, so the list re-reads with the
          // write in it and the row leaves on its own. The receipt is PR 3's.
          onDone={close}
        />
      ) : null}
    </GotItContext.Provider>
  );
}
