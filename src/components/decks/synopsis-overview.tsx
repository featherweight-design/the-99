"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { creditsCopy } from "../../lib/copy/credits";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { deckNoticesCopy } from "../../lib/copy/notices";
import { synopsisCopy } from "../../lib/copy/synopsis";
import type { SynopsisState } from "../../lib/synopsis/read";
import type { FindingArt } from "./receipt-modal";
import { MethodNotice } from "./method-notice";
import { SynopsisModal } from "./synopsis-body";
import { Press, RefusedSlot, WriteRow } from "./synopsis-controls";
import { SynopsisText } from "./synopsis-text";
import { WorkPulse } from "./work-pulse";
import { freeCount, hasCredit } from "../../lib/model/allowance-rule";

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
 * WHILE ONE IS WRITTEN (addendum_overview_loading, 1b to 1d): with nothing on hand the slot is one
 * status line, `Writing the overview…`; over a held overview the label row says a new one is being
 * written and the held text stays whole, so nothing is inserted above painted content. The new
 * paragraph replaces the held one in place, and `Overview ready.` is said once. A write that fails
 * leads with the failure and, over a held overview, labels it as older than the list.
 *
 * NO SPACE IS RESERVED for prose that is not there, and no partial sentence can arrive: a section
 * that failed checking has no content stored at all.
 */
export function SynopsisOverview({
  state,
  busy,
  pressed = false,
  announceReady = true,
  deckName,
  art,
  readingFresh,
  settled,
  onWrite,
  onRetry,
  onSeeWhich,
  reanalyze,
}: {
  state: SynopsisState;
  busy: boolean;
  /** A press of this page wrote (or tried to write) this overview: its credit note was drawn, so a
   *  failure that follows draws none. */
  pressed?: boolean;
  /** Off while a first press holds the tab: the panel says the verdict and the overview together
   *  when it lets go, and a second *Overview ready.* would repeat it. Nor does its overview fade in
   *  behind the loader, where the fade would play only once the tab is shown. */
  announceReady?: boolean;
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
  /** The banner's Re-analyze, for the modal over a reading that is itself stale (6d), held
   *  exactly as the tab's banner holds it: a short deck or a read in flight cannot press it. */
  reanalyze: { onPress: () => void; disabled: boolean; note: string | null };
}) {
  const [open, setOpen] = useState(false);
  // Written now: this page's press, or one another page load started (the stored row is pending).
  const writing = busy || state.pending;
  // SAID ONCE, WHEN A WRITTEN OVERVIEW LANDS: a write settling onto an overview current for this
  // list. Adjusted during render, as the verdict's own announcement is (`AnalysisPanel`).
  // THE CROSSFADE IS FOR A REPLACEMENT (1c): a new overview taking the place of a held one fades
  // in. A first overview arriving, or one painted with the whole tab when a hold lets go, does not.
  const [shownId, setShownId] = useState(state.synopsis?.id ?? null);
  const [replaced, setReplaced] = useState(false);
  if ((state.synopsis?.id ?? null) !== shownId) {
    setReplaced(announceReady && shownId !== null && state.synopsis !== null);
    setShownId(state.synopsis?.id ?? null);
  }
  const [wasWriting, setWasWriting] = useState(writing);
  const [announced, setAnnounced] = useState("");
  if (wasWriting !== writing) {
    setWasWriting(writing);
    // A notice still standing after the write means it produced no new-method overview (a free try
    // failed), so nothing is ready to announce: the notice's own alert speaks instead.
    setAnnounced(announceReady && !writing && !state.methodNotice && state.synopsis?.content?.overview && !state.stale ? synopsisCopy.ready : "");
  }
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
  // THE METHOD-CHANGE NOTICE (addendum_method_notice). A legality notice owns the slot (rule 8).
  const mn = state.illegal ? null : state.methodNotice;
  // A free try is left: the write spends no credit, so no refusal point below reads the allowance.
  const freeLeft = !!mn && mn.attemptsLeft > 0;
  // The notice carries a free run's failure (rule 5): the slot draws no failure row, rejection or
  // refusal of its own for it.
  const freeFailed = !!mn && state.lastFree;
  const lastFailed = state.lastFailed && !freeFailed;
  const lastRejected = state.lastRejected && !freeFailed;
  const lastRefused = freeFailed ? null : state.lastRefused;
  const content = synopsis?.content ?? null;
  const overviewVerdict = content?.verdicts.find((v) => v.section === "overview");
    // No write can reserve: every credit out, the app-wide cap reached, or the owner's share used.
  // Each disables the press in 7g's form and says which, never "uses a credit".
  const left = freeCount(allowance);
  const spent = !freeLeft && (!hasCredit(allowance) || !!allowance.paused || !!allowance.ownerShare);
  // A withheld overview offers no write at all (the server refuses one before its reservation).
  const canWrite = readingFresh && settled && !state.pending && !state.illegal;
  // THE NOTE KEYS ON WHAT THE PRESS DOES (credits audit, finding 4): `wouldSpend` for a write,
  // which is false when the list already has its overview; a section retry always spends. Every
  // credit out says so, whatever the press.
  // Spent, the credit comes back at `reopensAt`, which can be later than the earliest expiry
  // when more units count than the limit (a reservation beside spent units): as the tuning panel.
  const spentNote = allowance.paused
    ? creditsCopy.paused(allowance.paused.until)
    : allowance.ownerShare
      ? creditsCopy.ownerShare(new Date())
      : creditsCopy.spent(allowance.limit, allowance.reopensAt ?? allowance.nextAt);
  const spendNote = creditsCopy.first(left, allowance.limit, allowance.nextAt);
  // While a free try is left the press spends nothing, so no credit note stands over it.
  const note = freeLeft ? null : spent ? spentNote : state.wouldSpend ? spendNote : null;
  const retryNote = freeLeft ? null : spent ? spentNote : spendNote;

  const failedRow = (
    <FailedRow
      rejected={lastRejected}
      note={pressed ? null : canWrite ? note : null}
      disabled={!canWrite || spent}
      busy={busy}
      onPress={onWrite}
    />
  );

  // THE NOTICE (rule 6): over a reading the stale banner leads, and Re-analyze would write this
  // overview, the banner's press is the one press and the notice keeps its line and loses its
  // button (1f). Otherwise the notice carries the press itself, and ruling D's row beside it keeps
  // its caption and drops its button (rule 7): two buttons with different notes would run one write.
  const showNotice = !!mn && !!synopsis && !writing;
  const noticeLeads = showNotice && freeLeft && !readingFresh && state.pressWrites;
  const showsNoticePress = showNotice && !noticeLeads;

  // 1d over a held overview: the new write failed, so the failure leads, and the held paragraph under
  // it is labelled as older than the list.
  const heldFailed = !!content?.overview && !writing && stale && readingFresh && !state.illegal && !lastRefused && lastFailed;
  // Ruling D, drawn under whatever the older overview shows (its paragraph, or its refused
  // Overview slot): the write it offers, or what became of the last one. Not while a new one is
  // written: the label row says so.
  const followUp = stale && readingFresh && !state.illegal && !writing && !heldFailed
    ? lastRefused
      ? <RefusedSlot sentence={synopsisCopy.overviewRefused} failed={lastRefused.failed} total={lastRefused.total} onRetry={canWrite ? onWrite : null} busy={busy} note={note} spent={spent} />
      : lastFailed
      ? failedRow
      : <WriteRow line={synopsisCopy.olderThanList} label={showsNoticePress ? null : synopsisCopy.writeNew} note={note} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />
    : null;

  // WHICH NOTICE (addendum_method_notice 1a, 1d, 1e, 1f). Line B is a free try that failed with one
  // left; line C is both used, and the press is the paid one under the normal rules: when no credit
  // can be spent this month its "you can still write one with a credit" would be false, so it drops
  // the clause and the shipped note beside the disabled press says why.
  const method = synopsisCopy.method;
  // The label row says the rewrite is the new method's while a free try is being spent: this
  // page's press with one left, or a run another page load started and the ledger marks as free.
  const writingFree = writing && !!state.methodNotice && (busy ? state.methodNotice.attemptsLeft > 0 : state.lastFree);
  const oneLeft = mn?.attemptsLeft === 1;
  const none = mn?.attemptsLeft === 0;
  // The press moves focus to the label row's status as the notice goes (README, focus).
  const focusStatus = useRef(false);
  const statusRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (writing && focusStatus.current) {
      focusStatus.current = false;
      statusRef.current?.focus();
    }
  }, [writing]);
  const pressNotice = () => {
    focusStatus.current = true;
    onWrite();
  };
  const notice = showNotice && mn ? (
    <MethodNotice
      line={none ? (lastRejected ? synopsisCopy.rejected : lastFailed ? synopsisCopy.failed : spent ? method.triesUsedNoCredit : method.triesUsed) : oneLeft ? method.failed : method.line}
      note={noticeLeads ? method.withStale : none ? retryNote : oneLeft ? method.oneLeft : method.note}
      alert={oneLeft || none}
      // The paid press's own failure (the free tries are spent, so the slot's failure row is not
      // drawn over a held same-list overview): a rejection offers no retry, as everywhere else.
      cta={noticeLeads || (none && lastRejected) ? null : {
        label: oneLeft || (none && lastFailed) ? synopsisCopy.tryAgain : synopsisCopy.writeNew,
        disabled: !canWrite || (none && spent),
        busy,
        onPress: pressNotice,
      }}
    />
  ) : null;

  let body: React.ReactNode;
  if (!synopsis && state.illegal) {
    body = <CheckLine line={deckNoticesCopy.check.withheld} withWrite onSee={onSeeWhich} />;
  } else if (!synopsis && writing) {
    body = (
      <div role="status" data-testid="overview-writing" className="flex min-h-[44px] items-center gap-[10px] md:min-h-[36px]">
        <WorkPulse />
        <span className="text-[13px] leading-[1.55] text-[var(--fg-muted)] [text-wrap:pretty] md:text-[13.5px]">{synopsisCopy.writing}</span>
      </div>
    );
  } else if (!synopsis && lastRefused) {
    // Every section refused: Round 0's refused state, and no entry point.
    body = (
      <RefusedSlot
        sentence={synopsisCopy.overviewRefused}
        failed={lastRefused.failed}
        total={lastRefused.total}
        onRetry={canWrite ? onWrite : null}
        busy={busy}
        note={note}
        spent={spent}
      />
    );
  } else if (!synopsis) {
    body = lastFailed
      ? failedRow
      : <WriteRow line={synopsisCopy.absent} label={synopsisCopy.writeOne} note={canWrite ? note : null} disabled={!canWrite || spent} busy={busy} onPress={onWrite} />;
  } else if (content?.overview) {
    body = (
      <>
        {heldFailed ? (
          <>
            {failedRow}
            <p data-testid="overview-held-caption" className="m-0 mt-[10px] border-t border-[var(--border)] pt-[12px] font-mono text-[10.5px] leading-[1.5] text-[var(--fg-faint)]">
              {synopsisCopy.olderThanList}
            </p>
          </>
        ) : null}
        {/* Keyed on the overview, so a new one replaces the held one in place, fading in (1c). */}
        <p key={synopsis.id} className={`${replaced ? "anim-overview-in " : ""}text-[13.5px] leading-[1.65] md:text-[15px] md:leading-[1.7] md:max-w-[760px] text-[var(--fg-body)] [text-wrap:pretty]`}>
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
        // The notice holds the press when it is drawn (a partial new-method run left no overview).
        onRetry={canWrite && !stale && !showsNoticePress ? () => onRetry(synopsis.id) : null}
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
      <div className="flex flex-wrap items-center gap-[10px]">
        <h3 id="synopsis-overview-label" className="font-mono uppercase text-[9.5px] tracking-[0.14em] md:text-[10px] md:tracking-[0.16em] text-[var(--fg-faint)]">
          {synopsisCopy.label}
        </h3>
        {synopsis && writing ? (
          <span ref={statusRef} tabIndex={-1} role="status" data-testid="overview-writing-new" className="inline-flex items-center gap-[8px] outline-none">
            <WorkPulse />
            <span className="font-mono text-[10px] text-[var(--fg-muted)] md:text-[10.5px]">{writingFree ? method.writing : synopsisCopy.writingNew}</span>
          </span>
        ) : null}
      </div>
      <p role="status" className="sr-only">{announced}</p>
      {synopsis && state.illegal ? <CheckLine line={deckNoticesCopy.check.warning} onSee={onSeeWhich} /> : null}
      {notice}
      {body}
      {synopsis ? (
        <div className="flex min-h-[44px] items-center md:min-h-0 md:mt-[2px]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group inline-flex min-h-[44px] items-center gap-[8px] font-mono text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] md:min-h-0 cursor-pointer transition-colors"
          >
            <span className="border-b border-b-[color:var(--accent)] border-dotted border-[var(--accent)] group-hover:border-[var(--accent-hover)] transition-colors">{synopsisCopy.entry}</span>
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
          evidenceNames={state.evidenceNames}
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
 * 1d, the write failed (addendum_overview_loading): the shipped failure line, heard at once, and
 * Try again. No tag and no `--danger`: `not written` is a refusal's, and this is an outage.
 *
 * A REJECTED write (the upstream refused the request: a bad key, a retired model id) draws its own
 * line and no Try again, because a second press would be refused exactly as the first was.
 */
function FailedRow({ rejected, note, disabled, busy, onPress }: { rejected: boolean; note: string | null; disabled: boolean; busy: boolean; onPress: () => void }) {
  return (
    <div className="flex flex-col gap-[7px] md:gap-[8px]">
      <p role="alert" className="m-0 text-[13px] leading-[1.6] text-[var(--fg-muted)] [text-wrap:pretty] md:text-[13.5px]">{rejected ? synopsisCopy.rejected : synopsisCopy.failed}</p>
      {rejected ? null : <Press label={synopsisCopy.tryAgain} note={note} disabled={disabled} busy={busy} onPress={onPress} />}
    </div>
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
          className="group inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] md:min-h-0 transition-colors"
        >
          {/* The dotted rule runs under the arrow too (the frames), unlike the tab's other links. */}
          <span className="border-b border-b-[color:var(--accent)] border-dotted border-[var(--accent)] group-hover:border-[var(--accent-hover)] transition-colors">
            {deckNoticesCopy.check.seeWhich} <span aria-hidden>→</span>
          </span>
        </button>
      </div>
    </div>
  );
}
