"use client";

import { useMemo, useState } from "react";

import { creditsCopy } from "../../lib/copy/credits";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { deckNoticesCopy } from "../../lib/copy/notices";
import { synopsisCopy } from "../../lib/copy/synopsis";
import type { SynopsisState } from "../../lib/synopsis/read";
import type { FindingArt } from "./receipt-modal";
import { SynopsisModal } from "./synopsis-body";
import { RefusedSlot, WriteRow } from "./synopsis-controls";
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
 *   banner above offers Re-analyze, and the overview waits for it;
 * - the deck holds a card a legality notice stands for (deck notices HANDOFF §6, plan D10): with
 *   no overview, the WITHHELD form (its line, `Write one` disabled, `See which →`); with a saved
 *   one, that overview stays whole under the warning line built from the same form (H3, Q4), and
 *   no write is offered anywhere, the modal's included.
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
  settled,
  onWrite,
  onRetry,
  onSeeWhich,
  reanalyze,
  deeperLooks = false,
}: {
  state: SynopsisState;
  busy: boolean;
  deckName: string;
  art: FindingArt;
  /** The reading beside it is current: a write control is offered only over one. */
  readingFresh: boolean;
  /** The state was read for the list and reading on screen. Until it is, what it says about a
   *  write is about the moment before, so no press is live over it. */
  settled: boolean;
  onWrite: () => void;
  onRetry: (synopsisId: string) => void;
  /** Opens the Notices sheet, from the check's `See which →`. */
  onSeeWhich: () => void;
  /** `HELP_ME_CHOOSE_ENABLED`: the credit lines name its deeper looks as sharing the credits. Off,
      they read exactly as before the looks existed. */
  deeperLooks?: boolean;
  /** The banner's Re-analyze, for the modal over a reading that is itself stale (6d), held
   *  exactly as the tab's banner holds it: a short deck or a read in flight cannot press it. */
  reanalyze: { onPress: () => void; disabled: boolean; note: string | null };
}) {
  const [open, setOpen] = useState(false);
  // The page's art covers the deck; the read's covers every card the overview names, which is how
  // a Weaknesses card the deck does not hold still previews. The page's entry wins where both do.
  const named = useMemo<FindingArt>(() => {
    const out = new Map(art);
    for (const [oracleId, imageUri] of Object.entries(state.art)) {
      if (!out.has(oracleId)) out.set(oracleId, { name: "", imageUri });
    }
    return out;
  }, [art, state.art]);
  const { synopsis, stale, allowance } = state;
  const content = synopsis?.content ?? null;
  const overviewVerdict = content?.verdicts.find((v) => v.section === "overview");
  const left = Math.max(0, allowance.limit - allowance.used);
  // No write can reserve: every credit out, the app-wide cap reached, or the owner's share used.
  // Each disables the press in 7g's form and says which, never "uses a credit".
  const spent = left === 0 || !!allowance.paused || !!allowance.ownerShare;
  // A withheld overview offers no write at all (the server refuses one before its reservation).
  const canWrite = readingFresh && settled && !state.pending && !state.illegal;
  // THE NOTE KEYS ON WHAT THE PRESS DOES (credits audit, finding 4): `wouldSpend` for a write,
  // which is false when the list already has its overview; a section retry always spends. Every
  // credit out says so, whatever the press.
  // Spent, the credit comes back at `reopensAt`, which can be later than the earliest expiry
  // when more units count than the limit (a reservation beside spent units): as the tuning panel.
  const spentNote = allowance.paused
    ? creditsCopy.paused(allowance.paused.until, deeperLooks)
    : allowance.ownerShare
      ? creditsCopy.ownerShare(new Date())
      : creditsCopy.spent(allowance.limit, allowance.reopensAt ?? allowance.nextAt, deeperLooks);
  const spendNote = creditsCopy.first(left, allowance.limit, allowance.nextAt);
  const note = spent ? spentNote : state.wouldSpend ? spendNote : null;
  const retryNote = spent ? spentNote : spendNote;

  // Ruling D, drawn under whatever the older overview shows (its paragraph, or its refused
  // Overview slot): the write it offers, or what became of the last one.
  const followUp = stale && readingFresh && !state.illegal
    ? state.lastRefused
      ? <RefusedSlot sentence={synopsisCopy.overviewRefused} failed={state.lastRefused.failed} total={state.lastRefused.total} onRetry={canWrite ? onWrite : null} busy={busy} note={note} spent={spent} />
      : state.lastFailed
      ? <WriteRow line={synopsisCopy.failed} label={synopsisCopy.tryAgain} note={note} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />
      : <WriteRow line={synopsisCopy.olderThanList} label={synopsisCopy.writeNew} note={note} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />
    : null;

  let body: React.ReactNode;
  if (!synopsis && state.illegal) {
    body = <CheckLine line={deckNoticesCopy.check.withheld} withWrite onSee={onSeeWhich} />;
  } else if (!synopsis && state.lastRefused) {
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
          <SynopsisText text={content.overview} cards={content.cards} art={named} />
        </p>
        {followUp}
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
        note={retryNote}
        spent={spent}
      />
    );
    // A stale overview's own refused section is not retried; ruling D's write replaces it.
    if (followUp) body = <>{body}{followUp}</>;
  }

  return (
    <section aria-labelledby="synopsis-overview-label" data-testid="synopsis-overview" className="flex flex-col gap-[7px] md:gap-[8px]">
      <h3 id="synopsis-overview-label" className="font-mono uppercase text-[9.5px] tracking-[0.14em] md:text-[10px] md:tracking-[0.16em] text-[var(--fg-faint)]">
        {synopsisCopy.label}
      </h3>
      {synopsis && state.illegal ? <CheckLine line={deckNoticesCopy.check.warning} onSee={onSeeWhich} /> : null}
      {body}
      {synopsis ? (
        <div className="flex min-h-[44px] items-center md:min-h-0 md:mt-[2px]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group inline-flex min-h-[44px] items-center gap-[8px] font-mono text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] md:min-h-0 cursor-pointer"
          >
            <span className="border-b border-dotted border-[var(--accent)] group-hover:border-[var(--accent-hover)]">{synopsisCopy.entry}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : null}
      {open && synopsis ? (
        <SynopsisModal
          synopsis={synopsis}
          stale={stale}
          deckName={deckName}
          art={named}
          busy={busy}
          // 6d's control: Re-analyze while the reading itself is stale, and ruling D's write once
          // it is current (credits audit, finding 3), with the note the tab draws beside it. The
          // banner's own sentence already says the overview predates the changes, so ruling D's
          // line is not appended to it (copy review: rule 8).
          // An illegal deck offers no write here either (HANDOFF §6): the tab's warning line says why,
          // and a disabled button with nothing beside it would not.
          action={stale
            ? readingFresh
              ? state.illegal
                ? null
                : { label: synopsisCopy.writeNew, line: null, note, disabled: !canWrite || spent, onPress: onWrite }
              : { label: deckAnalysisCopy.banner.reanalyze, line: null, note: reanalyze.note, disabled: reanalyze.disabled, onPress: reanalyze.onPress }
            : null}
          onRetry={canWrite && !stale ? () => onRetry(synopsis.id) : null}
          retryNote={retryNote}
          spent={spent}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}

/**
 * The check's line (deck notices HANDOFF §6; the 1300 and 390 frames): the withheld sentence, then
 * `Write one` in the disabled form and `See which →` in one row. Over a SAVED overview it is the
 * warning line (Q4), the same form with `See which →` alone.
 */
function CheckLine({ line, withWrite = false, onSee }: { line: string; withWrite?: boolean; onSee: () => void }) {
  return (
    <div data-testid={withWrite ? "overview-withheld" : "overview-warning"} className="flex flex-col gap-[7px] md:gap-[8px]">
      <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-faint)] md:text-[13.5px]">{line}</p>
      <div className="flex items-center gap-[14px] md:mt-[6px] md:flex-wrap md:gap-[16px]">
        {withWrite ? (
          <button
            type="button"
            aria-disabled="true"
            className="inline-flex min-h-[44px] cursor-default items-center rounded-[8px] border border-[var(--border-strong)] px-[16px] text-[13px] font-medium text-[var(--fg-disabled)] md:min-h-[36px]"
          >
            {synopsisCopy.writeOne}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSee}
          className="group inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] md:min-h-0"
        >
          {/* The dotted rule runs under the arrow too (the frames), unlike the tab's other links. */}
          <span className="border-b border-dotted border-[var(--accent)] group-hover:border-[var(--accent-hover)]">
            {deckNoticesCopy.check.seeWhich} <span aria-hidden>→</span>
          </span>
        </button>
      </div>
    </div>
  );
}
