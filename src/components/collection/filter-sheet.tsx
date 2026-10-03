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

import { useEffect, useRef, useState } from "react";
import { Sheet } from "../ui/sheet";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { availabilityCopy } from "../../lib/copy/availability";
import { collectionChassisCopy, collectionFilterCopy } from "../../lib/copy/collection";
import { toggleAvailability } from "../../lib/collection/availability-filter";
import type { AvailabilityState } from "../../lib/decks/availability";
import type { BrowseFilters } from "../../lib/collection/browse";
import type { ColorOption } from "../../lib/collection/color-filter";
import type { SetOption } from "../../lib/collection/set-filter";
import type { TypeOption } from "../../lib/collection/type-filter";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { ColourControl } from "../commanders/rack/colour-control";
import { SetListSheet, SheetChip, type SetListSheetCopy } from "../ui/set-list-sheet";
import type { FilterChangeIntent } from "./filter-bar";

const copy = collectionChassisCopy.sheet;

/** The shared set panel, in this sheet's words. */
const SET_LIST_COPY: SetListSheetCopy = {
  panelAriaLabel: collectionFilterCopy.set.panelAriaLabel,
  sheetTitle: collectionFilterCopy.set.sheetTitle,
  footerSelected: collectionFilterCopy.set.footerSelected,
  searchPlaceholder: copy.setSearchPlaceholder,
  searchAriaLabel: copy.setSearchAria,
  none: copy.setNone,
  empty: copy.setEmpty,
  optionAriaUnavailable: collectionFilterCopy.set.optionAriaUnavailable,
  announceMatches: collectionFilterCopy.set.announceMatches,
  announceResult: copy.match,
  done: collectionFilterCopy.set.done,
};

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
  // The gate stays HERE as well as inside `Sheet`, and they are not the same
  // gate. `Sheet` decides what is painted; this decides what is MOUNTED — and
  // the body owns a focus trap, a debounced announcement and the nested set
  // panel's open state. Mounted while closed, the trap runs against a hidden
  // panel, the announcement effect fires where nothing can read it, and the set
  // panel stays open across a dismiss.
  // `{ open, ... }` destructured, never `props.open` read off a bare `open`:
  // an unbound `open` resolves to `window.open`, which is a function and so
  // always truthy. No ReferenceError, no type error — `open` is a DOM global —
  // and the gate silently never closes.
  return open ? <SheetBody open={open} {...rest} /> : null;
}

function SheetBody({
  open,
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
}: CollectionFilterSheetProps) {
  const dialog = useRef<HTMLDivElement>(null);
  // The set list is a PANEL OF ITS OWN now, above this sheet (#6). Listing
  // hundreds of sets under a search field made them most of the sheet, and
  // narrowing the list resized the sheet under the reader's thumb on every
  // keystroke. Two stacked `aria-modal` surfaces are what `useDialogA11y`
  // already handles — it ignores a key whose focus is inside another dialog,
  // and `visibleFocusables` skips anything under an `inert` ancestor, which is
  // what this sheet becomes while the panel is up.
  const [setsOpen, setSetsOpen] = useState(false);
  // Handed to the panel as its return-focus target. The panel cannot find this
  // control for itself: opening it marks this whole sheet `inert` in the same
  // render, the browser moves focus out of an inert subtree, and the panel's own
  // mount effect then captures `body`.
  const setTrigger = useRef<HTMLButtonElement>(null);

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

  // The chosen set's own name, for the row's text AND for its accessible name —
  // one source, so the two cannot name different sets. Falls back to the code
  // where the option list has no row for it, which is what the wide panel does.
  const oneSetName =
    setOptions.find((o) => o.code === filters.setCodes[0])?.label ?? filters.setCodes[0];
  const setAriaDetail =
    filters.setCodes.length === 0
      ? ""
      : filters.setCodes.length === 1
        ? `, ${oneSetName}`
        : `, ${filters.setCodes.length} selected`;

  const toggle = <T extends string>(list: readonly T[], code: T): T[] =>
    list.includes(code) ? list.filter((c) => c !== code) : [...list, code];

  return (
    <Sheet
      open={open}
      // Out of the head (collection surfaces E1), with the Sort sheet: the head is about to
      // pin, and a sheet fixed inside a sticky head sits under the phone tab bar.
      portal
      onDismiss={onDismiss}
      ariaLabel={copy.title}
      panelRef={dialog}
      // Every control here stays mounted for layout while the set panel is up,
      // and the focus trap collects buttons by query — so without this, Tab or a
      // screen reader reaches the covered `Done` underneath the panel.
      inert={setsOpen}
      // z-50, not z-40: the phone tab bar is z-40 and paints later, so at z-40
      // it covers this sheet's own footer. `max-[999px]:flex` rather than a
      // `sm:` utility, because the chassis owns the breakpoint at 1000 and
      // Tailwind has no stop there — the deck sheet shipped as `sm:hidden` and
      // left 640-999px opening a dialog CSS had already hidden.
      frameClassName="fixed inset-0 z-50 hidden flex-col justify-end max-[999px]:flex"
      scrimClassName="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      // This route's handle and its offset, to the pixel. The shell's default is
      // 36px round in a 9px/4px wrapper; this is 38px at 2px radius under 12px
      // of padding, which with the 14px below puts the first heading 30px from
      // the panel top exactly as it did before.
      handleClassName="flex touch-none justify-center pt-[12px] pb-0"
      handleBarClassName="h-[4px] w-[38px] rounded-[2px] bg-[color:var(--border-strong)]"
      // This route's box, kept as it is: the chassis handoff specifies the
      // anchored panel and not the sheet, so collapsing the two vocabularies is
      // a design ruling rather than a refactor.
      panelClassName="relative z-10 flex max-h-[86vh] flex-col rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)]"
      // A SIBLING of the panel, never a child: the panel is `inert` while this
      // is up, and an inert subtree takes its descendants out of the
      // accessibility tree — so a panel nested inside it would be unreachable by
      // the very readers the trap exists for.
      beside={
        setsOpen && (
          <SetListSheet
            copy={SET_LIST_COPY}
            onDismiss={() => setSetsOpen(false)}
            options={setOptions}
            selected={filters.setCodes}
            onToggle={(code) => onChange({ ...filters, setCodes: toggle(filters.setCodes, code) })}
            shown={shown}
            total={total}
            returnFocusTo={setTrigger}
          />
        )
      }
    >
      <div className="flex flex-col gap-[14px] px-[16px] pt-[14px] pb-[16px]">
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
          {/* The commander rack's control in its sheet form (H10): the pips, then `Any` /
              `Exactly` at a 44px target. Lowercase in, uppercase back, as the bar does. */}
          <ColourControl
            wide={false}
            colors={filters.colors.map((c) => c.toLowerCase())}
            match={filters.match ?? "contains"}
            onColorsChange={(c) => onChange({ ...filters, colors: c.map((v) => v.toUpperCase()) })}
            onMatchChange={(m) => onChange({ ...filters, match: m })}
            unavailable={colorOptions.filter((o) => o.disabled).map((o) => o.code)}
          />
        </Group>

        <Group heading={copy.typeHeading}>
          {/* A FIXED two-column grid (H8, d9's ruling 2026-10-02): wrapped, each chip was
              as wide as its count, so a filter that zeroed counts took the group from three
              rows to two and the sheet shrank. Seven types are always four rows from 360px, and seven below it.
              Interim-consistent: Design's Collection round may redraw this sheet.
              ONE column below 360px: measured, two columns stop fitting Enchantment beside a
              five-digit count under ~346px, and 320 is the narrowest phone this app supports.
              A single column is still a fixed grid, so the rows still never reflow. */}
          <div data-type-grid className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-[8px]">
            {typeOptions.map((option) => (
              <SheetChip
                fill
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
              <SheetChip
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
            reaches into the hundreds — so the group is a single row that opens
            a panel of its own. */}
        <Group heading={copy.setHeading}>
          <button
            ref={setTrigger}
            type="button"
            onClick={() => setSetsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={setsOpen}
            // Composed exactly as `FilterPanel` composes its own
            // (`ui/filter-panel.tsx`): an `aria-label` REPLACES the button's
            // text, so a bare "1 selected" throws away the set name the row is
            // visibly showing — and the word at the end has to track
            // `aria-expanded` or the label says `collapsed` while the panel is
            // up. The copy module ships no key for either variant; every key it
            // has ends `collapsed`.
            aria-label={
              setsOpen
                ? `${collectionFilterCopy.set.panelAriaLabel}${setAriaDetail}, expanded`
                : filters.setCodes.length === 0
                  ? collectionFilterCopy.set.triggerAriaCollapsed
                  : filters.setCodes.length === 1
                    ? `${collectionFilterCopy.set.panelAriaLabel}, ${oneSetName}, collapsed`
                    : collectionFilterCopy.set.triggerAriaWithSelection(filters.setCodes.length)
            }
            className="flex h-[44px] w-full cursor-pointer items-center justify-between gap-[10px] rounded-lg border border-solid border-[color:var(--border-strong)] bg-transparent px-[13px] text-left font-sans text-[13px] text-[color:var(--fg-body)]"
          >
            {/* The row says what is CHOSEN, not what the control is — the heading
                above it already names the dimension, and a row reading `Set`
                under a heading reading `Set` tells the reader nothing. */}
            <span className="truncate">
              {filters.setCodes.length === 0
                ? copy.setAny
                : collectionChassisCopy.chip.sets(filters.setCodes.length, oneSetName)}
            </span>
            <span aria-hidden className="shrink-0 text-[color:var(--fg-faint)]">›</span>
          </button>
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
    </Sheet>
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
