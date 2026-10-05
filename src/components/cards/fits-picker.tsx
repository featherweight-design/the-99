"use client";

// FITS YOUR DECKS' PICKER (swap tools PR 5b, R2–R4 and the addendum): which of the reader's decks a
// card would fit, stacked over the card it was opened from. 560 on desktop, from 52px on the phone,
// through the same chrome as every other sheet over a card.
//
// Read when it opens, never shipped with the card (`loadFitsAction`). After an Add the read is taken
// again, so the copies line and every row's Add or Add to buy come from the server's own count rather
// than a claim model restated here. The rows keep the order they opened in, so the deck just added
// to stays where the reader pressed it, stamped `in the draft`.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BrowseCard } from "../../lib/collection/browse";
import { colorWords } from "../../lib/copy/color-labels";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { addFromFits, loadFitsAction } from "../../lib/swaps/actions";
import type { FitDeck, FitsRead } from "../../lib/swaps/fits";
import { MutationError } from "../decks/mutation-error";
import { ModalChrome } from "../decks/receipt-modal";
import { CardDetailTrigger } from "./card-detail-provider";
import { Crown } from "../ui/crown";

const copy = swapToolsCopy.fits;

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; read: FitsRead };
type Added = { deckId: string; note: string };

const colorsOf = (ids: string[]) => (ids.length === 0 ? "colorless" : colorWords(ids));

/**
 * The row's one reason line (addendum §1c): a combo the card completes, in --fg, the other piece dotted
 * and opening that card; else the theme it joins, in --fg-body; a staple's own form; then ` · this deck
 * {need}`. With no reason and no need the row draws no line (R2: never the shares).
 */
function ReasonLine({ deck, staple }: { deck: FitDeck; staple: boolean }) {
  const r = deck.reason;
  const lead = staple
    ? <span className="italic whitespace-nowrap text-[color:var(--fg-body)]">{copy.cmdrStaple}</span>
    : r?.kind === "combo"
      ? (
        <span className="whitespace-nowrap text-[color:var(--fg)]">
          {copy.reasonCombo}{" "}
          <CardDetailTrigger
            oracleId={r.with.oracleId}
            name={r.with.name}
            className="bg-transparent border-0 p-0 font-mono text-[10.5px] cursor-pointer text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]"
          >
            {r.with.name}
          </CardDetailTrigger>
        </span>
      )
      : r?.kind === "theme"
        ? <span className="whitespace-nowrap text-[color:var(--fg-body)]">{copy.reasonTheme(r.n, typeof r.theme === "string" ? copy.themeWord[r.theme] : r.theme.type)}</span>
        : null;
  if (!lead && !deck.need) return null;
  // The line wraps BETWEEN its segments only (close-out ruling 5): each segment is nowrap, and the dot
  // travels with the segment after it, so a wrap never strands it at a line's end (stand-in-limit.tsx).
  return (
    <p data-testid="fits-reason" className="m-0 font-mono text-[10.5px] leading-[1.45] text-[color:var(--fg-muted)]">
      {lead}
      {deck.need ? (
        <>
          {lead ? " " : null}
          <span data-testid="fits-reason-need" className="whitespace-nowrap">
            {lead ? <span className="text-[color:var(--border-strong)]">· </span> : null}
            <span className="text-[color:var(--fg-locked)]">{copy.needLabel} </span>
            {copy.need(deck.need.role, deck.need.have, deck.need.target)}
          </span>
        </>
      ) : null}
    </p>
  );
}

const deckLink =
  "flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap underline underline-offset-2 decoration-[color:var(--border-strong)]";

/**
 * The picker's card plate: the card, its identity, and its copies. Exported with `FitsRows` and
 * `FitsHolds` for the About page's Find a deck figure (E1), which draws them without the picker's
 * read. The picker renders all three, so they cannot drift from what it draws.
 */
export function FitsPlate({
  name, imageUri, colorIdentity, owned, freeNow, countsKnown,
}: {
  name: string;
  imageUri: string | null;
  colorIdentity: string[];
  owned: number;
  freeNow: number;
  countsKnown: boolean;
}) {
  return (
    <section
      data-testid="fits-plate"
      className="flex items-center gap-[10px] px-[12px] py-[10px] rounded-[10px] border border-[color:var(--border)]"
      style={{ background: "var(--bg)" }}
    >
      <span
        aria-hidden="true"
        className="flex-none w-[22px] h-[31px] rounded-[3px] border border-[color:var(--border-strong)] bg-cover bg-center"
        // The canvas's placeholder hatch (fits table §2.4) where the catalog has no art for the card.
        style={{ backgroundImage: imageUri ? `url(${imageUri})` : "repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)" }}
      />
      <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="text-[14px] font-semibold truncate" style={{ color: "var(--fg)" }}>{name}</span>
        <span className="font-mono text-[10.5px] truncate" style={{ color: "var(--fg-muted)" }}>
          {copy.identity(colorsOf(colorIdentity))}
        </span>
      </span>
      {countsKnown ? <span
        data-testid="fits-copies"
        className="flex-none font-mono text-[11.5px] whitespace-nowrap"
        style={{ color: freeNow > 0 ? "var(--fg-body)" : "var(--avail-hard-fg)" }}
      >
        {copy.copies(owned, freeNow)}
      </span> : null}
    </section>
  );
}

/** The decks that could take the card, in the order the read gave them, each with its Add. */
export function FitsRows({
  rows, staple, cardName, freeNow, busy, refused, noteFor, onAdd,
}: {
  rows: FitDeck[];
  staple: boolean;
  cardName: string;
  freeNow: number;
  /** The deck an add is in flight for: every Add waits for it. */
  busy: string | null;
  /** The deck whose add was refused. */
  refused: string | null;
  noteFor: (deckId: string) => string | null;
  onAdd: (deck: FitDeck) => void;
}) {
  return (
    <section className="flex flex-col" aria-label={copy.groupJoin}>
      {/* Addendum §1c: the order note at the heading's right. A staple's list stays by name, so it has none. */}
      <div className="flex items-baseline justify-between gap-[10px] pb-[6px] border-b border-[color:var(--border)]">
        <h3 className="m-0 font-mono text-[9.5px] font-normal tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
          {copy.groupJoin}
        </h3>
        {staple ? null : (
          <span className="font-mono text-[10px] whitespace-nowrap text-[color:var(--fg-locked)]">{copy.orderReasons}</span>
        )}
      </div>
      {rows.map((deck) => {
        const note = noteFor(deck.id);
        return (
          <div key={deck.id} data-testid="fits-row" className="flex flex-col gap-[5px] py-[10px] border-b border-[color:var(--border)]">
            <div className="flex items-center gap-[10px] min-w-0">
              <Link href={`/decks/${deck.id}`} aria-label={copy.deckLinkAria(deck.name)} className={`${deckLink} text-[13.5px] text-[color:var(--fg-body)]`}>
                {deck.name}
              </Link>
              {note ? (
                <span className="flex-none inline-flex items-center gap-[6px] min-h-[44px] md:min-h-0 font-mono text-[9.5px] tracking-[0.1em] uppercase" style={{ color: "var(--success)" }}>
                  <span aria-hidden="true" className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-[4px] border border-[color:var(--success)] text-[9px]">✓</span>
                  {copy.added}
                </span>
              ) : freeNow > 0 ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onAdd(deck)}
                  aria-label={copy.addUsesFreeAria(cardName, deck.name)}
                  className="flex-none inline-flex items-center justify-center h-[44px] min-w-[64px] px-[14px] rounded-[8px] text-[13px] md:h-[32px] md:min-w-0 md:px-[12px] md:rounded-[7px] md:text-[12px] leading-none font-semibold bg-transparent cursor-pointer border border-solid border-[color:var(--accent)] text-[color:var(--accent)] disabled:opacity-60"
                >
                  {copy.addUsesFree}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onAdd(deck)}
                  aria-label={copy.addToBuyAria(cardName, deck.name)}
                  className="flex-none inline-flex items-center justify-center h-[44px] px-[12px] rounded-[8px] text-[13px] md:h-[32px] md:px-[11px] md:rounded-[7px] md:text-[12px] leading-none font-medium whitespace-nowrap bg-transparent cursor-pointer border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)] disabled:opacity-60"
                >
                  {copy.addToBuy}
                </button>
              )}
            </div>
            <ReasonLine deck={deck} staple={staple} />
            {note ? (
              <p className="m-0 text-[12.5px]" style={{ color: "var(--fg-muted)" }}>
                {note}{" "}
                <Link href={`/decks/${deck.id}`} className="text-[color:var(--accent)] [border-bottom:1px_solid_var(--accent-shadow)]">
                  {copy.openDeck}
                </Link>
              </p>
            ) : null}
            {refused === deck.id ? <MutationError message={copy.addRefused} /> : null}
          </div>
        );
      })}
    </section>
  );
}

/** The decks that already hold the card. */
export function FitsHolds({ holds }: { holds: FitsRead["holds"] }) {
  return (
    <section className="flex flex-col" aria-label={copy.groupHolds}>
      <h3 className="m-0 pb-[6px] border-b border-[color:var(--border)] font-mono text-[9.5px] font-normal tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
        {copy.groupHolds}
      </h3>
      {holds.map((h) => (
        <div key={h.id} data-testid="fits-holds-row" className="flex items-center gap-[10px] min-h-[44px] md:min-h-[34px] border-b border-[color:var(--border)]">
          <Link href={`/decks/${h.id}`} aria-label={copy.deckLinkAria(h.name)} className={`${deckLink} text-[13px] text-[color:var(--fg-body)]`}>
            {h.name}
          </Link>
          <span className="flex-none font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{copy.holds(h.quantity)}</span>
        </div>
      ))}
    </section>
  );
}

export function FitsPicker({ card, onClose }: { card: BrowseCard; onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [added, setAdded] = useState<Added[]>([]);
  const [refused, setRefused] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false);
  // The rows as the picker opened: an add re-reads the counts, never the order.
  const [rows, setRows] = useState<FitDeck[] | null>(null);
  // Decks an add found already holding the card: they leave the list for `already holds it`.
  const [heldAlready, setHeldAlready] = useState<string[]>([]);

  const fetchRead = useCallback(() => {
    loadFitsAction(card.oracleId)
      .then((r) => {
        setLoad(r ? { state: "ready", read: r } : { state: "failed" });
        if (r) setRows((prev) => prev ?? r.fits);
      })
      .catch(() => setLoad({ state: "failed" }));
  }, [card.oracleId]);
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
  const countsKnown = read !== null || (added.length === 0 && card.availability != null);

  const add = async (deck: FitDeck) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(deck.id);
    setRefused(null);
    const freeBefore = freeNow;
    try {
      const result = await addFromFits(deck.id, card.oracleId);
      if (!result.ok) {
        setRefused(deck.id);
        return;
      }
      const after = await loadFitsAction(card.oracleId).catch(() => null);
      if (result.held) {
        // Nothing was written and no copy used, so no stamp: the re-read lists the deck under holds.
        setHeldAlready((h) => [...h, deck.id]);
        setLoad(after ? { state: "ready", read: after } : { state: "failed" });
        return;
      }
      // A re-read that failed says nothing about the copies left, so the note makes no claim that
      // the last one went: it names only what the add itself used.
      const note = freeBefore === 0
        ? copy.addedToBuy
        : after && Math.max(0, after.free ?? 0) === 0 ? copy.addedUsedLast : copy.addedFree;
      setAdded((a) => [...a, { deckId: deck.id, note }]);
      // A failed re-read leaves no count to draw: the old one is spent, and every row's Add or Add to
      // buy would be a claim about it. So the picker fails, and Try again reads the server's count.
      setLoad(after ? { state: "ready", read: after } : { state: "failed" });
    } catch {
      setRefused(deck.id);
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const noteFor = (id: string) => added.find((a) => a.deckId === id)?.note ?? null;
  const shown = (rows ?? []).filter((r) => !heldAlready.includes(r.id));
  const holds = read?.holds.filter((h) => !added.some((a) => a.deckId === h.id)) ?? [];
  const role = read?.card.role ?? "other";

  return (
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

        {read?.staple ? (
          <section data-testid="fits-staple-note" className="flex flex-col gap-[6px] px-[13px] py-[11px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)]">
            <span className="flex items-center gap-[7px] font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-body)" }}>
              <span aria-hidden="true" className="w-[7px] h-[7px] rounded-full border-[1.5px] border-[color:var(--fg-muted)]" />
              {copy.stapleLabel}
            </span>
            <p className="m-0 text-[12.5px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>
              {role === "other" ? copy.stapleNoteNoRole(name) : copy.stapleNote(name)}
            </p>
          </section>
        ) : null}

        {load.state === "loading" ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center text-center min-h-[230px] px-[20px] py-[24px] rounded-[10px]"
            style={{ background: "radial-gradient(380px 200px at 50% 70%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)" }}
          >
            <Crown pulse />
            <h3 className="m-0 mt-[20px] w-full font-display font-bold text-[18px] leading-[1.25] [text-wrap:balance]" style={{ color: "var(--fg)" }}>
              {copy.loadingHeading}
            </h3>
            <p className="m-0 mt-[8px] font-mono text-[12px]" style={{ color: "var(--fg-faint)" }}>{copy.loadingStatus}</p>
          </div>
        ) : null}

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
              className="mt-[18px] inline-flex items-center justify-center h-[44px] md:h-auto px-[18px] md:px-[16px] md:py-[7px] rounded-[8px] md:rounded-[7px] text-[13px] md:text-[12.5px] leading-none font-semibold bg-transparent cursor-pointer border border-solid border-[color:var(--accent)] text-[color:var(--accent)]"
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
  );
}
