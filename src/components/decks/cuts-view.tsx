"use client";

import type { HTMLAttributes, MouseEvent, ReactNode, Ref } from "react";

import { cutsPickWords, deckCutsCopy } from "../../lib/copy/deck-cuts";
import { creditsCopy } from "../../lib/copy/credits";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { cutsAsk, LEGACY_MAX_CUTS_PER_RUN, MAX_CUTS_PER_RUN } from "../../lib/tuning/cuts-ask";
import { cutChips, type Chip } from "../../lib/tuning/cuts-count";
import { cutStands, type CutItem, type CutsPanel } from "../../lib/tuning/cuts-state";
import { pickState, type PickState } from "../../lib/tuning/pick-n";
import type { MixRole } from "../../lib/decks/mix";
import { FailMark } from "../ui/credit-button";
import { ArtLayer } from "../ui/art-layer";
import { ArrivalOrder } from "../ui/arrival-queue";
import { CutsBand, CutsFrame, CutsFreeCount, CutsOffer, cutsBlocked, cutsFootStanding, cutsStanding } from "./cuts-free-count";
import { MutationError } from "./mutation-error";
import { PickList } from "./pick-list";

/**
 * Proposed cuts' DRAWING, from props alone (public landing demo, PR 5f): the count, the Look deeper offer, the running
 * band, the failed and refused bands, the named rows and the foot. `CutsPanelView` (`cuts-panel.tsx`) keeps the reading,
 * the presses and the optimistic flips and renders this; the landing demo renders it from the fictional fixture with
 * inert handlers. Nothing here calls a server action, reads the session or the card-detail provider: a row's card press
 * and hover handlers arrive as props (`CutRowView`).
 *
 * Listed in `PUBLIC_SURFACE_COMPONENTS`, so the public-surface walk keeps it pure.
 */

const copy = deckCutsCopy.panel;

/** The shape of a row's card hover and intent handlers: whatever the caller spreads on the name and the thumbnail. */
export type CardHandlers = HTMLAttributes<HTMLElement>;

/** The count failed to read: its own state, never a panel that vanishes. */
export function CutsFailedView({ headingRef }: { headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <section aria-labelledby="cuts-heading" className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:px-[20px] md:py-[18px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      <h2 id="cuts-heading" ref={headingRef} className="flex items-center gap-[9px] font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>
        <FailMark label={copy.failed.tag} />{copy.failed.heading}
      </h2>
      <p className="mt-[6px] text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.failed.body}</p>
    </section>
  );
}

/** The counting frame, drawn only after a short delay by the caller so a fast read never flashes it. */
export function CutsCountingView() {
  return (
    <section aria-label={copy.heading} aria-busy className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:px-[20px] md:py-[18px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      <h2 className="font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>{copy.heading}</h2>
      <p className="mt-[8px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{copy.counting}</p>
    </section>
  );
}

export type CutsViewProps = {
  panel: CutsPanel;
  /** A row's verdict as the presses have left it (the optimistic flips over the stored one). */
  verdictOf: (item: CutItem) => CutItem["verdict"];
  running: boolean;
  /** The last run failed (and is not hidden as a prior visit's). */
  failed: boolean;
  /** The last run was refused as ungrounded. */
  refusedRun: boolean;
  /** The named cuts are drawn. */
  resultShown: boolean;
  /** The result is a prior visit's: the count ignores its cuts. */
  priorResult: boolean;
  /** A past run History reopened. */
  reviewing: boolean;
  /** The running band's clock, `m:ss`. */
  elapsed: string;
  /** A refusal the panel keeps after the row that drew it is gone. */
  refused: string | null;
  /** The polite live region's text. */
  announced: string;
  onPress: () => void;
  onSeeRoleCards?: (role: MixRole) => void;
  headingRef?: Ref<HTMLHeadingElement>;
  /** One named cut's row: the caller's, so the card press and the verdict presses stay with it. */
  renderRow: (item: CutItem, items: CutItem[]) => ReactNode;
};

export function CutsView({
  panel, verdictOf, running, failed, refusedRun, resultShown, priorResult, reviewing, elapsed, refused, announced,
  onPress, onSeeRoleCards, headingRef, renderRow,
}: CutsViewProps) {
  const { items, over } = panel;
  const answered = items.filter((i) => verdictOf(i) !== "pending").length;
  const cutCount = items.filter((i) => verdictOf(i) === "accepted").length;
  const blocked = cutsBlocked(panel);
  const standing = cutsStanding(panel);

  // The result's rows against the cuts the deck needed when it ran (small items R1b): a run names three
  // more than that, and the head, the lead and the foot all read this one state (`pickState`).
  const counted = pickState({ named: items.length, needed: panel.asked, chosen: cutCount, answered });
  // "Back at 99" is said only of the list as it stands: the live over, less the Cuts pressed since it was read (a Cut
  // answers before the redraw that moves `over`, so the switch to enough stays instant). A run reopened over a deck that
  // has grown since reads as one still being chosen from, with the count's live over line.
  // Read from the deck's total, which is not clamped: a deck back at its body says so, one under says by how many.
  const pressedSinceRead = cutCount - items.filter((i) => i.verdict === "accepted").length;
  // A legal deck is 100 cards, commanders included (99 + one, or 98 + a partner pair).
  const liveOver = panel.total - pressedSinceRead - 100;
  // Every pick run with a cut made reads its phase from the list, wherever the cuts stand against the run's need: a run
  // reopened after cards left elsewhere can reach the line with fewer cuts than it needed.
  const pick = counted.phase !== "enough" && counted.phase !== "past" && counted.phase !== "choosing" ? counted
    : counted.chosen === 0 ? counted
    : liveOver > 0 ? { ...counted, phase: "choosing" as const }
    : liveOver === 0 ? { ...counted, phase: "enough" as const, past: 0 }
    : { ...counted, phase: "past" as const, past: -liveOver };
  const words = cutsPickWords(pick, { bodySize: panel.bodySize, asked: panel.itemsReport !== null ? panel.asked : items.length });
  // The lead: the over figure in --fg (never --warning), then what the state says next.
  const lead = (() => {
    if (running) return copy.deeper.pendingLead(cutsAsk(over));
    if (resultShown) return words.lead;
    if (failed || refusedRun) return copy.leadBare;
    return copy.lead;
  })();
  // Enough cut (or more): the lead's bold half says so, in place of the over line or the C8 box.
  const headline = resultShown && !running ? words.headline : null;
  // C8 COUNTS ONLY WHAT THIS TOOL CUT TOWARD THE LINE: a row of this visit's result (or the run
  // History reopened) that was cut and still stands (`cutStands`: the list holds fewer copies than
  // when it was cut, since a Cut removes one). A deck that reached the line by another edit, a copy
  // put back by hand, or an older visit's run says the neutral `Back to 99 / 99.`, never a count it
  // did not make (pre-open review and Copilot, 2026-10-15).
  const madeCuts = priorResult && !reviewing
    ? 0
    : items.filter((i) => verdictOf(i) === "accepted" && cutStands(i)).length;

  return (
    <CutsFrame
      aria-labelledby="cuts-heading"
      aria-busy={running || undefined}
      className="mt-[18px] md:mt-6"
    >
      <CutsFreeCount
        onSeeRoleCards={onSeeRoleCards}
        // The count reads the list as the presses have left it (a Cut or Undo answers before the redraw that moves
        // `over`), so an Undo back over the line shows the over lead at once, never the closing box.
        panel={pressedSinceRead === 0 ? panel : { ...panel, over: Math.max(0, liveOver), total: panel.total - pressedSinceRead }}
        lead={lead}
        headline={headline}
        cutCount={madeCuts}
        headingRef={headingRef}
        onPress={onPress}
        band={running ? (
          <CutsBand accent>
            <div className="flex flex-col gap-[10px] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{copy.deeper.pending}</p>
                <p className="mt-[3px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
                  {`${copy.deeper.pendingRead} · ${elapsed}`}
                </p>
              </div>
            </div>
          </CutsBand>
        ) : failed && !refusedRun ? (
          <CutsBand>
            <h3 className="flex items-center gap-[9px] font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>
              <FailMark label={copy.deeper.failedTag} />{copy.deeper.failedHeading}
            </h3>
            <p className="mt-[6px] text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.deeper.failedBody}</p>
            <CutsOffer panel={panel} variant="retry" blocked={blocked} standing={creditsCopy.afterLine(standing, ` · ${copy.deeper.untouched}`)} onPress={onPress} />
          </CutsBand>
        ) : refusedRun ? (
          <CutsBand>
            <p className="text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.deeper.refused}</p>
            <CutsOffer panel={panel} variant="offer" blocked={blocked} standing={creditsCopy.afterLine(standing, ` · ${copy.deeper.refusedFoot}`)} onPress={onPress} />
          </CutsBand>
        ) : panel.allLocked ? (
          <CutsBand><p className="text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.allLocked(panel.commander)}</p></CutsBand>
        ) : !resultShown ? undefined : null}
        after={(
          <>
            {over !== 0 && refused ? <MutationError message={refused} /> : null}
            {resultShown && !running ? (
              <ResultBlock panel={panel} pick={pick} words={words} standing={cutsFootStanding(panel)} renderRow={renderRow} />
            ) : null}
          </>
        )}
        divider={resultShown && !running ? (answered > 0 ? copy.facts.dividerPart : copy.facts.dividerResult) : null}
      />
      <p role="status" className="sr-only">{announced}</p>
    </CutsFrame>
  );
}

function ResultBlock({ panel, pick, words, standing, renderRow }: {
  panel: CutsPanel; pick: PickState; words: { head: string; foot: string };
  standing: string; renderRow: CutsViewProps["renderRow"];
}) {
  const { items, asked } = panel;
  const d = copy.deeper;
  // A run that hit the per-run cap leaves the rest of the overage for the next one.
  // A run from before prompt v5 (no `named` in its report) was capped at the old 15.
  const cap = panel.itemsReport?.named === undefined ? LEGACY_MAX_CUTS_PER_RUN : MAX_CUTS_PER_RUN;
  const more = asked >= cap ? Math.max(0, panel.over - items.filter((i) => i.verdict !== "accepted").length) : 0;
  // Only a run that named fewer than the deck needed leaves a slot: the three extra rows are a choice, not owed.
  const slots = Array.from({ length: Math.max(0, asked - items.length) }, (_, i) => items.length + i + 1);
  return (
    <PickList
      state={pick}
      words={{ head: () => words.head, foot: () => words.foot }}
      read={d.resultRead}
      footTail={standing}
      after={more > 0 ? (
        <p data-testid="cuts-more" className="mt-[10px] text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{d.resultMore(more)}</p>
      ) : null}
    >
      <ArrivalOrder>{items.map((item) => (
        <li key={item.id}>{renderRow(item, items)}</li>
      ))}</ArrivalOrder>
      {slots.map((n) => (
        <li key={`short-${n}`} data-testid="short-slot"
          className="flex flex-col gap-[3px] rounded-[9px] px-[12px] py-[10px] md:flex-row md:items-baseline md:justify-between"
          style={{ border: "1px dashed var(--border-dashed)" }}>
          <span className="text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{`– ${d.shortRow(n)}`}</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{d.shortWhy}</span>
        </li>
      ))}
    </PickList>
  );
}

export type CutRowViewProps = {
  item: CutItem;
  /** The row's verdict as the presses have left it. */
  verdict: CutItem["verdict"];
  /** A past run History reopened: a cut the deck has moved past is drawn, never offered. */
  reviewing: boolean;
  /** The panel's chip vocabulary (`panel.chips`), for the evidence chips. */
  chipSet: CutsPanel["chips"];
  /** A press is in flight: every control is disabled until the follow-up read lands. */
  busy: boolean;
  onAnswer: (kind: "cut" | "undo" | "keep" | "restore") => void;
  /** The card's name or thumbnail pressed. */
  onOpen: (event: MouseEvent<HTMLElement>) => void;
  /** Hover preview on the thumbnail and the name only, never the row (Hugh, 2026-10-12). */
  previewHandlers?: CardHandlers;
  /** The prefetch intent on the name. */
  intent?: CardHandlers;
};

/** One named cut, drawn from props: offered (Cut / Keep), answered (Cut or Kept, with its undo) or no longer applying. */
export function CutRowView({ item, verdict, reviewing, chipSet, busy, onAnswer, onOpen, previewHandlers = {}, intent = {} }: CutRowViewProps) {
  if (verdict !== "pending") {
    const done = verdict === "accepted";
    return (
      <div>
        <div
          data-testid={done ? "answered-cut" : "answered-kept"}
          className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
          style={{ background: done ? "var(--surface)" : "var(--surface-sunken)", border: `1px solid ${done ? "var(--success)" : "var(--border)"}` }}
        >
          {done ? (
            <span aria-hidden className="flex size-[15px] items-center justify-center rounded-[4px] text-[9px]" style={{ border: "1px solid var(--success)", color: "var(--success)" }}>{"✓"}</span>
          ) : null}
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: done ? "var(--success)" : "var(--fg-locked)" }}>
            {done ? copy.cutDone : copy.kept}
          </span>
          <button type="button" onClick={onOpen} {...previewHandlers} {...intent} aria-label={item.cutName}
            className={`min-w-0 text-left text-[13px] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid] ${done ? "line-through [text-decoration-color:var(--fg-locked)] text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>
            {item.cutName}
          </button>
          <button type="button" disabled={busy} onClick={() => onAnswer(done ? "undo" : "restore")}
            className="ml-auto min-h-[32px] rounded-[7px] px-[11px] py-[6px] text-[12px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] transition-colors">
            {done ? copy.undo : copy.showAgain}
          </button>
        </div>
      </div>
    );
  }

  // A reopened past run's cut the deck has moved past: drawn, never offered (re-review).
  if (reviewing && (item.inDeck === false || item.locked === true)) {
    return (
      <div
        data-testid="answered-broken"
        className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
      >
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>
          {deckTuningCopy.lists.noLongerApplies}
        </span>
        <span className="min-w-0 text-[13px]" style={{ color: "var(--fg-faint)" }}>
          {item.inDeck === false ? deckTuningCopy.lists.cutGone(item.cutName) : lockedCardsCopy.tuning.cutLocked(item.cutName)}
        </span>
      </div>
    );
  }

  const chips: Chip[] = cutChips(item.evidence, item.reason, chipSet);
  return (
    <article aria-label={item.cutName} className="flex flex-col gap-[9px] rounded-[9px] px-[12px] py-[11px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-[9px] md:flex-row md:items-center md:justify-between md:gap-[12px]">
        <span className="flex min-w-0 items-center gap-[10px]">
          <span className="w-[86px] flex-none rounded-full px-[8px] py-[2px] text-center font-mono text-[9px] uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-text)", border: "1px solid var(--accent-dim)" }}>{copy.suggestion}</span>
          <span aria-hidden {...previewHandlers} className="relative h-[31px] w-[22px] flex-none overflow-hidden rounded-[3px] [border:1px_solid_var(--border-strong)]">
            {item.cutImageUri ? <ArtLayer src={item.cutImageUri} /> : null}
          </span>
          <button type="button" onClick={onOpen} {...previewHandlers} {...intent} aria-label={item.cutName}
            className="min-w-0 text-left text-[13px] font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid]">
            {item.cutName}
          </button>
        </span>
        <span className="flex gap-[8px] md:flex-none md:gap-[7px]">
          <button type="button" disabled={busy} onClick={() => onAnswer("cut")}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-semibold text-[color:var(--accent-text)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] md:h-auto md:flex-none md:rounded-[7px] md:px-[13px] md:py-[6px] md:text-[12.5px] transition-colors">
            {copy.cut}
          </button>
          <button type="button" disabled={busy} onClick={() => onAnswer("keep")}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] md:h-auto md:flex-none md:rounded-[7px] md:px-[12px] md:py-[6px] md:text-[12.5px] transition-colors">
            {copy.keep}
          </button>
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.5] md:pl-[96px]" style={{ color: "var(--fg-body)" }}>{item.reason}</p>
      <ul className="flex flex-wrap gap-[6px] md:pl-[96px] md:gap-[5px]">
        {chips.map((c) => (
          <li key={c.key} className="flex items-baseline gap-[5px] rounded-[5px] px-[7px] py-[3px] font-mono text-[9.5px]"
            style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
            <span className="uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{c.kind}</span>
            <span style={{ color: "var(--fg-muted)" }}>{c.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
