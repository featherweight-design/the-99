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
import { GotItReceipt, type GotItUndoHost, type GotItWritten } from "./got-it-receipt";

type Target = { card: DeckDetailCard; name: string; newestAsOf: Date | null; onClose?: (wrote: boolean) => void };

/**
 * How a confirm opened from somewhere other than its row's tag hears it close. Card details pass it
 * (A11): the card is held under the confirm while it is up, so the caller withdraws that hold, re-reads
 * the card after a write, and returns focus itself, since the link it was opened from is inert until
 * the card comes back.
 */
export type GotItOpenOptions = { onClose: (wrote: boolean) => void };
type Receipt = { card: DeckDetailCard; name: string; written: GotItWritten; failed?: boolean };

const NONE: ReadonlyMap<string, DeckDetailCard> = new Map();
const NO_IDS: ReadonlySet<string> = new Set();

export type GotIt = {
  deckId: string;
  /** The card whose confirm is open, or null. */
  openFor: string | null;
  /** That confirm's write is in flight. */
  pending: boolean;
  open: (card: DeckDetailCard, name: string, newestAsOf: Date | null, trigger: HTMLElement, opts?: GotItOpenOptions) => void;
  /**
   * The rows bought in this read of the list, as they were drawn before the write (call 8). The
   * decklist draws one as a held slot where its row was while the card is off the Shopping list,
   * so the slot holds across the action's revalidation, which no longer lists the card.
   */
  held: ReadonlyMap<string, DeckDetailCard>;
  /** The cards an undo is in flight for, whichever toast is showing: their tags are disabled (A9). */
  undoing: ReadonlySet<string>;
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
  // One baseline per card, the row as first drawn, until the list is read again: a second press
  // keeps the first snapshot (it pins the row's group), and an undo releases nothing. The decklist
  // draws the slot only while the list omits the card, so it steps aside once the card is billed.
  const [held, setHeld] = useState<ReadonlyMap<string, DeckDetailCard>>(NONE);
  const [undoing, setUndoing] = useState<ReadonlySet<string>>(NO_IDS);
  // Focus goes back to the tag that opened the confirm, held explicitly: a pointer press does not
  // focus a button in every browser. After a write the row usually leaves before the confirm
  // unmounts, so a tag no longer in the document hands focus to the Shopping filter instead.
  const trigger = useRef<HTMLElement | null>(null);
  const selfFocus = useRef(false);
  // The confirm's card, read when its write lands.
  const current = useRef<Target | null>(null);
  const returnFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        // A caller that hears the close returns focus itself (`GotItOpenOptions`). Read from the
        // trigger's own slot: the confirm's card is cleared before the dialog unmounts.
        if (selfFocus.current) return null;
        const el = trigger.current;
        return el?.isConnected ? el : document.querySelector<HTMLElement>("[data-shopping-filter]");
      },
    }),
    [],
  );
  const open = useCallback((card: DeckDetailCard, name: string, newestAsOf: Date | null, from: HTMLElement, opts?: GotItOpenOptions) => {
    // Replacing an open confirm closes it unwritten, so a caller holding a card hears that.
    current.current?.onClose?.(false);
    trigger.current = from;
    selfFocus.current = opts !== undefined;
    current.current = { card, name, newestAsOf, onClose: opts?.onClose };
    setPending(false);
    setTarget(current.current);
  }, []);
  const close = useCallback((wrote = false) => {
    const closing = current.current;
    current.current = null;
    setPending(false);
    setTarget(null);
    closing?.onClose?.(wrote);
  }, []);
  // The write landed: the confirm closes, the row's slot is held, and the receipt replaces any
  // standing one (call 5: "or until the next write").
  const done = useCallback((written: GotItWritten) => {
    const t = current.current;
    close(true);
    if (!t) return;
    const id = t.card.oracleId;
    setHeld((h) => (h.has(id) ? h : new Map(h).set(id, t.card)));
    setReceipt({ card: t.card, name: t.name, written });
  }, [close]);
  const undoHost = useMemo(() => ({
    start: (id: string) => setUndoing((u) => (u.has(id) ? u : new Set(u).add(id))),
    end: (id: string) => setUndoing((u) => (u.has(id) ? new Set([...u].filter((x) => x !== id)) : u)),
  }), []);
  const clearHeld = useCallback(() => setHeld(NONE), []);
  const expire = useCallback(() => setReceipt(null), []);
  // An undo that fails after a newer write replaced its toast brings that receipt back in its
  // failed form (an alert pointing to History), so the failure is never silent.
  const hostFor = (r: Receipt): GotItUndoHost => ({
    ...undoHost,
    failedAway: () => setReceipt((cur) => (cur?.written.entryId === r.written.entryId ? cur : { ...r, failed: true })),
  });
  const value = useMemo<GotIt>(
    () => ({ deckId, openFor: target?.card.oracleId ?? null, pending, open, held, undoing, clearHeld }),
    [deckId, target, pending, open, held, undoing, clearHeld],
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
          onClose={() => close()}
          // The action invalidates the deck page before it answers, so the list re-reads with the
          // write in it: the row leaves into its held slot, or redraws in place if it stays.
          onDone={done}
        />
      ) : null}
      {receipt ? (
        <GotItReceipt
          key={`${receipt.written.entryId}${receipt.failed ? ":failed" : ""}`}
          deckId={deckId}
          oracleId={receipt.card.oracleId}
          cardName={receipt.name}
          written={receipt.written}
          failed={receipt.failed}
          host={hostFor(receipt)}
          onExpire={expire}
        />
      ) : null}
    </GotItContext.Provider>
  );
}
