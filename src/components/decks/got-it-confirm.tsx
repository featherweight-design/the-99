"use client";
// I got it's confirm (handoff R2 §B, plan PR 2): `Bought this card?`, the printing, its finish and
// how many, then one write. The app's normal modal on desktop (520px, the shared scrim, the round ✕,
// a focus trap) and the bottom sheet on the phone: one form, one element, as ConfirmModal draws it.
//
// The printing is required and shows no price (Hugh, 2026-10-10): the preset is the printing
// behind a LIVE figure, nothing otherwise, and a card's only printing is selected (gotItPreset).
// Nothing is written until Add; Cancel, Escape, the ✕ and a press outside write nothing.

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { loadPrintingChoices } from "../../app/collection/edit-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { FINISHES, type CollectionItemIdentity, type Finish } from "../../lib/collection/key";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { markBought } from "../../app/decks/mark-bought-actions";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { ReceiptFacts } from "../../lib/decks/mark-bought";
import type { PriceFact } from "../../lib/decks/price";
import { collapseTwins, finishFor, gotItNeed, gotItPreset, presetQuantity, rebaseStale, type GotItChoice } from "../../lib/decks/got-it-preset";
import { MARK_BOUGHT_MAX } from "../../lib/decks/mark-bought";
import { cssUrl } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { PrintingRegion } from "../cards/printing-region";
import type { GotItWritten } from "./got-it-receipt";

const c = gotItCopy.confirm;
const MONO_LABEL = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";
const BANNER =
  "flex gap-[10px] rounded-[8px] border border-solid border-[color:var(--border-strong)] [border-left:3px_solid_var(--warning)] bg-[color:var(--elevated-hover)] px-[12px] py-[10px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] outline-none";

// `staleRemoved`: the holding fell elsewhere. The banner's sentence names an addition, so only
// its title is drawn; the need line under the stepper carries the new need.
type Notice = "stale" | "staleRemoved" | "failed" | null;

/** What a press sends: one printing, its finish, the count to add and the count it was read at. */
export type GotItWriteInput = { scryfallId: string; finish: Finish; quantity: number; expected: number; id: string };

/**
 * What the write answered, as the confirm needs it. Every refusal folds into `failed`: nothing was
 * written and the choices stay (B9). The caller maps its own action's outcome onto this.
 */
export type GotItWriteResult<F> =
  | { applied: { id: string; receipt: F | null } }
  /** `need`, when the write knows it better than the holding does (the cart's roll-up). */
  | { stale: (CollectionItemIdentity & { quantity: number })[]; need?: number }
  | { failed: true };

type DeckConfirmProps = {
  deckId: string;
  card: DeckDetailCard;
  cardName: string;
  newestAsOf: Date | null;
  onClose: () => void;
  onDone: (written: GotItWritten) => void;
  onPendingChange: (pending: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** I got it on a deck's own Shopping row: one deck, through `markBought`. */
export function GotItConfirm({ deckId, card, ...rest }: DeckConfirmProps) {
  return (
    <GotItConfirmForm<ReceiptFacts>
      oracleId={card.oracleId}
      price={card.price}
      initialNeed={gotItNeed(card)}
      listQuantity={card.quantity}
      write={async (input) => {
        const out = await markBought(deckId, card.oracleId, input);
        return "applied" in out ? out : "stale" in out ? out : { failed: true };
      }}
      {...rest}
    />
  );
}

/**
 * The form itself, with its write injected: a deck's Shopping row (`GotItConfirm`, below) or a cart
 * line (cart PR 6). Everything a press decides (printing, finish, count, the press id, the stale
 * re-base) lives here once.
 */
/** What a confirm's caller can read of the form: the stepper's count. */
export type GotItFormState = { quantity: number };

export function GotItConfirmForm<F>({
  oracleId, price, initialNeed, listQuantity, write, needLine, staleLine, children, footer, decision,
  cardName, newestAsOf, onClose, onDone, onPendingChange, returnFocusRef,
}: {
  oracleId: string;
  /** The figure the row drew, which decides the preset printing (gotItPreset). */
  price: PriceFact | null | undefined;
  /** Copies still to buy, which the stepper presets to (capped at `MARK_BOUGHT_MAX`). */
  initialNeed: number;
  /** Copies the list asks for in all: a stale answer never re-bases the need above it. */
  listQuantity: number;
  /** The write: a deck's `markBought`, or the cart's `markBoughtForDecks`. */
  write: (input: GotItWriteInput) => Promise<GotItWriteResult<F>>;
  /** The line under the stepper; the deck's own by default (`gotItCopy.confirm.need`). */
  needLine?: (need: number) => ReactNode;
  /** The stale banner's body for a need still owed and for none; the deck's own by default. */
  staleLine?: { owed: (need: number) => string; done: string };
  /**
   * Drawn after the card's name: the cart's deck list, or its chooser. A function reads the
   * stepper's count.
   */
  children?: ReactNode | ((form: GotItFormState) => ReactNode);
  /** Drawn under the stepper: the cart's lock-7 sentence, and the chooser's undo. */
  footer?: ReactNode | ((form: GotItFormState) => ReactNode);
  /**
   * Anything else the caller's write depends on (the cart's S1b pick). A change is a new decision,
   * so a retry after it mints a new press id rather than replaying the old one.
   */
  decision?: unknown;
  /** The name the row prints. */
  cardName: string;
  /** The price table's newest `as_of`, which decides whether the row's figure is live. */
  newestAsOf: Date | null;
  onClose: () => void;
  /** The write landed: what it recorded, for the receipt (call 5). */
  onDone: (written: GotItWritten<F>) => void;
  /** The tag behind the scrim reads `adding…` while this is true (A8). */
  onPendingChange: (pending: boolean) => void;
  /** Where focus goes when the confirm closes: the tag that opened it, or a stable fallback. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const nameId = useId();
  const howManyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [choices, setChoices] = useState<GotItChoice[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [need, setNeed] = useState(initialNeed);
  const [qty, setQty] = useState(() => presetQuantity(initialNeed));
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState(false);
  // Minted once per decision and reused on a retry, so a press that did commit records once. Any
  // change to what would be written is a new decision.
  const pressId = useRef<string | null>(null);

  useDialogA11y(dialogRef, onClose, { closeOnEscape: !pending, returnFocusRef });

  useEffect(() => {
    let live = true;
    loadPrintingChoices(oracleId)
      .then((all) => {
        if (!live) return;
        const cs = collapseTwins(all, price?.printing?.scryfallId);
        const preset = gotItPreset(price, newestAsOf, cs);
        setChoices(cs);
        setSelected(preset.scryfallId);
        setFinish(preset.finish);
      })
      .catch(() => live && setLoadFailed(true));
    return () => {
      live = false;
    };
  }, [oracleId, price, newestAsOf]);

  // B4: one printing draws no picker, so focus goes to the form's action instead of a tile.
  const single = choices !== null && choices.length === 1;
  useEffect(() => {
    if (single) primaryRef.current?.focus();
  }, [single]);
  // The stale banner takes focus (README "Other decisions"); pending holds focus on the dialog,
  // since Add and Cancel disable under it.
  useEffect(() => {
    if (notice === "stale" || notice === "staleRemoved") bannerRef.current?.focus();
  }, [notice]);
  useEffect(() => {
    if (pending) dialogRef.current?.focus();
  }, [pending]);

  const choice = choices?.find((p) => p.scryfallId === selected) ?? null;
  const expected = choice && finish ? choice.owned[finish] ?? 0 : 0;
  const ready = choice !== null && finish !== null;

  function changed() {
    pressId.current = null;
  }
  useEffect(() => {
    pressId.current = null;
  }, [decision]);

  const form: GotItFormState = { quantity: qty };

  function pick(p: PrintingChoice) {
    if (pending) return;
    changed();
    setSelected(p.scryfallId);
    setFinish((f) => finishFor(p.finishes, f));
  }

  function setPendingBoth(on: boolean) {
    setPending(on);
    onPendingChange(on);
  }

  async function submit() {
    if (!ready || pending || !choice || !finish) return;
    setPendingBoth(true);
    setNotice(null);
    pressId.current ??= crypto.randomUUID();
    try {
      const out = await write({
        scryfallId: choice.idFor[finish] ?? choice.scryfallId, finish, quantity: qty, expected, id: pressId.current,
      });
      if ("applied" in out) {
        onDone({
          entryId: out.applied.id, facts: out.applied.receipt, quantity: qty,
          setCode: choice.setCode, collectorNumber: choice.collectorNumber, finish,
        });
        return;
      }
      if ("stale" in out) {
        // Nothing was written. Re-base on the count the server holds now, and confirm again.
        const rebased = rebaseStale(out.stale, choice, finish, expected, need, listQuantity);
        const next = out.need === undefined ? rebased : { ...rebased, need: out.need };
        setChoices((cs) => cs?.map((p) => (p.scryfallId === choice.scryfallId
          ? { ...p, owned: { ...p.owned, [finish]: next.expected } }
          : p)) ?? cs);
        setNeed(next.need);
        // At need 0 the count stays: the banner says Add anyway if this is a spare.
        if (next.need > 0) setQty(presetQuantity(next.need));
        pressId.current = null;
        setNotice(next.added ? "stale" : "staleRemoved");
      } else {
        // Refused or the catalog no longer holds it: nothing was written; the choices stay (B9).
        setNotice("failed");
      }
    } catch {
      // The id is kept, so a retry of a press that did commit records once.
      setNotice("failed");
    } finally {
      setPendingBoth(false);
    }
  }

  // Finish chips derive from the selected printing (finding 1). A printing with one finish that is
  // not nonfoil draws nonfoil dashed beside it, with the line that says why (B3).
  const offered: Finish[] = choice ? FINISHES.filter((f) => choice.finishes.includes(f)) : ["nonfoil", "foil"];
  const off: Finish | null = choice && offered.length === 1 && offered[0] !== "nonfoil" ? "nonfoil" : null;
  const chips: Finish[] = off ? [...offered, off] : offered;
  const finishNote = off ? (offered[0] === "foil" ? c.foilOnly : c.etchedOnly) : null;
  const spare = qty - need;

  function onFinishKey(e: React.KeyboardEvent, f: Finish) {
    const i = offered.indexOf(f);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0 || i === -1) return;
    e.preventDefault();
    const next = offered[Math.min(offered.length - 1, Math.max(0, i + step))];
    if (next === f) return;
    changed();
    setFinish(next);
    document.getElementById(`${titleId}-finish-${next}`)?.focus();
  }

  const step = "inline-flex h-[44px] w-[44px] md:h-[32px] md:w-[32px] items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] text-[16px] text-[color:var(--fg)] cursor-pointer disabled:cursor-default disabled:text-[color:var(--fg-disabled)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] md:items-center md:bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
      role="presentation"
      onClick={() => { if (!pending) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={nameId}
        aria-busy={pending || undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // Phone: the bottom sheet, 16px top corners, top border only. Desktop: the 520px modal.
        className="relative flex max-h-[92vh] w-full flex-col gap-[18px] overflow-y-auto overscroll-contain rounded-[16px_16px_0_0] bg-[color:var(--surface)] px-[18px] pb-[18px] pt-[10px] outline-none [border-top:1px_solid_var(--border-strong)] md:w-[520px] md:rounded-[14px] md:px-[24px] md:pb-[20px] md:pt-[24px] md:[border:1px_solid_var(--border-strong)] md:[box-shadow:var(--modal-shadow)]"
      >
        <span aria-hidden className="mb-[2px] h-[4px] w-[36px] self-center rounded-[2px] bg-[color:var(--border-dashed)] md:hidden" />
        <button
          type="button"
          aria-label={c.close}
          onClick={onClose}
          disabled={pending}
          className="absolute right-[18px] top-[18px] hidden h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-transparent text-[13px] text-[color:var(--fg-muted)] disabled:cursor-default md:flex"
        >
          ✕
        </button>

        <div className="flex flex-col gap-[6px] md:pr-[44px]">
          <h3 id={titleId} className="m-0 font-display text-[19px] font-bold leading-[1.25] text-[color:var(--fg)] md:text-[21px]">{c.title}</h3>
          <span id={nameId} className="text-[15px] leading-[1.4] text-[color:var(--fg-body)]">{cardName}</span>
        </div>
        {typeof children === "function" ? children(form) : children}

        {notice === "stale" || notice === "staleRemoved" ? (
          <div ref={bannerRef} role="status" tabIndex={-1} className={BANNER}>
            <span aria-hidden style={{ color: "var(--warning)" }}>⚠</span>
            <span>
              <b className="font-semibold text-[color:var(--fg)]">{c.staleTitle}</b>{" "}
              {notice === "staleRemoved"
                ? null
                : need > 0 ? (staleLine?.owed ?? c.staleBody)(need) : staleLine?.done ?? c.staleBodyDone}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-[18px]" style={{ opacity: pending ? 0.6 : 1 }}>
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-baseline justify-between gap-[10px]">
              <span className={MONO_LABEL}>{c.printing}</span>
              {choices ? (
                <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{c.printingCount(choices.length)}</span>
              ) : null}
            </div>
            {choices === null ? (
              // The choices are read when the form opens: what the player holds of each printing is
              // the count the write is checked against.
              <p aria-busy={!loadFailed} className="m-0 text-[12.5px] text-[color:var(--fg-muted)]">
                {loadFailed ? null : `${c.choosePrinting}…`}
              </p>
            ) : single ? (
              <SinglePrinting choice={choices[0]} />
            ) : (
              <PrintingRegion
                role="choose"
                tiles="confirm"
                source="catalog"
                layout="row"
                id={`${titleId}-printings`}
                printings={choices}
                selected={selected}
                cardName={cardName}
                colorIdentity={[]}
                onPick={pick}
                autoFocus
              />
            )}
          </div>

          <div className="flex flex-col gap-[18px]" style={{ opacity: ready ? 1 : 0.4 }}>
            <div className="flex flex-col gap-[8px]">
              <span id={`${titleId}-finish`} className={MONO_LABEL}>{c.finish}</span>
              <div role="radiogroup" aria-labelledby={`${titleId}-finish`} className="flex flex-wrap items-center gap-[6px]">
                {chips.map((f) => {
                  const on = ready && f === finish;
                  const isOff = f === off;
                  const usable = ready && !isOff && !pending;
                  return (
                    <button
                      key={f}
                      id={`${titleId}-finish-${f}`}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={!usable || undefined}
                      tabIndex={usable && (on || (finish === null && f === offered[0])) ? 0 : -1}
                      onClick={() => {
                        if (!usable || on) return;
                        changed();
                        setFinish(f);
                      }}
                      onKeyDown={(e) => usable && onFinishKey(e, f)}
                      className={`inline-flex h-[44px] items-center rounded-full border px-[13px] text-[12.5px] md:h-[32px] ${
                        isOff ? "border-dashed" : "border-solid"
                      } border-[color:var(--border-strong)] ${usable ? "cursor-pointer" : "cursor-default"} ${
                        on
                          ? "bg-[color:var(--accent)] font-semibold text-[color:var(--bg)]"
                          : isOff
                            ? "bg-transparent text-[color:var(--fg-locked)]"
                            : "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                      }`}
                    >
                      {c.finishes[f]}
                    </button>
                  );
                })}
                {ready && finishNote ? <span className="text-[12px] text-[color:var(--fg-muted)]">{finishNote}</span> : null}
              </div>
            </div>

            <div className="flex flex-col gap-[8px]">
              <span id={howManyId} className={MONO_LABEL}>{c.howMany}</span>
              <div role="group" aria-labelledby={howManyId} className="flex flex-wrap items-center gap-[12px]">
                <span className="flex items-center gap-[6px]">
                  <button
                    type="button"
                    aria-label={c.fewer}
                    disabled={!ready || pending || qty <= 1}
                    onClick={() => { changed(); setQty((q) => Math.max(1, q - 1)); }}
                    className={step}
                  >
                    −
                  </button>
                  <output
                    aria-live="polite"
                    className="inline-flex h-[44px] min-w-[48px] items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] font-mono text-[15px] text-[color:var(--fg)] md:h-[32px] md:min-w-[44px]"
                  >
                    {qty}
                  </output>
                  <button
                    type="button"
                    aria-label={c.more}
                    disabled={!ready || pending || qty >= MARK_BOUGHT_MAX}
                    onClick={() => { changed(); setQty((q) => Math.min(MARK_BOUGHT_MAX, q + 1)); }}
                    className={step}
                  >
                    +
                  </button>
                </span>
                <span className="text-[12.5px] text-[color:var(--fg-body)]">
                  {needLine ? needLine(need) : c.need(need)}
                  {spare > 0 ? <span className="text-[color:var(--fg-muted)]">{` · ${c.spare(spare)}`}</span> : null}
                </span>
              </div>
              {typeof footer === "function" ? footer(form) : footer}
            </div>
          </div>
        </div>

        {notice === "failed" || loadFailed ? (
          <div role="alert" className={BANNER}>
            <span aria-hidden style={{ color: "var(--warning)" }}>⚠</span>
            <span>
              <b className="font-semibold text-[color:var(--fg)]">{c.failedTitle}</b> {c.failedBody}
            </span>
          </div>
        ) : null}

        <div className="mt-[2px] flex gap-[10px] md:mt-0 md:justify-end md:border-0 md:border-t md:border-solid md:border-[color:var(--border)] md:pt-[16px]">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-[46px] flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[14px] text-[color:var(--fg)] disabled:cursor-default disabled:text-[color:var(--fg-locked)] disabled:opacity-60 md:h-[40px] md:flex-none md:rounded-[8px] md:px-[18px]"
          >
            {c.cancel}
          </button>
          <button
            ref={primaryRef}
            type="button"
            onClick={() => void submit()}
            // aria-disabled, not native: the button keeps its focus (and is announced) while a
            // press does nothing; `submit` refuses without a printing and while pending.
            aria-disabled={!ready || pending || undefined}
            className={`inline-flex h-[46px] flex-1 items-center justify-center whitespace-nowrap rounded-[10px] text-[14px] font-semibold md:h-[40px] md:flex-none md:rounded-[8px] md:px-[20px] ${
              ready
                ? `bg-[color:var(--accent)] text-[color:var(--bg)] ${pending ? "cursor-wait opacity-70" : "cursor-pointer"}`
                : "cursor-default bg-[color:var(--elevated)] text-[color:var(--fg-locked)]"
            }`}
          >
            {pending ? c.adding : ready ? c.add(qty) : c.choosePrinting}
          </button>
        </div>
      </div>
    </div>
  );
}

/** B4: a card with one printing names it, with no picker; it is already the selection. */
function SinglePrinting({ choice }: { choice: PrintingChoice }) {
  const art = choice.imageUri
    ? { backgroundImage: cssUrl(choice.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient([]) };
  return (
    <div className="flex items-center gap-[12px] rounded-[9px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[10px] py-[8px]">
      <span aria-hidden className="h-[56px] w-[40px] flex-none rounded-[5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]" style={art} />
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[13px] text-[color:var(--fg)]">{choice.setName ?? choice.setCode.toUpperCase()}</span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {`${choice.setCode.toUpperCase()} #${choice.collectorNumber}`}
        </span>
      </span>
    </div>
  );
}
