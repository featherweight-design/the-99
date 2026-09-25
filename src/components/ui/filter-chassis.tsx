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
  /**
   * CSS colours drawn as leading swatches, one per value the label collapsed.
   * A colour chip reads "3 colours" rather than splitting into three chips, so
   * without these a sighted reader is told how many are on and never which.
   *
   * They are `aria-hidden`, which is why `spoken` exists: swatches say it with
   * colour and nothing else, so a screen reader needs the names in words.
   */
  dots?: readonly string[];
  /**
   * Drawn before the label. `/collection`'s availability chips carry the same
   * marker the list rows use, and a chip that named a state without its glyph
   * would be the one place that pairing breaks.
   */
  leading?: React.ReactNode;
  /**
   * What a screen reader hears in place of `label`, when the label collapsed
   * values into a count. "3 colours" tells a sighted reader to look at the
   * swatches; it tells everyone else nothing, and the row this chassis replaced
   * named each colour.
   *
   * Present, the chip hides its visible count from the accessibility tree and
   * exposes this instead — so the names are heard reading the row, not only on
   * entering the dismiss button.
   */
  spoken?: string;
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
  /**
   * Rendered after the three rows, inside the frame. This is the phone sheet's
   * home: it is an `aria-modal` dialog that belongs to the chassis's own
   * `Filters` trigger, and mounting it outside the frame would put the dialog
   * and the control that opens it in two different subtrees.
   *
   * Closed, a sheet returns null — never a hidden duplicate of the controls it
   * replaces, which is what `use-min-width.ts` exists to prevent.
   */
  after?: React.ReactNode;
  /**
   * Silence the result line's region while another surface owns the reader's
   * attention. The compact sheet is `aria-modal` and carries its own region, so
   * with both live a filter change is announced twice — once inside the modal
   * and once from the page behind it, which some assistive tech reads and some
   * does not. The line still draws; only the region goes quiet.
   */
  silentResult?: boolean;
  /**
   * Row 3's trailing edge. `/collection` puts its view toggle here
   * (decision 21) alongside the `By set` link: both change WHAT SURFACE YOU ARE
   * ON rather than what is in the list, which is the distinction the control
   * row is for, so neither belongs among the filters.
   */
  resultTrailing?: React.ReactNode;
  /** Announced in place of the result line — see `ResultLine`. */
  announce?: string;
  /** Identity of that announcement, so a repeated sentence still speaks. */
  announceId?: string | number;
  /**
   * Something that moves when the list does — see `ResultLine`'s `revision`.
   * Without it a message held while the compact sheet is silent can be
   * announced against a list it no longer describes, because a different filter
   * can leave the same count.
   */
  revision?: string | number;
  /** Draw the result line as a warning — see `ResultLine`'s `warn`. */
  warnResult?: boolean;
};

/**
 * Row 2's reserved height, in px, derived rather than eyeballed — the first
 * attempt at this floor was 22 and the chip is taller than that.
 *
 * A chip is `text-[11px]` over `py-[3px]` inside two 1px borders. Its height is
 * therefore the line box plus 8, and the line box is whatever line-height
 * applies — which is why the chip states its own (`leading-[14px]`) instead of
 * inheriting Tailwind's 1.5, where 11px yields 16.5 and the arithmetic stops
 * being a whole number anybody can check.
 *
 * 14 + 6 + 2 = 22. The rest state's `No filters on` takes the same
 * `leading-[14px]` so both branches occupy the same box, and the floor holds
 * whichever is showing. Without it the row grows the moment the first filter
 * goes on, moving row 3 and the list beneath it — the motion decision 2 exists
 * to prevent, and the reason the rest state prints a line instead of collapsing.
 */
const CHIP_LINE_HEIGHT_PX = 14;
const CHIP_ROW_MIN_PX = CHIP_LINE_HEIGHT_PX + 6 + 2;

/**
 * The width at which the control row would have to wrap, so it changes form
 * instead.
 *
 * MEASURED, and deliberately not the design's 1024. The handoff for the
 * commanders rack specifies `matchMedia('(min-width: 1024px)')`; the row's five
 * controls stop fitting at 1000, so that is where the form changes, and the
 * design tables carry an erratum saying so. Do not "correct" this to 1024 —
 * between 1000 and 1023 the wide rack is right, and a sheet there would be a
 * second door to controls already on screen.
 *
 * It is also the ONLY breakpoint the chassis has. A `useIsWide` hook sat beside
 * it at 1024, claiming in its own header to be the filter rack's, with no caller
 * anywhere in `src/`. The two read as rival live breakpoints and cost seven
 * findings in one review before the dead one was retired.
 */
export const CHASSIS_WIDE_MIN_PX = 1000;

/**
 * One removable chip. Exported because a route can need the chip row without the
 * frame around it — `/collection/sets` has no sort, so `FilterChassis`'s
 * never-empty sort slot does not fit it, and it showed a Clear only past one
 * active control where this frame shows one always.
 *
 * That route copied this markup instead, and four review rounds went on
 * hand-syncing the tokens back: the background, the border, the dismiss colour
 * and the spoken-name split each drifted separately. Duplication is what made
 * the drift possible, so the duplicate is gone rather than corrected again.
 */
export function FilterChipPill({ chip }: { chip: FilterChip }) {
  return (
    // The chip is a span and the ✕ inside it is the button, which is
    // how `/collection`'s retired chip row did it, and why. Making
    // the whole chip the target and centring a 44px overlay on it
    // looks equivalent and is not: chips sit 6px apart, so adjacent
    // overlays overlap and a tap near the boundary removes the
    // neighbour's filter. Anchored to the ✕, the nearest competing
    // target is a full chip-width away.
    <span
      className={[
        "inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-[7px]",
        "border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)]",
        "px-[8px] py-[3px] font-mono text-[11px] leading-[14px] text-[color:var(--fg-body)]",
      ].join(" ")}
    >
      {chip.leading}
      {chip.dots && chip.dots.length > 0 && (
        <span aria-hidden className="flex shrink-0 items-center gap-[3px]">
          {chip.dots.map((fill, i) => (
            <span
              key={i}
              className="h-[8px] w-[8px] flex-none rounded-full"
              style={{ background: fill }}
            />
          ))}
        </span>
      )}
      {chip.spoken ? (
        // The same split `buy-tag.tsx` uses: the count is for the eye,
        // the names are for the ear. Without this a screen reader
        // reading the row hears "2 colors" and has to enter the
        // dismiss button to learn which two — which the row this
        // replaces never made them do.
        <>
          <span aria-hidden="true">{chip.label}</span>
          <span className="sr-only">{chip.spoken}</span>
        </>
      ) : (
        chip.label
      )}
      <button
        type="button"
        onClick={chip.onRemove}
        aria-label={chassisCopy.chips.removeAria(chip.spoken ?? chip.label)}
        className={[
          "relative cursor-pointer border-0 bg-transparent p-0",
          "text-[color:var(--fg-faint)]",
          "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:w-[44px]",
          "after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
        ].join(" ")}
      >
        ×
      </button>
    </span>
  );
}

export function FilterChassis({
  controls, sort, chips, onClearAll, resultLine, form, after,
  silentResult, resultTrailing, announce, announceId, revision, warnResult,
}: FilterChassisProps) {
  return (
    <div
      // The horizontal padding follows the chassis's own form, not a Tailwind
      // breakpoint. `lg:` is 1024px while the chassis switches at 1000, so a
      // `lg:` padding would give 1000-1023px a third geometry: the wide form
      // with the compact frame's padding.
      className={[
        "flex flex-col gap-[10px] border-0 border-b border-solid",
        "border-[color:var(--border)] bg-[color:var(--surface-sunken)]",
        "pt-[12px] pb-[10px]",
        form === "wide" ? "px-[22px]" : "px-[16px]",
      ].join(" ")}
      data-chassis-form={form}
    >
      {/* Row 1 — never wraps (decision 18). There are two forms and nothing in
          between: a sort landing on its own line reads as a bug, which is what
          R1's wrapping row was reported as. `min-w-0` on the leading group is
          what makes search the only shrinking child. */}
      <div className="flex items-center gap-[8px]" data-chassis-row="controls">
        {/* No `overflow-hidden` here, ever. `FilterPanel` puts its desktop
            popover in an absolutely positioned descendant of its own relative
            root — its popover is `absolute` with a computed `left` — so clipping this group hides
            every panel the chassis opens — and it clips focus outlines with
            them. `min-w-0` is what lets the group shrink; the shrinking is
            constrained on the one control that may shrink, not by a clip. */}
        <div
          className={[
            // No `overflow-x-auto` here, in either form. `/collection` set a
            // `scrollCompactControls` flag for a while so its five inline
            // controls could scroll at 390px; a scroll affordance is not a
            // filter surface, and the three dimensions past the fold had
            // nothing on screen saying they existed. Every route now puts its
            // compact dimensions behind one trigger, so the row fits.
            "flex min-w-0 flex-auto items-center gap-[8px]",
          ].join(" ")}
        >
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
          <span className="font-mono text-[11px] leading-[14px] text-[color:var(--fg-faint)] py-[3px]">
            {chassisCopy.chips.none}
          </span>
        ) : (
          chips.map((chip) => <FilterChipPill key={chip.key} chip={chip} />)
        )}

        {/* Present and inert, never absent. The rule comes from the rack's own
            `ChipLine`, which this frame replaced: the affordance is part of what
            the row teaches, and a button that comes and goes has to be re-found.
            No line reference, because that component is deleted — the rule
            outlived it, which is the point of moving it here. */}
        <button
          type="button"
          disabled={chips.length === 0}
          onClick={onClearAll}
          aria-label={chassisCopy.chips.clearAllAria}
          className={[
            "relative ml-auto shrink-0 border-0 bg-transparent p-0",
            "font-mono text-[11px] leading-[14px] underline",
            "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:min-w-[44px]",
            "after:w-full after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
            chips.length === 0
              ? "cursor-default text-[color:var(--fg-locked)]"
              : "cursor-pointer text-[color:var(--fg-muted)]",
          ].join(" ")}
        >
          {chassisCopy.chips.clearAll}
        </button>
      </div>

      {/* Row 3 — the chassis's only live region. */}
      <div className="flex items-center gap-[10px]" data-chassis-row="result">
        <ResultLine line={resultLine} announce={announce} announceId={announceId} revision={revision} silent={silentResult} warn={warnResult} />
        {resultTrailing && (
          <div className="ml-auto flex items-center gap-[8px]">{resultTrailing}</div>
        )}
      </div>

      {after}
    </div>
  );
}
