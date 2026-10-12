"use client";
// I got it from the all-decks cart (cart PR 6, handoff S1 to S5). One confirm per line, for every
// selected deck on it, through `markBoughtForDecks`: one press, one id, one write (audit G2). The
// receipt says which decks the copies covered, read after the write (lock 7), and a line the cart
// no longer lists keeps a held slot where it was until the cart is next read.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { markBoughtForDecks, readCartChooser } from "../../../app/decks/mark-bought-actions";
import type { ContestedCard } from "../../../lib/collection/summary-read";
import { ContestedCardRow } from "../contested-card-row";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import type { SelectedLine } from "../../../lib/decks/cart";
import type { CartReceiptFacts } from "../../../lib/decks/mark-bought";
import { GotItConfirmForm, type GotItFormState } from "../got-it-confirm";
import { GotItReceipt, type GotItUndoHost, type GotItWritten } from "../got-it-receipt";
import { lineFact } from "./cart-line";

const MONO_LABEL = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";

/** `names` is the cart's deck names when the confirm opened: see `Receipt`. */
type Target = { line: SelectedLine; names: ReadonlyMap<string, string> };
type Written = GotItWritten<CartReceiptFacts>;
/** `names` is the cart's deck names as the press saw them: a deck the purchase finished leaves the
 *  next read, and a receipt naming it from the live list would print an empty name. */
type Receipt = {
  line: SelectedLine; written: Written; names: ReadonlyMap<string, string>; failed?: boolean;
  /** The deck the S1b chooser named on the press, if any: the receipt says `as you picked`. */
  picked: string | null;
};

/**
 * A line bought this visit: the line as drawn before the first press (it pins the slot's place and name),
 * the copies added since and the decks those presses were for. Kept per PURCHASE (`purchases`, by ledger
 * entry) so an undo takes back exactly its own press and a second press for other decks adds to the first's
 * decks rather than being dropped; `added` and `deckIds` are what the purchases sum to.
 */
export type CartHeld = {
  line: SelectedLine;
  added: number;
  deckIds: ReadonlySet<string>;
  purchases: ReadonlyMap<string, { quantity: number; deckIds: readonly string[] }>;
};

function summed(line: SelectedLine, purchases: CartHeld["purchases"]): CartHeld {
  let added = 0;
  const deckIds = new Set<string>();
  for (const p of purchases.values()) {
    added += p.quantity;
    for (const d of p.deckIds) deckIds.add(d);
  }
  return { line, added, deckIds, purchases };
}

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
export function cartReceiptBody(
  facts: CartReceiptFacts | null, deckNames: ReadonlyMap<string, string>, picked: string | null = null,
): string | null {
  if (!facts) return null;
  const name = (d: { deckId: string; deckName: string }) => d.deckName || deckNames.get(d.deckId) || "";
  const parts: string[] = [];
  // `as you picked` only when the read agrees: the pick is a reservation, and a read that covers
  // other decks says so rather than echoing the press (lock 7).
  const asPicked = picked !== null && facts.covered.some((d) => d.deckId === picked);
  if (facts.covered.length > 0) parts.push(copy.receipt.covered(facts.covered.map(name), asPicked));
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
  // The names as of the latest render, taken when a confirm opens: the write's revalidation can
  // commit before its answer reaches `done`, and that read no longer lists a deck it finished.
  const namesRef = useRef(deckNames);
  useEffect(() => { namesRef.current = deckNames; }, [deckNames]);
  const current = useRef<Target | null>(null);
  const returnFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        const el = trigger.current;
        // Buying the last line takes the checkout away too: the empty page's way back is the last resort.
        return el?.isConnected
          ? el
          : document.querySelector<HTMLElement>("[data-cart-checkout]") ?? document.querySelector<HTMLElement>("[data-cart-empty-back]");
      },
    }),
    [],
  );
  const open = useCallback((line: SelectedLine, from: HTMLElement) => {
    trigger.current = from;
    current.current = { line, names: namesRef.current };
    setPending(false);
    setTarget(current.current);
  }, []);
  const close = useCallback(() => {
    current.current = null;
    setPending(false);
    setTarget(null);
  }, []);
  const done = useCallback((written: Written, picked: string | null) => {
    const t = current.current;
    close();
    if (!t) return;
    const id = t.line.oracleId;
    // The first press's line pins the slot; every press is its own purchase, with the decks it was for.
    setHeld((h) => {
      const prev = h.get(id);
      const purchases = new Map(prev?.purchases ?? []).set(written.entryId, {
        quantity: written.quantity,
        deckIds: t.line.selectedRows.map((r) => r.deckId),
      });
      return new Map(h).set(id, summed(prev?.line ?? t.line, purchases));
    });
    setReceipt({ line: t.line, written, names: t.names, picked });
  }, [close]);
  const undoHost = useMemo(() => ({
    start: (id: string) => setUndoing((u) => (u.has(id) ? u : new Set(u).add(id))),
    end: (id: string) => setUndoing((u) => (u.has(id) ? new Set([...u].filter((x) => x !== id)) : u)),
  }), []);
  const expire = useCallback(() => setReceipt(null), []);
  // A committed undo takes back its own purchase. A line left with none has nothing bought this visit.
  const undone = useCallback((id: string, entryId: string) => setHeld((h) => {
    const prev = h.get(id);
    if (!prev?.purchases.has(entryId)) return h;
    const purchases = new Map(prev.purchases);
    purchases.delete(entryId);
    const next = new Map(h);
    if (purchases.size === 0) next.delete(id);
    else next.set(id, summed(prev.line, purchases));
    return next;
  }), []);
  const hostFor = (r: Receipt): GotItUndoHost => ({
    ...undoHost,
    undone: (entryId) => undone(r.line.oracleId, entryId),
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
          body={cartReceiptBody(receipt.written.facts, receipt.names, receipt.picked)}
          // The pick the press wrote goes with the copy on Undo (decision 5): left standing, it would
          // hand the next copy to the deck this purchase chose, after the purchase was taken back.
          undoPlacement={receipt.picked ? { oracleId: receipt.line.oracleId, deckId: receipt.picked } : undefined}
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
  onDone: (written: Written, picked: string | null) => void;
}) {
  const deckIds = line.selectedRows.map((r) => r.deckId);
  // S1b: the line's claimants, read once per confirm, for the chooser drawn when fewer copies are
  // bought than there are decks. Until it lands, or if it fails, the decks are listed and the
  // default order decides.
  const [chooserCard, setChooserCard] = useState<ContestedCard | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const multi = deckIds.length > 1;
  const deckKey = deckIds.join(",");
  useEffect(() => {
    if (!multi) return;
    let live = true;
    readCartChooser(line.oracleId, deckKey.split(",")).then((c) => { if (live) setChooserCard(c); }).catch(() => {});
    return () => { live = false; };
  }, [line.oracleId, deckKey, multi]);
  const choosing = (quantity: number) => chooserCard !== null && quantity < deckIds.length;
  // The footer's way back announces itself, as a second tap on the picked deck does in the row.
  const [announce, setAnnounce] = useState("");
  const firstListed = chooserCard?.claimants.find((c) => line.selectedRows.some((r) => r.deckId === c.deckId && r.quantity > 0))?.deckName ?? "";
  // The pick the press sent, held for the receipt: the form reports only what was written.
  const sent = useRef<string | null>(null);
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
        const pickDeckId = choosing(input.quantity) ? picked : null;
        sent.current = pickDeckId;
        const out = await markBoughtForDecks(line.oracleId, { deckIds, pickDeckId, ...input });
        // A stale answer means ownership moved: the chooser's claimants and shortfalls were read
        // before it, so the confirm falls back to the plain list, and the default order, rather
        // than preview a split that no longer holds.
        if ("stale" in out) {
          setChooserCard(null);
          setPicked(null);
        }
        return "applied" in out ? out : "stale" in out ? out : { failed: true };
      }}
      needLine={(need) => copy.confirm.need(need, deckIds.length)}
      staleLine={{ owed: copy.confirm.staleBody, done: copy.confirm.staleBodyDone }}
      footer={({ quantity, pending }: GotItFormState) => (
        <>
          {choosing(quantity) && picked ? (
            <p className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">
              {copy.confirm.undo(deckNames.get(picked) ?? "")}{" "}
              <button
                type="button"
                // A pick moved mid-press would mint a new press id, and a retry after a lost answer
                // could then record the purchase twice: the decision holds until the press settles.
                disabled={pending}
                onClick={() => {
                  setPicked(null);
                  setAnnounce(copy.confirm.cleared(firstListed, line.name));
                }}
                className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-[12px] text-[color:var(--accent)]"
              >
                {copy.confirm.backToDefault}
              </button>
            </p>
          ) : null}
          <p className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.confirm.readAgain}</p>
          <span aria-live="polite" className="sr-only">{announce}</span>
        </>
      )}
      onPendingChange={onPendingChange}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
      decision={picked}
      onDone={(written) => onDone(written, sent.current)}
    >
      {({ quantity, pending }: GotItFormState) => (
      <div className="flex flex-col gap-[8px]">
        <span className={MONO_LABEL}>{copy.confirm.forDecks(deckIds.length)}</span>
        {choosing(quantity) && chooserCard ? (
          <CartChooser
            base={chooserCard}
            line={line}
            quantity={quantity}
            picked={picked}
            disabled={pending}
            // A pick clears the footer's announcement, so the next way back is announced again.
            onPick={(next) => { setAnnounce(""); setPicked(next); }}
          />
        ) : (
        <ul className="m-0 flex list-none flex-col rounded-[9px] bg-[color:var(--surface-sunken)] px-[12px] py-[2px]">
          {line.selectedRows.map((r) => (
            <li key={r.deckId} className="flex min-h-[36px] items-center justify-between gap-[10px]">
              <span className="min-w-0 text-[13px] leading-[1.4] text-[color:var(--fg-body)] [text-wrap:pretty]">{deckNames.get(r.deckId) ?? ""}</span>
              <span className="flex-none font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.confirm.needsEach(r.quantity)}</span>
            </li>
          ))}
        </ul>
        )}
        {line.owned > 0 ? (
          <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
            {line.heldElsewhere === line.owned ? copy.list.owned(line.owned) : copy.list.ownedSome(line.owned, line.heldElsewhere)}
          </span>
        ) : null}
      </div>
      )}
    </GotItConfirmForm>
  );
}

/**
 * S1b: the line's decks as the shipped Card Assignments chooser, previewing the copies being bought.
 * It is a preview over THIS LINE: the queue order is the claim model's, but the supply is the
 * stepper's count and each deck asks for what the line says it is short (`row.quantity`), not its
 * whole ask, since what it already holds is not being bought. Every deck claims hard here: a brew's
 * soft claim reads what the queue leaves without taking it, which would show every brew getting a
 * copy of two. A deck short of the card but left out of this visit is not drawn, though seniority
 * can still hand it an unpicked copy; `confirm.readAgain` says the read decides, and the receipt
 * names what it says (lock 7). Memoized, because the row adopts a new card as a fresh payload.
 */
function CartChooser({
  base, line, quantity, picked, disabled, onPick,
}: {
  base: ContestedCard;
  line: SelectedLine;
  quantity: number;
  picked: string | null;
  /** A press is in flight: the pick holds until it settles. */
  disabled: boolean;
  onPick: (deckId: string | null) => void;
}) {
  const card = useMemo<ContestedCard>(() => {
    const need = new Map(line.selectedRows.map((r) => [r.deckId, r.quantity]));
    return {
      ...base,
      owned: quantity,
      arrived: quantity,
      ownedBefore: 0,
      fromImport: false,
      claimants: base.claimants
        .filter((c) => (need.get(c.deckId) ?? 0) > 0)
        .map((c) => ({ ...c, quantity: need.get(c.deckId) ?? 0, commanderCopies: 0, brew: false, granted: 0 })),
    };
  }, [base, line, quantity]);
  return (
    <ContestedCardRow
      card={card}
      chooser={{ picked, onPick, disabled, cleared: (holder) => copy.confirm.cleared(holder, card.cardName) }}
    />
  );
}
