"use client";

import { useState } from "react";

import { creditsCopy } from "../../lib/copy/credits";
import { synopsisCopy } from "../../lib/copy/synopsis";
import type { SynopsisState } from "../../lib/synopsis/read";
import type { FindingArt } from "./receipt-modal";
import { SynopsisModal } from "./synopsis-body";
import { SynopsisText } from "./synopsis-text";

/**
 * The Analysis tab's Overview (handoff §2 row 1; `SYNOPSIS-modal.md`): the overview's own
 * paragraph, then `View full overview →`, which opens the whole overview in `ModalChrome`.
 *
 * ONE STRING, TWO SURFACES: the tab draws the modal's Overview paragraph, not a shorter summary.
 *
 * Its states, each drawn from pieces the handoff already draws:
 * - present: the paragraph and the entry point;
 * - the Overview section refused, the rest shown: the refused slot, and the entry point kept;
 * - every section refused: Round 0's refused state, and no entry point;
 * - no overview yet, over a current reading: Round 0's state 2, `Write one` (ruling A);
 * - this deck's write just failed upstream: the failure line and `Try again` (ruling A);
 * - an older overview beside a fresh reading: the paragraph whole, then ruling D's line and
 *   `Write a new overview` (ruling D). A reading that is itself stale draws no write control: the
 *   banner above offers Re-analyze, and the overview waits for it.
 *
 * NO SPACE IS RESERVED for prose that is not there, and no partial sentence can arrive: a section
 * that failed checking has no content stored at all.
 */
export function SynopsisOverview({
  state,
  busy,
  deckName,
  art,
  readingFresh,
  onWrite,
  onRetry,
}: {
  state: SynopsisState;
  busy: boolean;
  deckName: string;
  art: FindingArt;
  /** The reading beside it is current: a write control is offered only over one. */
  readingFresh: boolean;
  onWrite: () => void;
  onRetry: (synopsisId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { synopsis, stale, allowance } = state;
  const content = synopsis?.content ?? null;
  const overviewVerdict = content?.verdicts.find((v) => v.section === "overview");
  const left = Math.max(0, allowance.limit - allowance.used);
  const spent = left === 0;
  const note = spent ? creditsCopy.spent(allowance.limit, allowance.nextAt) : creditsCopy.first(left, allowance.limit, allowance.nextAt);
  const canWrite = readingFresh && !state.pending;

  let body: React.ReactNode;
  if (!synopsis && state.lastRefused) {
    // Every section refused: Round 0's refused state, and no entry point.
    body = (
      <RefusedSlot
        sentence={synopsisCopy.overviewRefused}
        failed={state.lastRefused.failed}
        total={state.lastRefused.total}
        onRetry={canWrite ? onWrite : null}
        busy={busy}
        note={note}
        spent={spent}
      />
    );
  } else if (!synopsis) {
    body = state.lastFailed
      ? <WriteRow line={synopsisCopy.failed} label={synopsisCopy.tryAgain} note={canWrite ? note : null} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />
      : <WriteRow line={synopsisCopy.absent} label={synopsisCopy.writeOne} note={canWrite ? note : null} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />;
  } else if (content?.overview) {
    body = (
      <>
        <p className="text-[13.5px] leading-[1.65] md:text-[15px] md:leading-[1.7] md:max-w-[760px] text-[var(--fg-body)] [text-wrap:pretty]">
          <SynopsisText text={content.overview} cards={content.cards} art={art} />
        </p>
        {stale && readingFresh ? (
          state.lastFailed
            ? <WriteRow line={synopsisCopy.failed} label={synopsisCopy.tryAgain} note={note} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />
            : <WriteRow line={synopsisCopy.olderThanList} label={synopsisCopy.writeNew} note={spent ? note : null} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />
        ) : null}
      </>
    );
  } else if (overviewVerdict?.status === "refused") {
    body = (
      <RefusedSlot
        sentence={synopsisCopy.overviewRefused}
        failed={overviewVerdict.failed}
        total={overviewVerdict.total}
        onRetry={canWrite && !stale ? () => onRetry(synopsis.id) : null}
        busy={busy}
        note={note}
        spent={spent}
      />
    );
  }

  return (
    <section aria-labelledby="synopsis-overview-label" className="flex flex-col gap-[7px] md:gap-[8px]">
      <h3 id="synopsis-overview-label" className="font-mono uppercase text-[9.5px] tracking-[0.14em] md:text-[10px] md:tracking-[0.16em] text-[var(--fg-faint)]">
        {synopsisCopy.label}
      </h3>
      {body}
      {synopsis ? (
        <div className="flex min-h-[44px] items-center md:min-h-0 md:mt-[2px]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-[8px] font-mono text-[11px] text-[var(--accent)] md:min-h-0 cursor-pointer"
          >
            <span className="[border-bottom:1px_dotted_var(--accent)]">{synopsisCopy.entry}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : null}
      {open && synopsis ? (
        <SynopsisModal
          synopsis={synopsis}
          stale={stale}
          deckName={deckName}
          art={art}
          busy={busy}
          write={stale && readingFresh ? { label: synopsisCopy.writeNew, line: synopsisCopy.olderThanList, disabled: !canWrite || spent, onPress: onWrite } : null}
          onRetry={canWrite && !stale ? () => onRetry(synopsis.id) : null}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}

/** Round 0's write line: one `--fg-faint` line, the button, and its credit note beside it at 1300. */
export function WriteRow({
  line, label, note, disabled, busy, onPress,
}: {
  line: string;
  label: string;
  note: string | null;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-[13px] leading-[1.55] md:text-[13.5px] text-[var(--fg-faint)]">{line}</p>
      <div className="flex flex-col items-stretch gap-[8px] md:flex-row md:flex-wrap md:items-center md:gap-[14px]">
        <button
          type="button"
          onClick={onPress}
          disabled={disabled || busy}
          aria-busy={busy || undefined}
          className={`min-h-[44px] w-full rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13px] font-medium md:min-h-[36px] md:w-auto cursor-pointer disabled:cursor-default ${disabled ? "text-[var(--fg-disabled)]" : "text-[var(--fg)]"}`}
        >
          {label}
        </button>
        {note ? (
          <p className="text-center font-mono text-[9.5px] leading-[1.55] md:flex-[1_1_280px] md:text-left md:text-[11px] text-[var(--fg-faint)]">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A refused section's slot: the `not written` tag, the sentence, the count and `Try again`. */
export function RefusedSlot({
  sentence, failed, total, onRetry, busy, note, spent, compact = false,
}: {
  sentence: string;
  failed: number;
  total: number;
  onRetry: (() => void) | null;
  busy: boolean;
  note: string | null;
  spent: boolean;
  /** The modal's slot: a 34px button rather than the tab's 36px. */
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-[8px]">
      <span
        className="rounded-full border border-[var(--danger)] px-[8px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--danger)]"
      >
        {synopsisCopy.notWritten}
      </span>
      <p className="text-[13px] leading-[1.6] md:text-[13.5px] text-[var(--fg-muted)]">{sentence}</p>
      <p className="font-mono text-[10.5px] text-[var(--fg-faint)]">{synopsisCopy.failedCount(failed, total)}</p>
      {onRetry ? (
        <div className="flex w-full flex-col items-stretch gap-[8px] md:w-auto md:flex-row md:items-center md:gap-[14px]">
          <button
            type="button"
            onClick={onRetry}
            disabled={busy || spent}
            aria-busy={busy || undefined}
            className={`min-h-[44px] rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13px] font-medium cursor-pointer disabled:cursor-default ${compact ? "md:min-h-[34px]" : "md:min-h-[36px]"} ${spent ? "text-[var(--fg-disabled)]" : "text-[var(--fg)]"}`}
          >
            {synopsisCopy.tryAgain}
          </button>
          {note ? <p className="text-center font-mono text-[9.5px] leading-[1.55] md:text-left md:text-[11px] text-[var(--fg-faint)]">{note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
