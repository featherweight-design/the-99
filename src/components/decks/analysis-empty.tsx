"use client";

import { useId } from "react";

import type { Bracket } from "../../lib/bracket/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { BracketMark } from "./bracket-mark";
import { ProvenanceOpener } from "./provenance-panel";

const copy = deckAnalysisCopy.panel;

/** The ring's five marks, 1 at twelve o'clock and running clockwise: a 150px box, 50px radius, 44px marks. */
const RING: { bracket: Bracket; left: number; top: number }[] = ([1, 2, 3, 4, 5] as const).map((bracket, i) => {
  const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return {
    bracket,
    left: Math.round(75 + 50 * Math.cos(t) - 22),
    top: Math.round(75 + 50 * Math.sin(t) - 22),
  };
});

/**
 * The Analysis tab before a first reading (Analysis tab handoff §2, 2a to 2c): one empty state,
 * full width, and the grid withheld. No empty bracket box beside it, and no reserved space.
 *
 * THE RING IS DECORATIVE and `aria-hidden`: the heading carries the state, and is the live region.
 * That is also why its marks may sit at 0.3 (failed) and 0.22 (the loading trough), below
 * `DIM_OPACITY` — the 3:1 rule is for a mark that is read, and nothing here is read (readiness
 * finding 17).
 */
export function AnalysisEmpty({
  phase,
  stage = "reading",
  onRequest,
  blocked = null,
  note = null,
  see = null,
}: {
  phase: "idle" | "loading" | "failed";
  /**
   * While loading, what the press is doing: reading the deck, or (a first press that also writes
   * the overview, held until both can paint) writing the overview (Hugh, 2026-09-26).
   */
  stage?: "reading" | "writing";
  onRequest: () => void;
  /**
   * Ruling 1: the deck is not whole, so the press is disabled and this line says why, under it
   * (Hugh, 2026-09-23; undrawn in the handoff, so it borrows the busy button's look).
   */
  blocked?: string | null;
  /**
   * The credit note when this press also writes the overview (`CREDITS-overview.md` 7a, 7b): after
   * the button at 1300, with the provenance opener wrapped to its own line under the pair; centred
   * under the full-width button at 390. None over a blocked deck (finding 10b).
   */
  note?: string | null;
  /** The overview check's *See which →*, after the note (deck notices HANDOFF §6). */
  see?: { label: string; onPress: () => void } | null;
}) {
  const noteId = useId();
  const shownNote = blocked === null ? note : null;
  const text = phase === "loading"
    ? stage === "writing" ? copy.writing : copy.loading
    : phase === "failed" ? copy.failed : copy.idle;
  const busy = phase === "loading";
  const disabled = busy || blocked !== null;
  return (
    <section className="flex flex-col gap-[7px] md:gap-[8px]" data-testid="analysis-empty" data-phase={phase}>
      <h3 className="m-0 font-mono font-normal uppercase text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)] md:text-[10px] md:tracking-[0.16em]">
        {copy.overview}
      </h3>
      <div className="flex flex-col items-center text-center px-[4px] pt-[22px] pb-[8px] md:flex-row md:items-start md:justify-center md:gap-[40px] md:text-left md:px-[24px] md:pt-[28px] md:pb-[18px]">
        <span
          aria-hidden="true"
          data-testid="analysis-ring"
          className="relative mx-auto block h-[150px] w-[150px] flex-none md:mx-0"
          style={{ opacity: phase === "failed" ? 0.3 : undefined }}
        >
          {RING.map(({ bracket, left, top }, i) => (
            <span
              key={bracket}
              className={"absolute " + (busy ? "anim-at-wave" : "")}
              style={{ left, top, animationDelay: busy ? `${i * 0.16}s` : undefined }}
            >
              <BracketMark bracket={bracket} px={44} />
            </span>
          ))}
        </span>
        <div className="flex flex-col items-center md:min-w-0 md:max-w-[640px] md:flex-1 md:items-start">
          <h2
            aria-live="polite"
            role={phase === "failed" ? "alert" : undefined}
            className="m-0 mt-[22px] font-display text-[21px] font-bold leading-[1.25] text-[color:var(--fg)] [text-wrap:balance] md:mt-0 md:text-[26px]"
          >
            {text.heading}
          </h2>
          <p className="m-0 mt-[11px] max-w-[540px] text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty] md:mt-[12px] md:text-[14.5px] md:leading-[1.65]">
            {text.body}
          </p>
          {phase === "idle" ? (
            <p className="m-0 mt-[9px] max-w-[540px] text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty] md:mt-[10px] md:text-[14.5px] md:leading-[1.65]">
              {copy.idle.bodyPersist}
            </p>
          ) : null}
          <div className={`mt-[20px] flex w-full flex-col items-center gap-[6px] md:mt-[22px] md:w-auto md:flex-row md:flex-wrap md:gap-x-[20px] ${shownNote ? "md:gap-y-[12px]" : "md:gap-y-[20px]"}`}>
            {/* A BUTTON, NEVER AUTOMATIC. A silent retry loop is how a wait becomes a bill. */}
            <button
              type="button"
              onClick={disabled ? undefined : onRequest}
              aria-disabled={disabled || undefined}
              aria-describedby={blocked ? "analysis-blocked" : shownNote ? noteId : undefined}
              className={
                "inline-flex min-h-[44px] items-center justify-center self-stretch rounded-[8px] px-[22px] text-[14px] font-semibold md:self-auto md:text-[14.5px] "
                + (disabled
                  ? "cursor-default bg-[color:var(--elevated)] text-[color:var(--fg-faint)]"
                  : "cursor-pointer bg-[color:var(--fg)] text-[color:var(--bg)]")
              }
            >
              {phase === "failed" ? copy.failed.cta : copy.idle.cta}
            </button>
            {shownNote ? (
              <p
                data-testid="press-note"
                className="m-0 text-center font-mono text-[9.5px] leading-[1.55] text-[color:var(--fg-faint)] md:max-w-[340px] md:text-left md:text-[11px]"
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
                      className="cursor-pointer whitespace-nowrap border-b border-dotted border-[color:var(--accent)] text-[color:var(--accent)] hover:border-[color:var(--accent-hover)] hover:text-[color:var(--accent-hover)]"
                    >
                      {see.label} <span aria-hidden="true">→</span>
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
            {/* With a note in the row, the opener takes its own line under the pair (7a). */}
            <div className={shownNote ? "md:basis-full" : "contents"}>
              <ProvenanceOpener tone="accent" />
            </div>
            {/* IN the CTA row (the table's placement), on a line of its own under the press. */}
            {blocked ? (
              <p
                id="analysis-blocked"
                data-testid="analysis-blocked"
                className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] md:basis-full md:text-[13px]"
              >
                {blocked}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
