"use client";

import { useId } from "react";

import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { WorkPulse } from "./work-pulse";

/**
 * The staleness banner (Analysis tab handoff, 2i and 2d): the ONE place staleness is said, drawn
 * above the grid over a held reading that stays whole. No icon, no accent stripe, no tag.
 *
 * - `stale` (2i): the deck changed since the reading. `role="status"`, and it is not announced on
 *   load: the region is present from the first paint, so its text is not a change.
 * - `failed` (2d): the re-read failed and the reading is from before the changes. `role="alert"`,
 *   which is what STATES:49 asks of a failure (the frames' `status` is conflict C4).
 * - `busy`: the press is in flight. The button disables in place and shows the work: the pulse and
 *   *Working out your bracket…* replace its label, and the credit note goes, because the press already drew
 *   it (addendum_overview_loading 1a, which supersedes STATES:19's "keeps its label"). The reading
 *   under it stays. A failed-mode *Try again* runs the same read, so it takes the same form.
 * - `blocked`: the deck is not whole (ruling 1). The sentence becomes the reason and the button is
 *   disabled, because pressing it would be refused.
 * - `note`: the credit note when the press also writes the overview (`CREDITS-overview.md` 7c, 7e).
 *   ONE node, placed by the 1300 grid: the sentence over the note, left-aligned, with the button
 *   beside both (benchmarks audit rule 9); sentence, button, note at 390, in DOM order. Tied to the button by `aria-describedby`, so the cost is
 *   heard before the press. None over a blocked deck, whose press writes nothing (finding 10b).
 *
 * `variant="note"` (H35, PR 4a; deck-description handoff §3 state 9, engineering note 10): the
 * SAME frame with no button and no busy/blocked machinery — Suggested changes' own refusal
 * sentence and its `tooMany` caption, one sentence, shown at both widths, above whatever set is
 * drawn below it. Not a new component, as the handoff asks: a second shape of this one.
 */
export function AnalysisBanner(props:
  | { variant: "note"; sentence: string }
  | {
      variant?: "banner";
      mode: "stale" | "failed";
      busy: boolean;
      /** The line to say instead, when the deck cannot be analyzed as it stands. */
      blocked: string | null;
      onRequest: () => void;
      note?: string | null;
      /** The overview check's *See which →*, after the note (deck notices HANDOFF §6). */
      see?: { label: string; onPress: () => void } | null;
    }) {
  const noteId = useId();
  if (props.variant === "note") {
    return (
      <div
        role="status"
        data-testid="analysis-banner"
        data-mode="note"
        className="flex flex-col items-stretch gap-[12px] rounded-[11px] border border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[15px] py-[14px] md:py-[14px] md:pl-[20px] md:pr-[16px]"
      >
        <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)] md:text-[13.5px]">
          {props.sentence}
        </p>
      </div>
    );
  }
  const { mode, busy, blocked, onRequest, note = null, see = null } = props;
  const copy = deckAnalysisCopy.banner;
  const disabled = busy || blocked !== null;
  const shownNote = blocked === null && !busy ? note : null;
  const sentence = blocked ?? (mode === "failed" ? copy.failedHeld : copy.stale);
  return (
    <div
      role={mode === "failed" ? "alert" : "status"}
      data-testid="analysis-banner"
      data-mode={mode}
      // THE 1300 FORM IS A GRID (benchmarks audit rule 9): the line over its note on the left,
      // left-aligned, the button on the right spanning both. The phone keeps its column, in DOM order.
      className="flex flex-col items-stretch gap-[12px] rounded-[11px] border border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[15px] py-[14px] md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-[18px] md:gap-y-[4px] md:py-[14px] md:pl-[20px] md:pr-[16px]"
    >
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)] md:col-start-1 md:row-start-1 md:min-w-0 md:text-[13.5px] md:[text-wrap:pretty]">
        {sentence}
      </p>
      <button
        type="button"
        onClick={disabled ? undefined : onRequest}
        aria-disabled={disabled || undefined}
        aria-describedby={shownNote ? noteId : undefined}
        className={
          "min-h-[44px] flex-none whitespace-nowrap rounded-[8px] text-[14px] font-semibold md:col-start-2 md:row-start-1 md:min-h-[36px] md:text-[13.5px] "
          // Spans the note's row only when there is a note: an empty second row would sit the line above the button's centre.
          + (shownNote ? "md:row-span-2 " : "")
          + (busy ? "px-[16px] " : "px-[18px] ")
          + (disabled
            ? "cursor-default bg-[color:var(--elevated)] text-[color:var(--fg-faint)]"
            : "bg-[color:var(--fg)] text-[color:var(--bg)]")
        }
      >
        {busy ? (
          <span className="inline-flex items-center gap-[9px]">
            <WorkPulse />
            <span>{deckAnalysisCopy.panel.loading.heading}</span>
          </span>
        ) : mode === "failed" ? copy.tryAgain : copy.reanalyze}
      </button>
      {shownNote ? (
        <p
          data-testid="press-note"
          className="m-0 text-center font-mono text-[9.5px] leading-[1.55] text-[color:var(--fg-faint)] md:col-start-1 md:row-start-2 md:text-left md:text-[11px] md:[text-wrap:pretty]"
        >
          {/* The button's description is the note's TEXT: a control inside it would be read as
              part of the description, so the id sits on the words alone. */}
          <span id={noteId}>{shownNote}</span>
          {see ? (
            <>
              {" "}
              <button
                type="button"
                onClick={see.onPress}
                data-testid="press-note-see"
                className="cursor-pointer whitespace-nowrap border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)] text-[color:var(--accent)] hover:border-[color:var(--accent-hover)] hover:text-[color:var(--accent-hover)]"
              >
                {see.label} <span aria-hidden="true">→</span>
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
