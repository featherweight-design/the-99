"use client";

// The Find a deck rows, drawn from props alone (landing demo split 5k): the card plate, the free list's rows with their Add,
// the decks that already hold the card, and the staple note. Split out of `fits-picker.tsx` so the demo draws them without
// the picker's read or its server actions; the picker and Find a deck's view both draw these, so they cannot drift.
// `fits-picker.tsx` re-exports them under the old path.
import Link from "next/link";

import { colorWords } from "../../lib/copy/color-labels";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitDeck, FitsRead } from "../../lib/swaps/fits";
import { MutationError } from "../decks/mutation-error";
import { PreviewButton } from "../ui/preview-button";
import { ArtLayer } from "../ui/art-layer";
import { CardDetailTrigger } from "./card-detail-context";

const copy = swapToolsCopy.fits;

export const colorsOf = (ids: string[]) => (ids.length === 0 ? "colorless" : colorWords(ids));

/**
 * The row's one reason line (addendum §1c): a combo the card completes, in --fg, the other piece dotted
 * and opening that card; else the theme it joins, in --fg-body; a staple's own form; then ` · this deck
 * {need}`. With no reason and no need the row draws no line (R2: never the shares).
 */
function ReasonLine({ deck, staple, onOpenCard }: { deck: FitDeck; staple: boolean; onOpenCard?: (oracleId: string) => void }) {
  const r = deck.reason;
  const lead = staple
    ? <span className="italic whitespace-nowrap text-[color:var(--fg-body)]">{copy.cmdrStaple}</span>
    : r?.kind === "combo"
      ? (
        <span className="whitespace-nowrap text-[color:var(--fg)]">
          {copy.reasonCombo}{" "}
          {onOpenCard ? (
            <PreviewButton
              type="button"
              imageUri={r.with.imageUri}
              onClick={() => onOpenCard(r.with.oracleId)}
              className="bg-transparent border-0 p-0 font-mono text-[10.5px] cursor-pointer text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]"
            >
              {r.with.name}
            </PreviewButton>
          ) : (
            <CardDetailTrigger
              oracleId={r.with.oracleId}
              name={r.with.name}
              imageUri={r.with.imageUri}
              preview
              className="bg-transparent border-0 p-0 font-mono text-[10.5px] cursor-pointer text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]"
            >
              {r.with.name}
            </CardDetailTrigger>
          )}
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
        className="relative flex-none w-[22px] h-[31px] overflow-hidden rounded-[3px] border border-[color:var(--border-strong)]"
        // The canvas's placeholder hatch (fits table §2.4) where the catalog has no art for the card; with art,
        // a plain ground the art fades in over (`ArtLayer`).
        style={imageUri ? { background: "var(--surface-raised)" } : { backgroundImage: "repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)" }}
      >
        {imageUri ? <ArtLayer src={imageUri} /> : null}
      </span>
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
  rows, staple, cardName, freeNow, busy, refused, noteFor, onAdd, onOpenCard,
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
  /** Inside card details (Find a deck's view), a combo partner opens over the dialog through this,
   *  so the way back returns to the view; elsewhere the provider's own trigger. */
  onOpenCard?: (oracleId: string) => void;
}) {
  return (
    <section className="flex flex-col" aria-label={copy.groupJoin}>
      {/* Addendum §1c: the order note at the heading's right. A staple's list stays by name, so it has none. */}
      <div className="flex items-baseline justify-between gap-[10px] pb-[6px] border-b border-b-[color:var(--border)] border-[color:var(--border)]">
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
          <div key={deck.id} data-testid="fits-row" className="flex flex-col gap-[5px] py-[10px] border-b border-b-[color:var(--border)] border-[color:var(--border)]">
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
                  className="flex-none inline-flex items-center justify-center h-[44px] min-w-[64px] px-[14px] rounded-[8px] text-[13px] md:h-[32px] md:min-w-0 md:px-[12px] md:rounded-[7px] md:text-[12px] leading-none font-semibold bg-transparent cursor-pointer border border-solid border-[color:var(--accent)] text-[color:var(--accent-text)] disabled:opacity-60"
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
            <ReasonLine deck={deck} staple={staple} onOpenCard={onOpenCard} />
            {note ? (
              <p className="m-0 text-[12.5px]" style={{ color: "var(--fg-muted)" }}>
                {note}{" "}
                <Link href={`/decks/${deck.id}`} className="text-[color:var(--accent-text)] [border-bottom:1px_solid_var(--accent-shadow)]">
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
      <h3 className="m-0 pb-[6px] border-b border-b-[color:var(--border)] border-[color:var(--border)] font-mono text-[9.5px] font-normal tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
        {copy.groupHolds}
      </h3>
      {holds.map((h) => (
        <div key={h.id} data-testid="fits-holds-row" className="flex items-center gap-[10px] min-h-[44px] md:min-h-[34px] border-b border-b-[color:var(--border)] border-[color:var(--border)]">
          <Link href={`/decks/${h.id}`} aria-label={copy.deckLinkAria(h.name)} className={`${deckLink} text-[13px] text-[color:var(--fg-body)]`}>
            {h.name}
          </Link>
          <span className="flex-none font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{copy.holds(h.quantity)}</span>
        </div>
      ))}
    </section>
  );
}

/** The staple note, above the list of a universal staple. */
export function FitsStapleNote({ name, role }: { name: string; role: string }) {
  return (
    <section data-testid="fits-staple-note" className="flex flex-col gap-[6px] px-[13px] py-[11px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)]">
        <span className="flex items-center gap-[7px] font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-body)" }}>
          <span aria-hidden="true" className="w-[7px] h-[7px] rounded-full border-[1.5px] border-[color:var(--fg-muted)]" />
          {copy.stapleLabel}
        </span>
        <p className="m-0 text-[12.5px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>
          {role === "other" ? copy.stapleNoteNoRole(name) : copy.stapleNote(name)}
        </p>
      </section>
  );
}
