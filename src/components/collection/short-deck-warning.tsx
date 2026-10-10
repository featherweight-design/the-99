"use client";
// §E, the short-deck warning (collection edit handoff, A·E1 to E6): the CONTENT of the dialog, with
// no scrim, focus trap or history entry of its own. The host owns the dialog, so swapping the
// confirm for the warning keeps one dialog (and one back-button entry) rather than unmounting one
// and mounting another. One component for every source that can leave a committed deck short;
// Replace is the first caller. Rows are always decks. A source that moves one card shows `short N`, a source that
// moves several shows `N cards short` and the row opens onto its cards. Three decks are named and
// the rest are counted behind `and N more`, which opens inline under a 320px cap. Cancel takes
// focus, and the confirm is the elevated secondary, never red. The shortage figure is --danger ink, as A·E2 draws it.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ShortDeck } from "../../lib/collection/write";
import { collectionEditCopy } from "../../lib/copy/collection-edit";

type DeckRow = { deckId: string; deckName: string; cards: { oracleId: string; cardName: string; short: number }[]; short: number };

/** One row per deck, most short first; a tie keeps the order the server sent (stable sort). */
export function groupShortDecks(decks: ShortDeck[]): DeckRow[] {
  const byDeck = new Map<string, DeckRow>();
  for (const d of decks) {
    const row = byDeck.get(d.deckId) ?? { deckId: d.deckId, deckName: d.deckName, cards: [], short: 0 };
    row.cards.push({ oracleId: d.oracleId, cardName: d.cardName, short: d.short });
    row.short += d.short;
    byDeck.set(d.deckId, row);
  }
  return [...byDeck.values()].sort((a, b) => b.short - a.short);
}

export function ShortDeckWarning({
  variant = "dialog",
  titleId,
  decks,
  pending,
  error,
  notice,
  freshDeckIds,
  onCancel,
  onConfirm,
}: {
  /**
   * `dialog`: the title, body and buttons, hosted in a dialog. `embedded`: just the decks under
   * their own heading, for the review screen, whose confirm bar carries the decision.
   */
  variant?: "dialog" | "embedded";
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
}) {
  const c = collectionEditCopy.shortWarning;
  const rows = useMemo(() => groupShortDecks(decks), [decks]);
  const oneCard = useMemo(() => new Set(decks.map((d) => d.oracleId)).size === 1, [decks]);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const named = showAll ? rows : rows.slice(0, c.namedCount);
  const hidden = rows.length - c.namedCount;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const firstRevealed = useRef<HTMLAnchorElement>(null);
  // The warning replaces the confirm inside one dialog, so nothing moves focus here but this.
  // Again for each answer the server sends back: a changed warning keeps this mounted while the
  // host's pending state moved focus to the dialog itself.
  useEffect(() => {
    if (variant === "dialog") cancelRef.current?.focus();
  }, [decks, variant]);
  // `and N more` unmounts the button that had focus: the first row it reveals takes it.
  useEffect(() => {
    if (showAll) firstRevealed.current?.focus();
  }, [showAll]);

  return (
    <>
        {variant === "dialog" ? (
          <h2 id={titleId} className="m-0 flex-none font-display text-[20px] font-bold leading-[1.3] text-[color:var(--fg)]">
            {c.titleReplace(rows.length)}
          </h2>
        ) : (
          <h3 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--danger)]">
            {collectionEditCopy.upload.decksShortHeading(rows.length)}
          </h3>
        )}
        {notice ? (
          <p role="status" className="m-0 flex-none text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
            {c.changed}
          </p>
        ) : null}
        {variant === "dialog" ? (
          <p className={`m-0 flex-none text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] ${showAll ? "max-md:hidden" : ""}`}>{c.body}</p>
        ) : null}
        <ul
          className={`m-0 min-h-0 list-none overflow-y-auto rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg)] p-0 ${showAll ? "max-h-[320px]" : ""}`}
        >
          {named.map((row, index) => {
            const expandable = !oneCard;
            const isOpen = open === row.deckId;
            const figure = oneCard ? c.figureOne(row.short) : c.figureMany(row.cards.length);
            return (
              <li key={row.deckId} className="border-b border-b-[color:var(--border)] last:border-b-0">
                <div className="flex min-h-[44px] items-center gap-[12px] px-[14px]">
                  {/* A new tab: the review and this warning are state a navigation would lose. */}
                  <Link
                    ref={showAll && index === c.namedCount ? firstRevealed : undefined}
                    href={`/decks/${row.deckId}`}
                    target="_blank"
                    rel="noopener"
                    className="min-w-0 flex-1 truncate text-[14px] text-[color:var(--fg)] underline decoration-[color:var(--border-strong)] underline-offset-2"
                  >
                    {row.deckName}
                  </Link>
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
                        <span className="min-w-0 truncate">{card.cardName}</span>
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
                className="flex min-h-[44px] w-full items-center px-[14px] text-left text-[13px] text-[color:var(--accent)]"
              >
                {c.more(hidden)}
              </button>
            </li>
          ) : null}
        </ul>
        {error ? (
          <p role="alert" className="m-0 flex-none text-[13px] text-[color:var(--danger)]">
            {error}
          </p>
        ) : null}
        {variant === "dialog" ? (
        <div className="mt-[4px] flex flex-none flex-col-reverse gap-[10px] md:flex-row md:justify-end">
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
            {pending ? c.saving : c.confirmReplace}
          </button>
        </div>
        ) : null}
    </>
  );
}
