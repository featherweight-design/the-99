"use client";

// FITS YOUR DECKS' PICKER (swap tools PR 5b, R2–R4 and the addendum): which of the reader's decks a
// card would fit, stacked over the card it was opened from. 560 on desktop, from 52px on the phone,
// through the same chrome as every other sheet over a card.
//
// Read when it opens, never shipped with the card (`loadFitsAction`). After an Add the read is taken
// again, so the copies line and every row's Add or Add to buy come from the server's own count rather
// than a claim model restated here. The rows keep the order they opened in, so the deck just added
// to stays where the reader pressed it, stamped `in the draft`.
import { useCallback, useEffect, useRef, useState } from "react";

import type { BrowseCard } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { addFromFits, loadFitsAction } from "../../lib/swaps/actions";
import type { FitDeck, FitsRead } from "../../lib/swaps/fits";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { ModalChrome } from "../decks/receipt-modal";
import { colorsOf, FitsHolds, FitsPlate, FitsRows, FitsStapleNote } from "./fits-rows";
import { Crown } from "../ui/crown";
import { SheetLoading } from "../ui/sheet-loading";

const copy = swapToolsCopy.fits;


type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; read: FitsRead };
type Added = { deckId: string; note: string };

/**
 * The free list's state, shared by the stacked picker and Find a deck's in-dialog view: the read
 * when it opens, the rows in the order they opened in, and the Add with its re-read. `refresh` takes
 * the read again (after a swap from the read, say), so the copies come from the server's count.
 */
/** What a list drew last, kept by its owner so a return draws it at once (Find a deck's view, a round trip). */
export type FitsListSnapshot = {
  read: FitsRead; rows: FitDeck[];
  /** This visit's Add stamps and the decks an add found already holding the card, so a return keeps both. */
  added: { deckId: string; note: string }[]; heldAlready: string[];
};

export function useFitsList(card: BrowseCard, initial: FitsListSnapshot | null = null) {
  // A snapshot draws at once and is read again behind it: what is on screen stays until the new read lands.
  const [load, setLoad] = useState<Load>(() => (initial ? { state: "ready", read: initial.read } : { state: "loading" }));
  const [added, setAdded] = useState<Added[]>(() => initial?.added ?? []);
  const [refused, setRefused] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // One mutation at a time across the list and anything drawn beside it (the read's rows share it).
  const inFlight = useRef(false);
  const claim = useCallback(() => {
    if (inFlight.current) return false;
    inFlight.current = true;
    return true;
  }, []);
  const release = useCallback(() => { inFlight.current = false; }, []);
  // A write made beside the list (a read row's Swap in or Add only): the payload's count is spent too.
  const [wrote, setWrote] = useState(false);
  // The rows as the picker opened: an add re-reads the counts, never the order.
  const [rows, setRows] = useState<FitDeck[] | null>(() => initial?.rows ?? null);
  // Decks an add found already holding the card: they leave the list for `already holds it`.
  const [heldAlready, setHeldAlready] = useState<string[]>(() => initial?.heldAlready ?? []);

  // Every read of the list is numbered, and only the newest one asked lands: a slow read from before
  // a write must never replace what a later read says about the copies left or the decks holding it.
  const asked = useRef(0);
  // The read behind a restored snapshot: if it fails, the snapshot stays (nothing newer landed), and the
  // view is as it was. Any later read, a write's included, fails as before.
  const restoring = useRef(initial !== null);
  const readList = useCallback(() => {
    const n = ++asked.current;
    return loadFitsAction(card.oracleId)
      .catch(() => null)
      .then((r) => {
        const keepRestored = restoring.current && !r;
        restoring.current = false;
        if (n === asked.current && !keepRestored) {
          setLoad(r ? { state: "ready", read: r } : { state: "failed" });
          if (r) setRows((prev) => prev ?? r.fits);
        }
        return r;
      });
  }, [card.oracleId]);
  const fetchRead = useCallback(() => { void readList(); }, [readList]);
  useEffect(fetchRead, [fetchRead]);
  const retry = () => {
    setLoad({ state: "loading" });
    fetchRead();
  };

  const name = card.printedName ?? card.name;
  const read = load.state === "ready" ? load.read : null;
  // Known before the read lands, off the card payload, so the loading state draws it too (F15).
  const owned = read ? read.owned : card.quantity;
  const free = read ? read.free ?? 0 : card.availability?.free ?? 0;
  const freeNow = Math.max(0, free);
  // The payload's count is the card as it opened, so once an add has spent a copy only a read knows.
  // Before a read, the payload's count stands only when its availability read worked: a null there is
  // an unknown count, never `none free`.
  const countsKnown = read !== null || (!wrote && added.length === 0 && card.availability != null);

  const add = async (deck: FitDeck) => {
    if (!claim()) return;
    setBusy(deck.id);
    setRefused(null);
    const freeBefore = freeNow;
    try {
      const result = await addFromFits(deck.id, card.oracleId);
      if (!result.ok) {
        setRefused(deck.id);
        return;
      }
      const after = await readList();
      if (result.held) {
        // Nothing was written and no copy used, so no stamp: the re-read lists the deck under holds.
        setHeldAlready((h) => [...h, deck.id]);
        return;
      }
      // A re-read that failed says nothing about the copies left, so the note makes no claim that
      // the last one went: it names only what the add itself used.
      const note = freeBefore === 0
        ? copy.addedToBuy
        : after && Math.max(0, after.free ?? 0) === 0 ? copy.addedUsedLast : copy.addedFree;
      // A failed re-read leaves no count to draw: the old one is spent, and every row's Add or Add to
      // buy would be a claim about it. So the picker fails (`readList`), and Try again reads the count.
      setAdded((a) => [...a, { deckId: deck.id, note }]);
    } catch {
      setRefused(deck.id);
    } finally {
      release();
      setBusy(null);
    }
  };

  const noteFor = (id: string) => added.find((a) => a.deckId === id)?.note ?? null;
  const shown = (rows ?? []).filter((r) => !heldAlready.includes(r.id));
  const holds = read?.holds.filter((h) => !added.some((a) => a.deckId === h.id)) ?? [];
  const role = read?.card.role ?? "other";

  /** Re-reads the list. `afterWrite`: the caller just wrote, so a failed re-read leaves no count. */
  const refresh = useCallback(async (afterWrite = false) => {
    if (afterWrite) {
      setWrote(true);
      restoring.current = false;
    }
    return readList();
  }, [readList]);

  return { load, read, name, owned, freeNow, countsKnown, busy, refused, add, noteFor, shown, opened: rows, added, heldAlready, holds, role, retry, refresh, claim, release };
}

export function FitsPicker({ card, onClose }: { card: BrowseCard; onClose: () => void }) {
  const { load, read, name, owned, freeNow, countsKnown, busy, refused, add, noteFor, shown, holds, role, retry } = useFitsList(card);

  return (
    // The combo piece previews like a decklist name, raised above the sheet; it opens under the pointer that pressed it.
    <HoverPreviewProvider waitForMove>
    <ModalChrome
      title={copy.pickerTitle}
      closeLabel={swapToolsCopy.sheet.backToCardAria(name)}
      onClose={onClose}
      width={560}
      // 16px at both widths, line-height 1.2 (the picker's head, §2.2), where the chrome's default is 15px on a phone.
      titleClassName="truncate text-[16px] leading-[1.2]"
      overCard={{ name, backAria: swapToolsCopy.sheet.backToCardAria(name) }}
    >
      <div data-testid="fits-picker" className="flex flex-col gap-[14px] px-[16px] pt-[14px] pb-[24px] md:px-[18px] md:pt-[16px] md:pb-[20px]">
        <FitsPlate
          name={name}
          imageUri={card.imageUri}
          colorIdentity={card.colorIdentity}
          owned={owned}
          freeNow={freeNow}
          countsKnown={countsKnown}
        />

        {read?.staple ? <FitsStapleNote name={name} role={role} /> : null}

        {load.state === "loading" ? <SheetLoading heading={copy.loadingHeading} status={copy.loadingStatus} compact /> : null}

        {load.state === "failed" ? (
          <div
            role="alert"
            className="flex flex-col items-center text-center px-[20px] pt-[30px] pb-[26px] rounded-[10px] border border-[color:var(--border)]"
            style={{ background: "var(--surface)" }}
          >
            <Crown tone="quiet" />
            <span className="mt-[18px] font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--danger)" }}>
              {swapToolsCopy.sheet.failed.tag}
            </span>
            <h3 className="m-0 mt-[8px] w-full font-display font-bold text-[18px] leading-[1.25] [text-wrap:balance]" style={{ color: "var(--fg)" }}>
              {copy.failed.heading}
            </h3>
            <p className="m-0 mt-[10px] max-w-[420px] text-[13px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>
              {copy.failed.body}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-[18px] inline-flex items-center justify-center h-[44px] md:h-auto px-[18px] md:px-[16px] md:py-[7px] rounded-[8px] md:rounded-[7px] text-[13px] md:text-[12.5px] leading-none font-semibold bg-transparent cursor-pointer border border-solid border-[color:var(--accent)] text-[color:var(--accent-text)]"
            >
              {swapToolsCopy.sheet.retry}
            </button>
          </div>
        ) : null}

        {read && shown.length === 0 && read.holds.length > 0 ? (
          <p className="m-0 text-[13px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>{copy.allHold(name)}</p>
        ) : null}
        {read && shown.length === 0 && read.holds.length === 0 ? (
          <p className="m-0 text-[13px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>
            {read.card.colorIdentity.length === 1
              ? copy.noneByColorsOne(name, colorsOf(read.card.colorIdentity))
              : copy.noneByColors(name, colorsOf(read.card.colorIdentity), read.card.colorIdentity.length)}
          </p>
        ) : null}

        {read && shown.length > 0 ? (
          <FitsRows
            rows={shown}
            staple={read.staple}
            cardName={name}
            freeNow={freeNow}
            busy={busy}
            refused={refused}
            noteFor={noteFor}
            onAdd={(deck) => void add(deck)}
          />
        ) : null}

        {read && holds.length > 0 ? <FitsHolds holds={holds} /> : null}
      </div>
    </ModalChrome>
    </HoverPreviewProvider>
  );
}
