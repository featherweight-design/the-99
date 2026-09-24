"use client";

import { useId } from "react";

import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";

/**
 * The staleness banner (Analysis tab handoff, 2i and 2d): the ONE place staleness is said, drawn
 * above the grid over a held reading that stays whole. No icon, no accent stripe, no tag.
 *
 * - `stale` (2i): the deck changed since the reading. `role="status"`, and it is not announced on
 *   load: the region is present from the first paint, so its text is not a change.
 * - `failed` (2d): the re-read failed and the reading is from before the changes. `role="alert"`,
 *   which is what STATES:49 asks of a failure (the frames' `status` is conflict C4).
 * - `busy`: the press is in flight. The button disables IN PLACE, keeping its label, and the
 *   reading under it stays (STATES:19).
 * - `blocked`: the deck is not whole (ruling 1). The sentence becomes the reason and the button is
 *   disabled, because pressing it would be refused.
 * - `note`: the credit note when the press also writes the overview (`CREDITS-overview.md` 7c, 7e).
 *   ONE node, reordered at `md:`: sentence, note, button at 1300 (the note right-aligned beside the
 *   press); sentence, button, note at 390. Tied to the button by `aria-describedby`, so the cost is
 *   heard before the press. None over a blocked deck, whose press writes nothing (finding 10b).
 */
export function AnalysisBanner({
  mode,
  busy,
  blocked,
  onRequest,
  note = null,
  see = null,
}: {
  mode: "stale" | "failed";
  busy: boolean;
  /** The line to say instead, when the deck cannot be analyzed as it stands. */
  blocked: string | null;
  onRequest: () => void;
  note?: string | null;
  /** The overview check's *See which →*, after the note (deck notices HANDOFF §6). */
  see?: { label: string; onPress: () => void } | null;
}) {
  const copy = deckAnalysisCopy.banner;
  const noteId = useId();
  const disabled = busy || blocked !== null;
  const shownNote = blocked === null ? note : null;
  const sentence = blocked ?? (mode === "failed" ? copy.failedHeld : copy.stale);
  return (
    <div
      role={mode === "failed" ? "alert" : "status"}
      data-testid="analysis-banner"
      data-mode={mode}
      className="flex flex-col items-stretch gap-[12px] rounded-[11px] border border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[15px] py-[14px] md:flex-row md:items-center md:gap-[18px] md:py-[14px] md:pl-[20px] md:pr-[16px]"
    >
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)] md:order-1 md:min-w-0 md:flex-1 md:text-[13.5px]">
        {sentence}
      </p>
      <button
        type="button"
        onClick={disabled ? undefined : onRequest}
        aria-disabled={disabled || undefined}
        aria-describedby={shownNote ? noteId : undefined}
        className={
          "min-h-[44px] flex-none whitespace-nowrap rounded-[8px] px-[18px] text-[14px] font-semibold md:order-3 md:min-h-[36px] md:text-[13.5px] "
          + (disabled
            ? "cursor-default bg-[color:var(--elevated)] text-[color:var(--fg-faint)]"
            : "bg-[color:var(--fg)] text-[color:var(--bg)]")
        }
      >
        {mode === "failed" ? copy.tryAgain : copy.reanalyze}
      </button>
      {shownNote ? (
        <p
          data-testid="press-note"
          className="m-0 text-center font-mono text-[9.5px] leading-[1.55] text-[color:var(--fg-faint)] md:order-2 md:max-w-[340px] md:text-right md:text-[11px]"
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
    </div>
  );
}
