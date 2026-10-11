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

type Target = { card: DeckDetailCard; name: string; newestAsOf: Date | null };
type Receipt = { card: DeckDetailCard; name: string; written: GotItWritten; failed?: boolean };

const NONE: ReadonlyMap<string, DeckDetailCard> = new Map();
const NO_IDS: ReadonlySet<string> = new Set();
const BOUGHT_NONE: ReadonlyMap<string, { card: DeckDetailCard; live: number }> = new Map();
/** How long an undo waits for the refreshed list before reading the one it has. */
const REFRESH_WAIT_MS = 5000;

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
  /** The cards an undo is in flight for, whichever toast is showing: their tags are disabled (A9). */
  undoing: ReadonlySet<string>;
  /** The list is read again (a tab switch): every held slot goes. */
  clearHeld: () => void;
  /**
   * The Shopping list registers how to ask whether it bills a card now, so an undo can tell a row
   * that left from one that stayed even when the write's facts are unknown (an idempotent retry).
   */
  registerList: (bills: ((oracleId: string) => boolean) | null) => void;
};

const GotItContext = createContext<GotIt | null>(null);

export function useGotIt(): GotIt | null {
  return useContext(GotItContext);
}

export function GotItProvider({ deckId, children }: { deckId: string; children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // One baseline per card, the row as first drawn, until the list is read again, with how many
  // live purchases hold it: a second press keeps the first snapshot (it pins the row's group), and
  // undoing one purchase leaves the baseline while another stands.
  const [bought, setBought] = useState<ReadonlyMap<string, { card: DeckDetailCard; live: number }>>(BOUGHT_NONE);
  const held = useMemo<ReadonlyMap<string, DeckDetailCard>>(
    () => (bought.size === 0 ? NONE : new Map([...bought].map(([id, b]) => [id, b.card]))),
    [bought],
  );
  const [returning, setReturning] = useState<ReadonlySet<string>>(NO_IDS);
  const [undoing, setUndoing] = useState<ReadonlySet<string>>(NO_IDS);
  const list = useRef<((oracleId: string) => boolean) | null>(null);
  // Every fresh list registers anew; an undo waits for one newer than its request.
  const generation = useRef(0);
  const waiters = useRef<(() => void)[]>([]);
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
    setBought((b) => {
      const was = b.get(id);
      return new Map(b).set(id, was ? { card: was.card, live: was.live + 1 } : { card: t.card, live: 1 });
    });
    setReturning((r) => (r.has(id) ? new Set([...r].filter((x) => x !== id)) : r));
    setReceipt({ card: t.card, name: t.name, written });
  }, [close]);
  const undoHost = useMemo(() => ({
    start: (id: string) => setUndoing((u) => (u.has(id) ? u : new Set(u).add(id))),
    end: (id: string) => setUndoing((u) => (u.has(id) ? new Set([...u].filter((x) => x !== id)) : u)),
    onList: (id: string) => list.current?.(id) ?? null,
    generation: () => generation.current,
    afterRefresh: (since: number) => new Promise<void>((resolve) => {
      if (generation.current > since) return resolve();
      // Bounded: a list that never re-renders (the page left) must not hold the undo for good.
      const timer = setTimeout(resolve, REFRESH_WAIT_MS);
      waiters.current.push(() => {
        clearTimeout(timer);
        resolve();
      });
    }),
    // Called once the refreshed list has landed. A row that came back fades in where its slot was;
    // one purchase is released, and the baseline goes with the last.
    undone: (id: string, back: boolean) => {
      if (back) setReturning((r) => new Set(r).add(id));
      setBought((b) => {
        const was = b.get(id);
        if (!was) return b;
        const next = new Map(b);
        if (was.live > 1) next.set(id, { card: was.card, live: was.live - 1 });
        else next.delete(id);
        return next;
      });
    },
  }), []);
  const registerList = useCallback((bills: ((oracleId: string) => boolean) | null) => {
    list.current = bills;
    if (!bills) return;
    generation.current += 1;
    const ready = waiters.current;
    waiters.current = [];
    ready.forEach((w) => w());
  }, []);
  const clearHeld = useCallback(() => {
    setBought(BOUGHT_NONE);
    setReturning(NO_IDS);
  }, []);
  const expire = useCallback(() => setReceipt(null), []);
  // An undo that fails after a newer write replaced its toast brings that receipt back in its
  // failed form (an alert pointing to History), so the failure is never silent.
  const hostFor = (r: Receipt): GotItUndoHost => ({
    ...undoHost,
    failedAway: () => setReceipt((cur) => (cur?.written.entryId === r.written.entryId ? cur : { ...r, failed: true })),
  });
  const value = useMemo<GotIt>(
    () => ({ deckId, openFor: target?.card.oracleId ?? null, pending, open, held, returning, undoing, clearHeld, registerList }),
    [deckId, target, pending, open, held, returning, undoing, clearHeld, registerList],
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
