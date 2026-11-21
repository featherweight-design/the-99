"use client";
// §E, the short-deck warning (collection edit handoff, A·E1 to E6): the CONTENT of the dialog, with
// no scrim, focus trap or history entry of its own. The host owns the dialog, so swapping the
// confirm for the warning keeps one dialog (and one back-button entry) rather than unmounting one
// and mounting another. One component for every source that can leave a committed deck short;
// Replace is the first caller. Rows are always decks. A source that moves one card shows `short N`, a source that
// moves several shows `N cards short` and the row opens onto its cards. Three decks are named and
// the rest are counted behind `and N more`, which opens inline (in the dialog's
// scrolling body, or under a 320px cap when embedded). Cancel takes focus, and the confirm is the elevated secondary, never red. The shortage figure is --danger ink, as A·E2 draws it.

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { ShortDeck, ShortFacts } from "../../lib/collection/write";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { formatShortDeckDate } from "../../lib/decks/format";
import { SteadyLabel } from "../ui/steady-label";

type DeckRow = { deckId: string; deckName: string; cards: { oracleId: string; cardName: string; short: number; facts?: ShortFacts }[]; short: number };

const factsLine = (f: ShortFacts) =>
  f.since === null ? collectionEditCopy.shortWarning.facts.lineUndated(f.listed) : collectionEditCopy.shortWarning.facts.line(f.listed, formatShortDeckDate(new Date(f.since)));
const joinNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** One row per deck, most short first; a tie keeps the order the server sent (stable sort). */
export function groupShortDecks(decks: ShortDeck[]): DeckRow[] {
  const byDeck = new Map<string, DeckRow>();
  for (const d of decks) {
    const row = byDeck.get(d.deckId) ?? { deckId: d.deckId, deckName: d.deckName, cards: [], short: 0 };
    row.cards.push({ oracleId: d.oracleId, cardName: d.cardName, short: d.short, ...(d.facts ? { facts: d.facts } : {}) });
    row.short += d.short;
    byDeck.set(d.deckId, row);
  }
  return [...byDeck.values()].sort((a, b) => b.short - a.short);
}

export function ShortDeckWarning({
  variant = "dialog",
  source = "replace",
  cardName,
  titleId,
  decks,
  pending,
  error,
  notice,
  freshDeckIds,
  onCancel,
  onConfirm,
  cancelRef: hostCancelRef,
}: {
  /**
   * `dialog`: the title, body and buttons, hosted in a dialog. `embedded`: just the decks under
   * their own heading, for the review screen, whose confirm bar carries the decision.
   */
  variant?: "dialog" | "embedded";
  /** What the decks would be left short by: it words the title and the confirm. */
  source?: "replace" | "sync" | "revert" | "save" | "remove" | "undo";
  /** The card a `save` or `remove` is about: the title of a removal and the body name it. */
  cardName?: string;
  /** The id the host's `aria-labelledby` names. Unused when embedded. */
  titleId?: string;
  decks: ShortDeck[];
  pending: boolean;
  error?: string | null;
  /** Shown when a confirm came back with a different answer: the same dialog, redrawn. */
  notice?: boolean;
  /** Decks the previous warning did not name; they carry a `new` tag. */
  freshDeckIds?: ReadonlySet<string>;
  /** The dialog variant's buttons; the embedded one has none. */
  onCancel?: () => void;
  onConfirm?: () => void;
  /** The dialog variant's Cancel, for a host that opens straight onto the warning and owns its first focus. */
  cancelRef?: RefObject<HTMLButtonElement | null>;
}) {
  const c = collectionEditCopy.shortWarning;
  const rows = useMemo(() => groupShortDecks(decks), [decks]);
  const oneCard = useMemo(() => new Set(decks.map((d) => d.oracleId)).size === 1, [decks]);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const title =
    source === "revert" ? c.titleRevert(rows.length)
    // I got it's toast Undo (call 6): a revert, worded as the undo the player pressed.
    : source === "undo" ? gotItCopy.shortWarning.titleUndo(rows.length)
    : source === "remove" ? c.titleRemove(cardName ?? "", rows.length)
    : source === "save" ? c.titleSave(rows.length)
    // Collection Sync (handoff call 6, Other decisions): never danger red, Cancel still takes focus.
    : source === "sync" ? c.titleSync(rows.length)
    : c.titleReplace(rows.length);
  const confirmLabel =
    source === "revert" ? c.confirmRevert
    : source === "undo" ? gotItCopy.shortWarning.confirmUndo
    : source === "remove" ? c.confirmRemove
    : source === "save" ? c.confirmSave
    : source === "sync" ? c.confirmSync
    : c.confirmReplace;
  const body = (source === "remove" || source === "save") && cardName ? c.bodyCard(cardName) : c.body;
  const cardName0 = rows[0]?.cards[0]?.cardName;
  const named = showAll ? rows : rows.slice(0, c.namedCount);
  const hidden = rows.length - c.namedCount;
  const ownCancelRef = useRef<HTMLButtonElement>(null);
  const cancelRef = hostCancelRef ?? ownCancelRef;
  const firstRevealed = useRef<HTMLSpanElement>(null);
  // The warning replaces the confirm inside one dialog, so nothing moves focus here but this.
  // Again for each answer the server sends back: a changed warning keeps this mounted while the
  // host's pending state moved focus to the dialog itself.
  // (The embedded variant draws no Cancel, so there is nothing to focus.)
  useEffect(() => cancelRef.current?.focus(), [cancelRef, decks]);
  // `and N more` unmounts the button that had focus: the first row it reveals takes it.
  useEffect(() => {
    if (showAll) firstRevealed.current?.focus();
  }, [showAll]);

  return (
    <div className="flex flex-col gap-[14px]">
        {variant === "dialog" ? (
          <h2 id={titleId} className="m-0 flex-none font-display text-[20px] font-bold leading-[1.3] text-[color:var(--fg)]">
            {title}
          </h2>
        ) : (
          <h2 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--danger)]">
            {collectionEditCopy.upload.decksShortHeading(rows.length)}
          </h2>
        )}
        {/* The dialog's one scroller: everything between the pinned title and the pinned buttons, so a capped
            column on a short viewport shrinks this and never the buttons. The 6px inset keeps focus rings
            unclipped. Embedded, there is no column to fill and the list keeps its own 320px cap. */}
        <div
          data-warning-body
          className={
            variant === "dialog"
              ? "-m-[6px] flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto overscroll-contain p-[6px]"
              : "flex flex-col gap-[14px]"
          }
        >
        {notice ? (
          <p role="status" className="m-0 flex-none text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
            {c.changed}
          </p>
        ) : null}
        {variant === "dialog" ? (
          <p className={`m-0 flex-none text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] ${showAll ? "max-md:hidden" : ""}`}>{body}</p>
        ) : null}
        <ul
          className={`m-0 flex-none list-none rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg)] p-0 ${variant === "embedded" ? `overflow-y-auto ${showAll ? "max-h-[320px]" : ""}` : ""}`}
        >
          {named.map((row, index) => {
            const expandable = !oneCard;
            const isOpen = open === row.deckId;
            const figure = oneCard ? c.figureOne(row.short) : c.figureMany(row.cards.length);
            return (
              <li key={row.deckId} className="border-b border-b-[color:var(--border)] last:border-b-0">
                <div className="flex min-h-[44px] items-center gap-[12px] px-[14px]">
                  {/* The deck's name is text, not a link (#2982): a link here left the app (a new tab is the system browser in the
                      installed app) and a same-tab one would lose the review this warning belongs to. */}
                  <span
                    ref={showAll && index === c.namedCount ? firstRevealed : undefined}
                    tabIndex={showAll && index === c.namedCount ? -1 : undefined}
                    className="min-w-0 flex-1 truncate text-[14px] text-[color:var(--fg)]"
                  >
                    {row.deckName}
                    {oneCard && row.cards[0]?.facts ? (
                      <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{factsLine(row.cards[0].facts)}</span>
                    ) : null}
                  </span>
                  {freshDeckIds?.has(row.deckId) ? (
                    <span className="flex-none rounded-[4px] border border-[color:var(--border-strong)] px-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--fg-muted)]">
                      {c.newTag}
                    </span>
                  ) : null}
                  {expandable ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : row.deckId)}
                      className="flex-none font-mono text-[12px] text-[color:var(--danger)]"
                    >
                      {figure}
                    </button>
                  ) : (
                    <span className="flex-none font-mono text-[12px] text-[color:var(--danger)]">{figure}</span>
                  )}
                </div>
                {expandable && isOpen ? (
                  <ul className="m-0 list-none p-[0_14px_10px] text-[12.5px] text-[color:var(--fg-muted)]">
                    {row.cards.map((card) => (
                      <li key={card.oracleId} className="flex justify-between gap-[12px] py-[2px]">
                        <span className="min-w-0 truncate">
                          {card.cardName}
                          {card.facts ? <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{factsLine(card.facts)}</span> : null}
                        </span>
                        <span className="flex-none font-mono">{c.figureOne(card.short)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
          {!showAll && hidden > 0 ? (
            <li className="border-t border-[color:var(--border)]">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex min-h-[44px] w-full items-center px-[14px] text-left text-[13px] text-[color:var(--accent-text)]"
              >
                {c.more(hidden)}
              </button>
            </li>
          ) : null}
        </ul>
        {variant === "dialog" ? (() => {
          // One card, and a row that says who keeps the copies ahead of it (R2 P5/D4, P6/D5): the reason a deck is short and where to change it.
          const f = oneCard && rows.length === 1 ? rows[0]?.cards[0]?.facts : undefined;
          const keepers = f?.keepers ?? [];
          if (!f || keepers.length === 0 || !cardName0) return null;
          const shortNames = joinNames(rows.map((r) => r.deckName));
          const text = source === "undo"
            ? c.facts.reasonUndo(shortNames, cardName0, joinNames(keepers))
            : f.left >= 2 ? c.facts.reasonLeft(joinNames(keepers), f.left, shortNames, cardName0) : null;
          return text ? <p className="m-0 flex-none text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{text}</p> : null;
        })() : null}
        {error ? (
          <p role="alert" className="m-0 flex-none text-[13px] text-[color:var(--danger)]">
            {error}
          </p>
        ) : null}
        </div>
        {/* `mt-auto`: in a host that gives the warning a fixed column (the revert confirmation), the
            buttons sit at its foot however short the list. Elsewhere it is 0, and the 4px is padding. */}
        {variant === "dialog" ? (
        <div className="mt-auto flex flex-none flex-col-reverse gap-[10px] pt-[4px] md:flex-row md:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex h-[44px] items-center justify-center rounded-[8px] border border-[color:var(--border-strong)] px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60"
          >
            {c.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex h-[44px] items-center justify-center rounded-[8px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[18px] text-[14px] font-semibold text-[color:var(--fg)] disabled:opacity-60"
          >
            <SteadyLabel hold={[c.saving, confirmLabel]}><SteadyLabel hold={[c.saving, confirmLabel]}>{pending ? c.saving : confirmLabel}</SteadyLabel></SteadyLabel>
          </button>
        </div>
        ) : null}
    </div>
  );
}
