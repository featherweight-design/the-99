"use client";
// The saved state of a collection write, shared (precon ownership plan, PR A): the Add cards sheet's `N added`
// panel and the precon Start dialog's receipt draw the same thing: a title, a body line, the counts, where each
// copy went, and the History entry the write left. What differs rides in as props, never as a second copy of the
// layout. The action buttons are the caller's (`children`), since the sheet offers Add more and Done where the
// precon receipt offers Undo.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { whereItWent, type AddedPlacement } from "../../lib/collection/add-placements";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { addedCopyCopy } from "../../lib/copy/added-copy";
import { CopyLine } from "../decks/copy-line";
import { PendingReporter } from "../shell/pending-reporter";

/** What the `Where it went` block is built from: the save's lines and where the write put them. */
export type WentInputs = { lines: Parameters<typeof whereItWent>[0]; placed: AddedPlacement[] };

/**
 * Where an added copy goes, in the saved state (design table, CopyLine): after the counts, before
 * History. A row per card a deck took or read, each with Change; the cards no deck needed in one
 * faint foot line.
 */
export function WhereItWentBlock({ lines, placed }: WentInputs) {
  // Each row's last Change read-back, by card, so the foot says what is free now.
  const [live, setLive] = useState<Record<string, ContestedCard | null>>({});
  const went = whereItWent(lines, placed, live);
  if (went.rows.length === 0 && !went.foot) return null;
  return (
    <div className="w-full">
      {went.rows.length > 0 ? (
        <>
          <p className="m-0 pb-[6px] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
            {addedCopyCopy.line.head(went.rows.length)}
          </p>
          <ul className="m-0 list-none p-0">
            {went.rows.map((r) => (
              <CopyLine
                key={r.oracleId}
                form="line"
                cardName={r.cardName}
                sentence={r.sentence}
                parts={r.parts}
                chooser={r.chooser}
                onLive={(card) => setLive((m) => ({ ...m, [r.oracleId]: card }))}
              />
            ))}
          </ul>
        </>
      ) : null}
      {went.foot ? (
        <p
          className="m-0 pt-[9px] font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)]"
          style={went.rows.length > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
        >
          {went.foot}
        </p>
      ) : null}
    </div>
  );
}

export function AddedReceipt({ title, body, counts, extra, went, historyHref, historyLabel, onNavigate, children }: {
  title: string;
  body: string;
  /** The `4,492 → 4,500` line, when the caller knows the collection's size before. */
  counts?: string | null;
  /** Further lines of the receipt, between the counts and where it went (the precon receipt's tokens line). */
  extra?: ReactNode;
  went: WentInputs | null;
  historyHref: string;
  historyLabel: string;
  /** Called as the History link navigates (the sheet closes on the way). */
  onNavigate?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-[10px] py-[16px]">
      <p className="m-0 font-display text-[19px] font-bold">{title}</p>
      <p className="m-0 text-[14px] text-[color:var(--fg-body)]">{body}</p>
      {counts ? <p className="m-0 font-mono text-[12px] text-[color:var(--fg-faint)]">{counts}</p> : null}
      {extra}
      {went ? <WhereItWentBlock {...went} /> : null}
      {/* B8: the entry this write left, one tap away. */}
      <Link href={historyHref} onNavigate={onNavigate} className="text-[13.5px] text-[color:var(--accent)] underline underline-offset-2">
        {historyLabel}
        <PendingReporter href={historyHref} />
      </Link>
      {children}
    </div>
  );
}
