"use client";

// The set list a filter sheet opens as a second layer (filter-chassis decision 23: `Set` and
// `Printed in` are the one place the compact form nests), and the 44px chip it lists with.
// Extracted from `collection/filter-sheet.tsx`, where it was private, so that any filter sheet
// opening a set list opens this one rather than a copy of it.

import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { rankSetOptions } from "../../lib/collection/set-filter";
import { SearchField } from "./text-field";
import { escapeDismisses } from "../../lib/ui/search-dismiss";

/** 44px, not 36. This is the phone's only route to each filter (R3 §2). */
// `shrink-0` is the height, not tidiness: in the set panel these are direct
// children of a `flex-1` column holding hundreds of options, and a flex item's
// default `flex-shrink: 1` compresses it toward min-content the moment the
// column overflows. `h-[44px]` alone bought 26px rows on a real collection —
// `min-h-0` constrains the LIST, and nothing was holding the options.
const CHIP =
  "flex h-[44px] shrink-0 cursor-pointer items-center gap-[7px] rounded-full border border-solid px-[13px] font-sans text-[13px]";

export type SetListOption = {
  code: string;
  label: string;
  /** The set's code, drawn after its name as the wide panel draws it. */
  hint?: string;
  count: number;
  disabled: boolean;
};

export type SetListSheetCopy = {
  panelAriaLabel: string;
  sheetTitle: string;
  footerSelected: (n: number, total: number) => string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  /** The list when there is nothing to list at all. */
  none: string;
  /** The list when the query matched nothing. */
  empty: (query: string) => string;
  optionAriaUnavailable: (name: string) => string;
  announceMatches: (n: number, query: string) => string;
  /** The rows the selection leaves, spoken from inside the panel. */
  announceResult: (shown: number, total: number) => string;
  done: string;
};

/**
 * A list of sets, as a panel above a filter sheet. Each surface that opens it brings its own copy.
 *
 * It holds a FIXED height rather than a cap: the complaint that moved it here
 * was that narrowing the list resized the surface under the reader's thumb, and
 * a `max-h` list inside a growing sheet does exactly that. At 86vh with the list
 * as the only flexible row, typing narrows the list and moves nothing else.
 *
 * It carries its own live region because it is `aria-modal`: the sheet's region
 * is outside it, and a count announced there would be written where nothing can
 * read it — the same reason the sheet has one at all.
 */
export function SetListSheet({
  copy,
  note,
  onDismiss,
  options,
  selected,
  onToggle,
  shown,
  total,
  returnFocusTo,
}: {
  /** A module-level constant, never a literal built in render: two effects depend on it, and a
      fresh object each render would restart their 300ms announcement timers. */
  copy: SetListSheetCopy;
  /** One quiet line under the search field. `Printed in` carries its hint here, since its rows
      match printings the reader does not own. */
  note?: string;
  onDismiss: () => void;
  options: SetListOption[];
  selected: readonly string[];
  onToggle: (code: string) => void;
  /** The result count a set toggle moves — announced HERE, not behind the sheet. */
  shown: number;
  total: number;
  /** The Set row, which is inert by the time this panel's own capture runs. */
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");

  // The panel takes initial focus rather than the search field, for the reason
  // the sheet does: raising the keyboard on a reader who pressed a row is not
  // what they asked for.
  useDialogA11y(dialog, onDismiss, { initialFocusRef: dialog, returnFocusRef: returnFocusTo });

  // The query's matches, on their own. `sets` below prepends the selected
  // options so they stay reachable, which makes its length useless as a match
  // count — with LEA selected and `bloom` typed it would say two sets match
  // when one does.
  const matching = useMemo(() => rankSetOptions(options, query), [options, query]);

  const sets = useMemo(() => {
    // `rankSetOptions`, not a `label.includes` of my own: the wide panel ranks
    // with it and matches the set CODE as well as the name, so a hand-rolled
    // match here would find nothing for `BLB` while the desktop control found
    // Bloomburrow — the two forms of one filter disagreeing, which is the
    // thing this panel exists to stop.
    // Selected sets stay visible whatever the query says, or unticking one
    // means clearing the field first to find it again.
    const chosen = options.filter((o) => selected.includes(o.code));
    const seen = new Set(chosen.map((o) => o.code));
    return [...chosen, ...matching.filter((o) => !seen.has(o.code))];
  }, [matching, options, selected]);

  // THE RESULT COUNT, from the foreground. The sheet runs the same effect and is
  // `inert` while this panel is up, so its region is out of the accessibility
  // tree — a set toggled in here moved the list and said so where nothing could
  // read it. Same 300ms as every other count in this codebase, so four taps are
  // one number, and the same first-render skip: opening the panel is not a result.
  const announcedShown = useRef<number | null>(null);
  useEffect(() => {
    if (announcedShown.current === null || announcedShown.current === shown) {
      announcedShown.current = shown;
      return;
    }
    announcedShown.current = shown;
    const timer = setTimeout(() => setAnnouncement(copy.announceResult(shown, total)), 300);
    return () => clearTimeout(timer);
  }, [shown, total, copy]);

  // Nothing is said for a blank query — clearing the field is not a result —
  // and nothing for an empty VOCABULARY, where the list already reads
  // `No sets to filter by` and "No sets match" would contradict it. Both are
  // `FilterPanel`'s own rules.
  useEffect(() => {
    const typed = query.trim();
    if (typed === "" || options.length === 0) return;
    const timer = setTimeout(
      () => setAnnouncement(copy.announceMatches(matching.length, typed)),
      300,
    );
    return () => clearTimeout(timer);
  }, [query, matching.length, options.length, copy]);

  return (
    // z-[60]: the sheet is z-50 and the phone tab bar is z-40, and this sits
    // over both.
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={copy.panelAriaLabel}
        tabIndex={-1}
        className="relative z-10 flex h-[86vh] flex-col gap-[12px] rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] px-[16px] pt-[12px] pb-[16px]"
      >
        <div
          aria-hidden="true"
          className="h-[4px] w-[38px] shrink-0 self-center rounded-[2px] bg-[color:var(--border-strong)]"
        />
        <div className="flex shrink-0 items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
            {copy.sheetTitle}
          </h2>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--fg-faint)]">
            {copy.footerSelected(selected.length, options.length)}
          </span>
        </div>

        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          // With a search typed, the first Escape clears it; the next closes the sheet.
          onKeyDown={(e) => escapeDismisses(e, query !== "", () => setQuery(""))}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchAriaLabel}
          containerClassName="shrink-0 gap-[8px] px-[12px] py-[9px] min-h-[44px]"
          className="text-[14px]"
        />

        {note && (
          <p className="m-0 shrink-0 font-sans text-[12.5px] text-[color:var(--fg-muted)]">{note}</p>
        )}


        {/* THE ONLY FLEXIBLE ROW. `min-h-0` is load-bearing: a flex child's
            default `min-height:auto` refuses to shrink below its content, so
            without it the list pushes `Done` off the bottom instead of
            scrolling. `overscroll-contain` (Hugh, 2026-10-03) stops a scroll of
            this list at either end from chaining into the page behind the sheet. */}
        <div className="flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto overscroll-contain">
          {sets.length === 0 ? (
            <p className="m-0 font-sans text-[13px] text-[color:var(--fg-muted)]">
              {/* An empty VOCABULARY is not a failed search, and the panel opens
                  with a blank query — so a collection whose rows all went
                  unmatched against the catalog would have read `No sets match `
                  with nothing after it. */}
              {options.length === 0 ? copy.none : copy.empty(query.trim())}
            </p>
          ) : (
            sets.map((option) => (
              <SheetChip
                key={option.code}
                label={option.label}
                hint={option.hint}
                count={option.count}
                on={selected.includes(option.code)}
                disabled={option.disabled}
                // The code joins the name as the wide panel's does, so the row that is out still
                // says which set it is.
                unavailableAria={copy.optionAriaUnavailable(
                  option.hint ? `${option.label} (${option.hint})` : option.label,
                )}
                // A pick clears the search it came from; the sheet stays open for the next.
                onClick={() => {
                  onToggle(option.code);
                  setQuery("");
                }}
              />
            ))
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="h-[44px] shrink-0 cursor-pointer rounded-lg border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] font-sans text-[14px] font-medium text-[color:var(--fg)]"
        >
          {copy.done}
        </button>

        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </span>
      </div>
    </div>
  );
}

export function SheetChip({
  label,
  hint,
  count,
  on,
  disabled,
  dimmed = true,
  unavailableAria,
  glyph,
  fill = false,
  onClick,
}: {
  label: string;
  /** A short secondary after the label: a set's code. */
  hint?: string;
  count: number;
  on: boolean;
  disabled?: boolean;
  /** False when an ancestor already dims — opacity compounds through a parent. */
  dimmed?: boolean;
  /** Why this value is out, in its dimension's own words. */
  unavailableAria?: string;
  glyph?: React.ReactNode;
  /**
   * Fill its grid cell: label at the left, count at the right edge (H8). A chip sized to
   * its own content is as wide as its COUNT, so a filter that took counts from four digits
   * to one reflowed the whole group, and the sheet shrank under the reader's thumb. A host
   * that lays chips in a fixed grid passes this so every chip is its cell's width.
   */
  fill?: boolean;
  onClick: () => void;
}) {
  const out = Boolean(disabled) && !on;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      // A value with no matches under the other filters stays listed and
      // disabled — `color-filter.ts` states the contract and the panels already
      // honour it, so the sheet cannot be the one surface where a dead value is
      // tappable. A LIT one stays live, or the filter that emptied the list is
      // the one nobody can turn off.
      aria-disabled={out ? true : undefined}
      // The wide panel explains a zero-count option in its dimension's own
      // words; a chip carrying only its label and count leaves a screen-reader
      // user with an unexplained dead control.
      // With a code, the name is composed as the wide panel composes its option's,
      // `Bloomburrow (BLB)`: read off the drawn spans it would run the name into the code.
      aria-label={out ? unavailableAria : hint ? `${label} (${hint}), ${count.toLocaleString("en-US")}` : undefined}
      onClick={() => {
        if (!out) onClick();
      }}
      className={[
        CHIP,
        fill ? "w-full min-w-0 justify-between" : "",
        out ? "cursor-default" : "",
        out && dimmed ? "opacity-[0.42]" : "",
        on
          ? "border-[color:var(--accent)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]",
      ].join(" ")}
    >
      {glyph}
      <span>{label}</span>
      {hint && <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{hint}</span>}
      <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
        {count.toLocaleString("en-US")}
      </span>
    </button>
  );
}
