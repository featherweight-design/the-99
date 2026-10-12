"use client";
// I got it from the all-decks cart (cart PR 6, handoff S1 to S5). One confirm per line, for every
// selected deck on it, through `markBoughtForDecks`: one press, one id, one write (audit G2). The
// receipt says which decks the copies covered, read after the write (lock 7), and a line the cart
// no longer lists keeps a held slot where it was until the cart is next read.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { markBoughtForDecks } from "../../../app/decks/mark-bought-actions";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import type { SelectedLine } from "../../../lib/decks/cart";
import type { CartReceiptFacts } from "../../../lib/decks/mark-bought";
import { GotItConfirmForm } from "../got-it-confirm";
import { GotItReceipt, type GotItUndoHost, type GotItWritten } from "../got-it-receipt";
import { lineFact } from "./cart-line";

const MONO_LABEL = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";

type Target = { line: SelectedLine };
type Written = GotItWritten<CartReceiptFacts>;
type Receipt = { line: SelectedLine; written: Written; failed?: boolean };

/** A line bought this visit: the line as drawn before the first press, and every copy added since. */
export type CartHeld = { line: SelectedLine; added: number };

const NONE: ReadonlyMap<string, CartHeld> = new Map();
const NO_IDS: ReadonlySet<string> = new Set();

export type CartGotIt = {
  /** The line whose confirm is open, or null. */
  openFor: string | null;
  /** That confirm's write is in flight. */
  pending: boolean;
  open: (line: SelectedLine, trigger: HTMLElement) => void;
  /**
   * The lines bought this visit (S3, S4). The cart draws one as a held slot where it was while the
   * read no longer lists it, and an `added this visit` note under it while it does.
   */
  held: ReadonlyMap<string, CartHeld>;
  /** The lines an undo is in flight for: their tags are disabled (A9). */
  undoing: ReadonlySet<string>;
};

const CartGotItContext = createContext<CartGotIt | null>(null);

export function useCartGotIt(): CartGotIt | null {
  return useContext(CartGotItContext);
}

/**
 * The receipt's body (S3, S4, S6): the decks the read says the copies covered, then what is still
 * short. A deck the read lists no claim for is named from the cart's own list.
 */
export function cartReceiptBody(facts: CartReceiptFacts | null, deckNames: ReadonlyMap<string, string>): string | null {
  if (!facts) return null;
  const name = (d: { deckId: string; deckName: string }) => d.deckName || deckNames.get(d.deckId) || "";
  const parts: string[] = [];
  if (facts.covered.length > 0) parts.push(copy.receipt.covered(facts.covered.map(name)));
  if (facts.still.length === 1) parts.push(copy.receipt.still(name(facts.still[0]), facts.still[0].need));
  if (facts.still.length > 1) {
    parts.push(copy.receipt.stillMany(facts.still.length, facts.still.reduce((n, d) => n + d.need, 0)));
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * The printing a cart line's confirm presets: the pick its decks share, else the first deck's,
 * which is the first selected row's either way. A first deck with no printing presets nothing.
 */
function presetPrinting(line: SelectedLine): string | null {
  return line.selectedRows[0]?.printing ?? null;
}

export function CartGotItProvider({
  deckNames, newestAsOf, children,
}: {
  deckNames: ReadonlyMap<string, string>;
  /** The price table's newest `as_of`, which decides whether a line's figure is live. */
  newestAsOf: Date | null;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [held, setHeld] = useState<ReadonlyMap<string, CartHeld>>(NONE);
  const [undoing, setUndoing] = useState<ReadonlySet<string>>(NO_IDS);
  // Focus goes back to the tag that opened the confirm; a tag gone from the document after a write
  // hands it to the checkout instead.
  const trigger = useRef<HTMLElement | null>(null);
  const current = useRef<Target | null>(null);
  const returnFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        const el = trigger.current;
        return el?.isConnected ? el : document.querySelector<HTMLElement>("[data-cart-checkout]");
      },
    }),
    [],
  );
  const open = useCallback((line: SelectedLine, from: HTMLElement) => {
    trigger.current = from;
    current.current = { line };
    setPending(false);
    setTarget({ line });
  }, []);
  const close = useCallback(() => {
    current.current = null;
    setPending(false);
    setTarget(null);
  }, []);
  const done = useCallback((written: Written) => {
    const t = current.current;
    close();
    if (!t) return;
    const id = t.line.oracleId;
    // The first press's line pins the slot; every press adds its copies.
    setHeld((h) => new Map(h).set(id, { line: h.get(id)?.line ?? t.line, added: (h.get(id)?.added ?? 0) + written.quantity }));
    setReceipt({ line: t.line, written });
  }, [close]);
  const undoHost = useMemo(() => ({
    start: (id: string) => setUndoing((u) => (u.has(id) ? u : new Set(u).add(id))),
    end: (id: string) => setUndoing((u) => (u.has(id) ? new Set([...u].filter((x) => x !== id)) : u)),
  }), []);
  const expire = useCallback(() => setReceipt(null), []);
  const hostFor = (r: Receipt): GotItUndoHost => ({
    ...undoHost,
    failedAway: () => setReceipt((cur) => (cur?.written.entryId === r.written.entryId ? cur : { ...r, failed: true })),
  });
  const value = useMemo<CartGotIt>(
    () => ({ openFor: target?.line.oracleId ?? null, pending, open, held, undoing }),
    [target, pending, open, held, undoing],
  );
  return (
    <CartGotItContext.Provider value={value}>
      {children}
      {target ? (
        <CartConfirm
          key={target.line.oracleId}
          line={target.line}
          deckNames={deckNames}
          newestAsOf={newestAsOf}
          onPendingChange={setPending}
          returnFocusRef={returnFocus}
          onClose={close}
          onDone={done}
        />
      ) : null}
      {receipt ? (
        <GotItReceipt
          key={`${receipt.written.entryId}${receipt.failed ? ":failed" : ""}`}
          deckId={receipt.line.selectedRows.map((r) => r.deckId)}
          oracleId={receipt.line.oracleId}
          cardName={receipt.line.name}
          written={receipt.written}
          body={cartReceiptBody(receipt.written.facts, deckNames)}
          placement="cart"
          failed={receipt.failed}
          host={hostFor(receipt)}
          onExpire={expire}
        />
      ) : null}
    </CartGotItContext.Provider>
  );
}

function CartConfirm({
  line, deckNames, newestAsOf, onPendingChange, returnFocusRef, onClose, onDone,
}: {
  line: SelectedLine;
  deckNames: ReadonlyMap<string, string>;
  newestAsOf: Date | null;
  onPendingChange: (pending: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onDone: (written: Written) => void;
}) {
  const deckIds = line.selectedRows.map((r) => r.deckId);
  // The figure the line drew, carrying the printing to preset: the confirm presets only a live one.
  // Memoized on the opened line: the form re-reads its choices whenever `price` changes, and a
  // fresh object every render would reset the player's printing on a stale or refused press.
  const price = useMemo(() => {
    const fact = lineFact(line, newestAsOf);
    const printing = presetPrinting(line);
    return fact && printing ? { ...fact, printing: { scryfallId: printing } } : fact;
  }, [line, newestAsOf]);
  return (
    <GotItConfirmForm<CartReceiptFacts>
      oracleId={line.oracleId}
      price={price}
      initialNeed={line.copies}
      listQuantity={line.copies}
      cardName={line.name}
      newestAsOf={newestAsOf}
      write={async (input) => {
        const out = await markBoughtForDecks(line.oracleId, { deckIds, ...input });
        return "applied" in out ? out : "stale" in out ? out : { failed: true };
      }}
      needLine={(need) => copy.confirm.need(need, deckIds.length)}
      staleLine={{ owed: copy.confirm.staleBody, done: copy.confirm.staleBodyDone }}
      footer={<p className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.confirm.readAgain}</p>}
      onPendingChange={onPendingChange}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
      onDone={onDone}
    >
      <div className="flex flex-col gap-[8px]">
        <span className={MONO_LABEL}>{copy.confirm.forDecks(deckIds.length)}</span>
        <ul className="m-0 flex list-none flex-col rounded-[9px] bg-[color:var(--surface-sunken)] px-[12px] py-[2px]">
          {line.selectedRows.map((r) => (
            <li key={r.deckId} className="flex min-h-[36px] items-center justify-between gap-[10px]">
              <span className="min-w-0 text-[13px] leading-[1.4] text-[color:var(--fg-body)] [text-wrap:pretty]">{deckNames.get(r.deckId) ?? ""}</span>
              <span className="flex-none font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.confirm.needsEach(r.quantity)}</span>
            </li>
          ))}
        </ul>
        {line.owned > 0 ? (
          <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
            {line.heldElsewhere === line.owned ? copy.list.owned(line.owned) : copy.list.ownedSome(line.owned, line.heldElsewhere)}
          </span>
        ) : null}
      </div>
    </GotItConfirmForm>
  );
}
