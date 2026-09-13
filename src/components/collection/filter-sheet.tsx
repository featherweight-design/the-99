"use client";

// `/collection`'s phone filter surface — the shelf the other three chassis
// routes already had.
//
// This route shipped without one. Its controls stayed inline and the row
// scrolled, which survived review because every control in it was individually
// correct: at 390px the pips and the search field filled the row and Type, Set
// and Availability sat off-screen with nothing on screen saying they were
// there. A scroll affordance is not a filter surface, and three separate
// geometry patches — a height floor, a width floor, `shrink-0` — were spent
// making the row survivable rather than replacing it.
//
// Same filters in, same whole-new-value out as the wide form, so the two cannot
// disagree. Neither reads nor writes a URL; `browser.tsx` does.
//
// Search is deliberately NOT in here. It sits on the persistent row, as it does
// on the commander lanes, because a field a reader can see beats one they must
// open a dialog to reach — and the badge never counts it, for the same reason.

import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { availabilityCopy } from "../../lib/copy/availability";
import { collectionChassisCopy, collectionFilterCopy } from "../../lib/copy/collection";
import { toggleAvailability } from "../../lib/collection/availability-filter";
import type { AvailabilityState } from "../../lib/decks/availability";
import type { BrowseFilters } from "../../lib/collection/browse";
import type { ColorOption } from "../../lib/collection/color-filter";
import { rankSetOptions, type SetOption } from "../../lib/collection/set-filter";
import type { TypeOption } from "../../lib/collection/type-filter";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { ColourPips } from "../ui/colour-pips";
import { SearchField } from "../ui/text-field";
import type { FilterChangeIntent } from "./filter-bar";

const copy = collectionChassisCopy.sheet;

/** 44px, not 36. This is the phone's only route to each filter (R3 §2). */
const CHIP =
  "flex h-[44px] cursor-pointer items-center gap-[7px] rounded-full border border-solid px-[13px] font-sans text-[13px]";

const HEADING =
  "mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] tracking-[0.14em] uppercase text-[color:var(--fg-faint)]";

export type CollectionFilterSheetProps = {
  open: boolean;
  onDismiss: () => void;
  filters: BrowseFilters;
  onChange: (next: BrowseFilters, intent?: FilterChangeIntent) => void;
  colorOptions: ColorOption[];
  typeOptions: TypeOption[];
  setOptions: SetOption[];
  availabilityOptions: { code: AvailabilityState; label: string; count: number }[];
  /** False when the availability aggregate could not be read; the group greys. */
  availabilityOk: boolean;
  shown: number;
  total: number;
};

/** Closed renders nothing: a sheet is never a hidden duplicate of the row. */
export function CollectionFilterSheet({ open, ...rest }: CollectionFilterSheetProps) {
  return open ? <SheetBody {...rest} /> : null;
}

function SheetBody({
  onDismiss,
  filters,
  onChange,
  colorOptions,
  typeOptions,
  setOptions,
  availabilityOptions,
  availabilityOk,
  shown,
  total,
}: Omit<CollectionFilterSheetProps, "open">) {
  const dialog = useRef<HTMLDivElement>(null);
  const [setQuery, setSetQuery] = useState("");

  // The sheet is `aria-modal`, so the chassis's result line is outside it and
  // is not a surface assistive tech can be relied on to read. Without a region
  // in here a filter changed inside the sheet is announced nowhere. The same
  // 300ms every other count in this codebase uses, so four taps are one
  // number — and the chassis stays silent while this is open, the two handing
  // over on dismissal.
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef<number | null>(null);
  useEffect(() => {
    if (announced.current === null || announced.current === shown) {
      announced.current = shown;
      return;
    }
    announced.current = shown;
    const timer = setTimeout(() => setAnnouncement(copy.match(shown, total)), 300);
    return () => clearTimeout(timer);
  }, [shown, total]);

  // The dialog takes initial focus rather than the first focusable, which would
  // be the set search field — raising the phone keyboard on a reader who
  // pressed `Filters` is not what they asked for.
  useDialogA11y(dialog, onDismiss, { initialFocusRef: dialog });

  // The query's matches, on their own. `sets` below prepends the selected
  // options so they stay reachable, which makes its length useless as a match
  // count — with LEA selected and `bloom` typed it would say two sets match
  // when one does.
  const matching = useMemo(() => rankSetOptions(setOptions, setQuery), [setOptions, setQuery]);

  const sets = useMemo(() => {
    // `rankSetOptions`, not a `label.includes` of my own: the wide panel ranks
    // with it and matches the set CODE as well as the name, so a hand-rolled
    // match here would find nothing for `BLB` while the desktop control found
    // Bloomburrow — the two forms of one filter disagreeing, which is the
    // thing this sheet exists to stop.
    // Selected sets stay visible whatever the query says, or unticking one
    // means clearing the field first to find it again.
    const selected = setOptions.filter((o) => filters.setCodes.includes(o.code));
    const seen = new Set(selected.map((o) => o.code));
    return [...selected, ...matching.filter((o) => !seen.has(o.code))];
  }, [matching, setOptions, filters.setCodes]);

  // The set search announces its own match count, on the same region and the
  // same debounce. `FilterPanel`'s search does this and the sheet's did not, so
  // a reader typing `zzz` watched the list empty and heard nothing — the result
  // effect above is keyed on `shown`, which a local query never moves.
  //
  // Nothing is said for a blank query — clearing the field is not a result —
  // and nothing for an empty VOCABULARY, where the list already reads
  // `No sets to filter by` and "No sets match" would contradict it. Both are
  // `FilterPanel`'s own rules.
  useEffect(() => {
    const query = setQuery.trim();
    if (query === "" || setOptions.length === 0) return;
    const timer = setTimeout(
      () => setAnnouncement(collectionFilterCopy.set.announceMatches(matching.length, query)),
      300,
    );
    return () => clearTimeout(timer);
  }, [setQuery, matching.length, setOptions.length]);

  const toggle = <T extends string>(list: readonly T[], code: T): T[] =>
    list.includes(code) ? list.filter((c) => c !== code) : [...list, code];

  return (
    // z-50, not z-40: the phone tab bar is z-40 and paints later, so at z-40 it
    // covers this sheet's own footer. `max-[999px]:flex` rather than a `sm:`
    // utility, because the chassis owns the breakpoint at 1000 and Tailwind has
    // no stop there — the deck sheet shipped as `sm:hidden` and left 640-999px
    // opening a dialog CSS had already hidden.
    <div className="fixed inset-0 z-50 hidden flex-col justify-end max-[999px]:flex">
      <div
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        tabIndex={-1}
        className="relative z-10 flex max-h-[86vh] flex-col gap-[14px] overflow-y-auto rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] px-[16px] pt-[12px] pb-[16px]"
      >
        <div
          aria-hidden="true"
          className="h-[4px] w-[38px] shrink-0 self-center rounded-[2px] bg-[color:var(--border-strong)]"
        />

        <div className="flex items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
            {copy.title}
          </h2>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--fg-faint)]">
            {copy.match(shown, total)}
          </span>
        </div>

        {/* Colour leads (decision 22), and it is the same control the wide form
            draws rather than a phone-shaped copy of it. */}
        <Group heading={copy.colourHeading}>
          <ColourPips
            form="sheet"
            value={filters.colors}
            onToggle={(code) => onChange({ ...filters, colors: toggle(filters.colors, code) })}
            unavailable={colorOptions.filter((o) => o.disabled).map((o) => o.code)}
          />
        </Group>

        <Group heading={copy.typeHeading}>
          <div className="flex flex-wrap gap-[8px]">
            {typeOptions.map((option) => (
              <Chip
                key={option.code}
                label={option.label}
                count={option.count}
                on={filters.types.includes(option.code)}
                disabled={option.disabled}
                unavailableAria={collectionFilterCopy.type.optionAriaUnavailable(option.label)}
                onClick={() => onChange({ ...filters, types: toggle(filters.types, option.code) })}
              />
            ))}
          </div>
        </Group>

        <Group heading={copy.availabilityHeading}>
          {/* `pointer-events-none` stops a mouse and nothing else, so the
              degraded state is carried on each chip rather than on the box —
              a keyboard could still activate a chip inside a box that only
              refused clicks.

              The group carries the REASON. Disabled chips alone tell a screen
              reader that four values are out and nothing about why, where the
              wide surface puts the same sentence on its disabled trigger. A
              reader who cannot see the dimming would otherwise be told less
              than a reader who can. */}
          <div
            className={`flex flex-wrap gap-[8px] ${availabilityOk ? "" : "opacity-[0.42]"}`}
            role="group"
            aria-label={
              availabilityOk
                ? copy.availabilityHeading
                : availabilityCopy.degraded.collectionFilterDisabledAria
            }
          >
            {availabilityOptions.map((option) => (
              <Chip
                key={option.code}
                label={option.label}
                count={option.count}
                on={(filters.availability ?? []).includes(option.code)}
                // The wide panel disables a zero-count state; the sheet cannot
                // be the one surface where a dead value is tappable.
                disabled={option.count === 0 || !availabilityOk}
                // The GROUP already carries the degraded dimming, and CSS
                // opacity compounds through a parent: 0.42 × 0.42 is 0.18, far
                // fainter than the selected chips beside them. Dimmed at one
                // level only.
                dimmed={availabilityOk}
                // The value's own name leads either way. The degraded sentence
                // says why filtering is out but never which value it is
                // attached to, so on its own it would replace the name rather
                // than explain it.
                unavailableAria={
                  availabilityOk
                    ? collectionFilterCopy.availability.optionAriaUnavailable(option.label)
                    : `${option.label}, ${availabilityCopy.degraded.collectionFilterDisabledAria}`
                }
                // `free` is the markerless state in the rows, so it is
                // markerless here too.
                glyph={
                  option.code === "free" ? undefined : (
                    <AvailabilityGlyph state={option.code} seam="var(--surface-inset)" />
                  )
                }
                onClick={() =>
                  onChange({
                    ...filters,
                    // `toggleAvailability`, not the generic toggle: it returns
                    // the selection in `AVAILABILITY_STATES` order, which is
                    // what the wide form writes. Click order would round-trip
                    // through the URL and come back reordered.
                    availability: toggleAvailability(
                      (filters.availability ?? []) as AvailabilityState[],
                      option.code,
                    ),
                  })
                }
              />
            ))}
          </div>
        </Group>

        {/* Sets are the one dimension a chip row cannot hold — a collection
            reaches into the hundreds — so this group carries its own field and
            scrolls. Not a nested `FilterPanel`: that renders a dialog of its
            own at this width, and two stacked `aria-modal` surfaces trap focus
            against each other. */}
        <Group heading={copy.setHeading}>
          <SearchField
            value={setQuery}
            onChange={(e) => setSetQuery(e.target.value)}
            placeholder={copy.setSearchPlaceholder}
            aria-label={copy.setSearchAria}
            containerClassName="gap-[8px] px-[12px] py-[9px] min-h-[44px]"
            className="text-[14px]"
          />
          <div className="mt-[8px] flex max-h-[188px] flex-col gap-[6px] overflow-y-auto">
            {sets.length === 0 ? (
              <p className="m-0 font-sans text-[13px] text-[color:var(--fg-muted)]">
                {/* An empty VOCABULARY is not a failed search, and the sheet
                    opens with a blank query — so a collection whose rows all
                    went unmatched against the catalog would have read
                    `No sets match ` with nothing after it. */}
                {setOptions.length === 0 ? copy.setNone : copy.setEmpty(setQuery.trim())}
              </p>
            ) : (
              sets.map((option) => (
                <Chip
                  key={option.code}
                  label={option.label}
                  count={option.count}
                  on={filters.setCodes.includes(option.code)}
                  disabled={option.disabled}
                  unavailableAria={collectionFilterCopy.set.optionAriaUnavailable(option.label)}
                  onClick={() =>
                    onChange({ ...filters, setCodes: toggle(filters.setCodes, option.code) })
                  }
                />
              ))
            )}
          </div>
        </Group>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-[2px] h-[44px] shrink-0 cursor-pointer rounded-lg border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] font-sans text-[14px] font-medium text-[color:var(--fg)]"
        >
          {copy.done}
        </button>

        {/* `aria-atomic`, like the deck sheet, the rack's sheet and `ResultLine`.
            Without it assistive tech may read only the changed substring — the
            new number alone, with no sentence around it. */}
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </span>
      </div>
    </div>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="shrink-0">
      <h3 className={HEADING}>{heading}</h3>
      {children}
    </section>
  );
}

function Chip({
  label,
  count,
  on,
  disabled,
  dimmed = true,
  unavailableAria,
  glyph,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  disabled?: boolean;
  /** False when an ancestor already dims — opacity compounds through a parent. */
  dimmed?: boolean;
  /** Why this value is out, in its dimension's own words. */
  unavailableAria?: string;
  glyph?: React.ReactNode;
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
      aria-label={out ? unavailableAria : undefined}
      onClick={() => {
        if (!out) onClick();
      }}
      className={[
        CHIP,
        out ? "cursor-default" : "",
        out && dimmed ? "opacity-[0.42]" : "",
        on
          ? "border-[color:var(--accent)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]",
      ].join(" ")}
    >
      {glyph}
      <span>{label}</span>
      <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
        {count.toLocaleString("en-US")}
      </span>
    </button>
  );
}
