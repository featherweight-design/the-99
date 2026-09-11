"use client";
// The app's one filter frame, per `design/design_handoff_the99_filter_chassis/`.
//
// Four routes filtered through three implementations before this: the commander
// rack (shared by `/commanders` and `/discover`), `/decks`'s desktop sidebar
// column, and `/collection`'s horizontal bar. They disagreed on where controls
// sit, on what a colour selector looks like, and — only on `/decks` — on
// whether filtering costs the reader horizontal room.
//
// This owns the frame and nothing else. Decision 19: the chassis has SLOTS, not
// a dimension list, and a route fills the slots it has. That is what lets four
// routes with genuinely different dimensions — status and last-played are
// `/decks` alone, type is `/collection` alone — share one frame without any of
// them carrying a control that means nothing to it.
//
// Three rows, always all three (decision 1). Row 2 prints `No filters on` at
// rest rather than collapsing (decision 2), which is the whole reason the frame
// is a fixed height: a chassis that shrank when you cleared a filter would move
// the list under the reader's eye at the exact moment they were reading it.

import React from "react";
import { chassisCopy } from "../../lib/copy/filter-chassis";
import { ResultLine } from "./result-line";

/** One removable value on the chip line. */
export type FilterChip = {
  /** Stable across renders — the dimension and value, not the index. */
  key: string;
  /** What the chip reads. `Status · Playing`, `3 colours`. */
  label: string;
  onRemove: () => void;
};

export type FilterChassisProps = {
  /**
   * Row 1. The route's controls in order, already built — fields, triggers,
   * segmented controls, pips. The chassis does not know what they are.
   */
  controls: React.ReactNode;
  /**
   * Row 1's trailing slot, past a hairline (decision 11). Sort is not a filter
   * and the separation says so, on every route and at both widths. A list is
   * always in some order, so this slot is never empty.
   */
  sort: React.ReactNode;
  /** Row 2. Empty renders `No filters on` rather than collapsing. */
  chips: readonly FilterChip[];
  onClearAll: () => void;
  /**
   * Row 3's sentence, finished by the route. Four routes word their counts
   * differently and none of them is a lane, so the chassis takes the sentence
   * rather than the state that produces it.
   */
  resultLine: string;
  /**
   * `wide` above 1000px, `compact` below (decision 18, with its arithmetic
   * corrected). Design's rule is "the minimums, plus a margin"; its stated
   * total of 887px is wrong — `/collection`'s eight widths sum to 859, its seven
   * 12px gaps add 84 and its padding adds 44, for **987px**. At 900 the wide
   * form would wrap, which is the defect decision 18 exists to prevent. 1000 is
   * that rule applied to the right number.
   *
   * The consequence is the one Design already named and accepted at 900: a small
   * laptop in a half-width window gets the compact treatment on a pointer
   * device, over a slightly wider band. The alternative — a per-route
   * breakpoint — makes the switch a per-route fact and the chassis stops being
   * one thing.
   */
  form: "wide" | "compact";
};

/**
 * Row 2's reserved height, in px. A chip draws at 11px over `py-[3px]` inside a
 * 1px border — 22px — while `No filters on` is a bare line box at roughly 16px.
 * Without a floor the row grows the moment the first filter goes on, which
 * moves row 3 and the list beneath it: exactly the motion decision 2 exists to
 * prevent, and the reason the rest state prints a line instead of collapsing.
 */
const CHIP_ROW_MIN_PX = 22;

/** The width at which the control row would have to wrap, so it changes form instead. */
export const CHASSIS_WIDE_MIN_PX = 1000;

export function FilterChassis({
  controls, sort, chips, onClearAll, resultLine, form,
}: FilterChassisProps) {
  return (
    <div
      className="flex flex-col gap-[10px] border-0 border-b border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[16px] pt-[12px] pb-[10px] lg:px-[22px]"
      data-chassis-form={form}
    >
      {/* Row 1 — never wraps (decision 18). There are two forms and nothing in
          between: a sort landing on its own line reads as a bug, which is what
          R1's wrapping row was reported as. `min-w-0` on the leading group is
          what makes search the only shrinking child. */}
      <div className="flex items-center gap-[8px]" data-chassis-row="controls">
        {/* No `overflow-hidden` here, ever. `FilterPanel` puts its desktop
            popover in an absolutely positioned descendant of its own relative
            root (`filter-panel.tsx:806-874`), so clipping this group hides
            every panel the chassis opens — and it clips focus outlines with
            them. `min-w-0` is what lets the group shrink; the shrinking is
            constrained on the one control that may shrink, not by a clip. */}
        <div className="flex min-w-0 flex-auto items-center gap-[8px]">
          {controls}
        </div>
        {/* The hairline is the separation, and it is why sort reads as not-a-filter. */}
        <div
          aria-hidden
          className="h-[20px] w-px flex-none bg-[color:var(--border)]"
          data-chassis-hairline
        />
        <div className="flex flex-none items-center">{sort}</div>
      </div>

      {/* Row 2 — present at rest, which is the invariant. Never conditionally
          rendered: `{chips.length > 0 && …}` is the bug this decision forbids. */}
      <div
        className="flex flex-wrap items-center gap-[6px]"
        style={{ minHeight: CHIP_ROW_MIN_PX }}
        data-chassis-row="chips"
      >
        {chips.length === 0 ? (
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
            {chassisCopy.chips.none}
          </span>
        ) : (
          <>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                aria-label={chassisCopy.chips.removeAria(chip.label)}
                // The chip's drawn size is small and stays small; the touch
                // target is an `::after` overlay centred on it, the same
                // treatment `collection/chip-row.tsx:191-203` uses. Growing the
                // chip itself to 44px would make the chip line three times its
                // drawn height, and the chip line's height is the invariant the
                // whole frame rests on.
                className={[
                  "relative inline-flex cursor-pointer items-center gap-[6px] rounded-[7px]",
                  "border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)]",
                  "px-[8px] py-[3px] font-mono text-[11px] text-[color:var(--fg-body)]",
                  "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:min-w-[44px]",
                  "after:w-full after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
                ].join(" ")}
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onClearAll}
              aria-label={chassisCopy.chips.clearAllAria}
              // Same hit-area treatment as the chip beside it: an overlay
              // rather than padding, so the control clears 44px without the
              // chip line growing. Overlooked when the chips got theirs — one
              // control in a row is never the whole class.
              className={[
                "relative cursor-pointer border-0 bg-transparent p-0",
                "font-mono text-[11px] text-[color:var(--fg-muted)] underline",
                "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:min-w-[44px]",
                "after:w-full after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
              ].join(" ")}
            >
              {chassisCopy.chips.clearAll}
            </button>
          </>
        )}
      </div>

      {/* Row 3 — the chassis's only live region. */}
      <div data-chassis-row="result">
        <ResultLine line={resultLine} />
      </div>
    </div>
  );
}
