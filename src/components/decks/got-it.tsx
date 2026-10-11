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
import { GotItReceipt, type GotItWritten } from "./got-it-receipt";

type Target = { card: DeckDetailCard; name: string; newestAsOf: Date | null };
type Receipt = { card: DeckDetailCard; name: string; written: GotItWritten };

const NONE: ReadonlyMap<string, DeckDetailCard> = new Map();
const NO_IDS: ReadonlySet<string> = new Set();

export type GotIt = {
  deckId: string;
  /** The card whose confirm is open, or null. */
  openFor: string | null;
  /** That confirm's write is in flight. */
  pending: boolean;
  open: (card: DeckDetailCard, name: string, newestAsOf: Date | null, trigger: HTMLElement) => void;
  /**
   * The rows bought in this read of the list, as they were drawn before the write (call 8). The
   * decklist draws one as a held slot where its row was while the card is off the Shopping list,
   * so the slot holds across the action's revalidation, which no longer lists the card.
   */
  held: ReadonlyMap<string, DeckDetailCard>;
  /** Cards whose undo brought the row back: it fades in where the slot was. */
  returning: ReadonlySet<string>;
  /** The card an undo is in flight for: its tag is disabled (A9). */
  undoingFor: string | null;
  /** The list is read again (a tab switch): every held slot goes. */
  clearHeld: () => void;
};

const GotItContext = createContext<GotIt | null>(null);

export function useGotIt(): GotIt | null {
  return useContext(GotItContext);
}

export function GotItProvider({ deckId, children }: { deckId: string; children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [held, setHeld] = useState<ReadonlyMap<string, DeckDetailCard>>(NONE);
  const [returning, setReturning] = useState<ReadonlySet<string>>(NO_IDS);
  const [undoingFor, setUndoingFor] = useState<string | null>(null);
  // Focus goes back to the tag that opened the confirm, held explicitly: a pointer press does not
  // focus a button in every browser. After a write the row usually leaves before the confirm
  // unmounts, so a tag no longer in the document hands focus to the Shopping filter instead.
  const trigger = useRef<HTMLElement | null>(null);
  // The confirm's card, read when its write lands.
  const current = useRef<Target | null>(null);
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
    current.current = { card, name, newestAsOf };
    setPending(false);
    setTarget(current.current);
  }, []);
  const close = useCallback(() => {
    current.current = null;
    setPending(false);
    setTarget(null);
  }, []);
  // The write landed: the confirm closes, the row's slot is held, and the receipt replaces any
  // standing one (call 5: "or until the next write").
  const done = useCallback((written: GotItWritten) => {
    const t = current.current;
    close();
    if (!t) return;
    const id = t.card.oracleId;
    setHeld((h) => new Map(h).set(id, t.card));
    setReturning((r) => (r.has(id) ? new Set([...r].filter((x) => x !== id)) : r));
    setReceipt({ card: t.card, name: t.name, written });
  }, [close]);
  const undone = useCallback((oracleId: string) => {
    setHeld((h) => {
      if (!h.has(oracleId)) return h;
      const next = new Map(h);
      next.delete(oracleId);
      return next;
    });
    setReturning((r) => new Set(r).add(oracleId));
  }, []);
  const clearHeld = useCallback(() => {
    setHeld(NONE);
    setReturning(NO_IDS);
  }, []);
  const expire = useCallback(() => setReceipt(null), []);
  const value = useMemo<GotIt>(
    () => ({ deckId, openFor: target?.card.oracleId ?? null, pending, open, held, returning, undoingFor, clearHeld }),
    [deckId, target, pending, open, held, returning, undoingFor, clearHeld],
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
          // write in it: the row leaves into its held slot, or redraws in place if it stays.
          onDone={done}
        />
      ) : null}
      {receipt ? (
        <GotItReceipt
          key={receipt.written.entryId}
          deckId={deckId}
          oracleId={receipt.card.oracleId}
          cardName={receipt.name}
          written={receipt.written}
          onUndoing={setUndoingFor}
          onUndone={undone}
          onExpire={expire}
        />
      ) : null}
    </GotItContext.Provider>
  );
}
