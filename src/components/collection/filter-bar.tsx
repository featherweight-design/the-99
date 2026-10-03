"use client";
// Filter bar per property table §Filter Bar.
// Sticky top:0 on desktop; horizontal scroll on mobile.
// Every dropdown in the row is a FilterPanel: Type and Set multi-select, Color
// on mobile only (desktop keeps the inline pip row), and Sort single-select.
// Visual chrome matches the §Filter Button spec (radius 999px mobile / 8px desktop).

import { useEffect, useRef, useState } from "react";
import { type BrowseFilters, type SortDirection, type SortKey } from "../../lib/collection/browse";
import {
  buildSortOptions,
  nextSortState,
  sortOrderLabel,
} from "../../lib/collection/sort-options";
import type { SetOption } from "../../lib/collection/set-filter";
import type { TypeOption } from "../../lib/collection/type-filter";
import {
  toggleAvailability,
  type AvailabilityOption,
} from "../../lib/collection/availability-filter";
import type { AvailabilityState } from "../../lib/decks/availability";
import { collectionChassisCopy, collectionFilterCopy } from "../../lib/copy/collection";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { ColourControl } from "../commanders/rack/colour-control";
import { CollectionFilterSheet } from "./filter-sheet";
import type { ColorOption } from "../../lib/collection/color-filter";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, type FilterChip } from "../ui/filter-chassis";
import { useMinWidth } from "../ui/use-min-width";
import { SearchField } from "../ui/text-field";
import { FilterPanel } from "../ui/filter-panel";
// Placeholder copy differs by breakpoint (§Copy (placeholders)) and the
// placeholder attribute can't vary via CSS, so track the md breakpoint.
// The hook moved to ui/use-is-desktop.ts when filter-panel.tsx needed it too;
// it is re-exported here because browser.tsx already imports it from this file.
import { useIsDesktop } from "../ui/use-is-desktop";
import { ViewToggle, type ViewToggleOption } from "../ui/view-toggle";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";

export { useIsDesktop };


export type ViewMode = "rows" | "grid";

/** The key `useStoredView` keeps the browse choice under. Separate from the
 *  deck's: reading a collection as a grid of art and reading a deck as a list
 *  of lines are different habits, and a reader holds both at once. */
export const COLLECTION_VIEW_KEY = "the99:collection-view";

export function isViewMode(value: string): value is ViewMode {
  return value === "rows" || value === "grid";
}

const COLLECTION_VIEWS: readonly [ViewToggleOption<ViewMode>, ViewToggleOption<ViewMode>] = [
  { value: "rows", glyph: "≣", label: viewToggleCopy.collection.rows },
  { value: "grid", glyph: "▦", label: viewToggleCopy.collection.grid },
];

/**
 * How the selection was changed. `Clear` and "toggle the last one off" both
 * end at an empty selection but announce DIFFERENT strings, and the end state
 * cannot tell them apart — the caller says which it was.
 */
export type FilterChangeIntent =
  /**
   * The chassis's Clear, which empties every dimension at once. It is its own
   * intent because the per-dimension announcements are tried in order and the
   * first to claim the change wins — so reusing `clear-sets` here had a colour
   * or type clear announce "Set filter cleared.", which is simply not what
   * happened.
   */
  | "clear-all"
  | "clear-sets"
  | "clear-types"
  | "clear-colors"
  | "clear-availability";

export function FilterBar({
  filters,
  sort,
  sortDirection,
  view,
  setOptions,
  typeOptions,
  availabilityOptions,
  colorOptions,
  shown,
  total,
  availabilityOk,
  chips,
  onClearAll,
  resultLine,
  announceId,
  revision,
  warnResult,
  announcement,
  onAnnounce,
  onFiltersChange,
  onSortChange,
  onViewChange,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  sortDirection: SortDirection;
  /** `null` while the real view is still unresolved (no hint, pre-hydration): the toggle shows
      neither segment pressed, rather than claiming a view the page is not actually showing. */
  view: ViewMode | null;
  /** Owned sets, newest first, with counts under the other active filters. */
  setOptions: SetOption[];
  /** The whole type vocabulary, in the design's fixed order, with counts. */
  typeOptions: TypeOption[];
  /** The four availability states with counts under the other active filters. */
  availabilityOptions: AvailabilityOption[];
  /** The five hues with counts under the other active filters — zero means disabled. */
  colorOptions: ColorOption[];
  /** False when the availability aggregate could not be read (Task 7 / Task 9). */
  availabilityOk: boolean;
  /** Distinct cards surviving the filters, and distinct cards in the collection —
   * the sheet states its own count because it is `aria-modal` and the chassis's
   * result line is outside it. */
  shown: number;
  total: number;
  /** Chips the chassis draws, already shaped by `collectionChips`. */
  chips: FilterChip[];
  onClearAll: () => void;
  /** Row 3's sentence, composed by the browser from its three counts. */
  resultLine: string;
  /** Identity of the current announcement, so a repeat is heard as a new event. */
  announceId?: string | number;
  /** Something that moves when the list does, for queue staleness. */
  revision?: string | number;
  /** Draw the result line as a warning — zero results. */
  warnResult?: boolean;
  /** The bar's single live region content — the panel writes here too. */
  announcement: string;
  onAnnounce: (message: string) => void;
  /**
   * `intent` distinguishes the panel's `Clear` from toggling the last set off:
   * both land on an empty selection but announce different strings.
   */
  onFiltersChange: (f: BrowseFilters, intent?: FilterChangeIntent) => void;
  onSortChange: (s: SortKey, direction: SortDirection) => void;
  onViewChange: (v: ViewMode) => void;
}) {
  const isDesktop = useIsDesktop();
  // The CHASSIS's breakpoint, not this file's. `useIsDesktop` is 768 and the
  // chassis switches at 1000, so deriving the form from it rendered the wide,
  // no-wrap treatment across 768-999 — a route-specific breakpoint, which is
  // the thing one shared frame exists to prevent. `isDesktop` still governs
  // what it always did here, like the search placeholder.
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Crossing to wide unmounts the sheet, so leaving `open` true would reopen it
  // on the way back, unasked. The set surface and the deck sheet carry the same
  // reset for the same reason.
  //
  // `handOffFocus` is the other half. `useDialogA11y` returns focus to the
  // trigger it saved, and on this crossing that trigger unmounts in the very
  // same commit — so focus would land on `body` and a keyboard reader would be
  // put outside the controls that just appeared. The wide form's search field
  // takes it instead, which is `/decks`' answer to the identical problem.
  const [handOffFocus, setHandOffFocus] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Imperative, NOT `autoFocus`. This field sits in the same position in both
  // branches, so React reuses the one `<input>` across the crossing rather than
  // mounting a new one — and `autoFocus` is a MOUNT-time prop, so flipping it
  // true on a surviving element does nothing at all. The handoff looked wired
  // and left focus on `body`, which is the same trap a `/decks` round caught
  // once already.
  //
  // The flag is cleared on the way BACK to compact, during render, rather than
  // here — this codebase's lint forbids `setState` inside an effect, and
  // `/decks` resets its own handoff the same way.
  useEffect(() => {
    if (handOffFocus) searchRef.current?.focus();
  }, [handOffFocus]);
  const [sheetWasWide, setSheetWasWide] = useState(wide);
  if (sheetWasWide !== wide) {
    setSheetWasWide(wide);
    if (wide && sheetOpen) {
      setSheetOpen(false);
      setHandOffFocus(true);
    } else if (!wide && handOffFocus) {
      setHandOffFocus(false);
    }
  }

  // What the badge counts: DIMENSIONS with something on, never values, and
  // never search — search is visible beside the trigger, so counting it would
  // have the badge describe a control the reader can already see.
  const activeDimensions =
    (filters.colors.length > 0 ? 1 : 0) +
    (filters.types.length > 0 ? 1 : 0) +
    (filters.setCodes.length > 0 ? 1 : 0) +
    ((filters.availability ?? []).length > 0 ? 1 : 0);

  // LOWERCASE in and out, the rack's own case: the control rebuilds the selection by testing its
  // lowercase hues against what it was handed. This page keeps colours uppercase everywhere else
  // (the URL, `colorIdentity`), hence the lift on the way back.
  const setColours = (c: string[]) => onFiltersChange({ ...filters, colors: c.map((v) => v.toUpperCase()) });

  return (
    // §Filter Bar Container: sticky top:0 desktop, bg --bg, padding 18px 34px 14px desktop, border-bottom 1px --border, z-index 2
    //
    // The chassis's breakpoint, not `md:`. This carried a comment arguing the
    // opposite — that stickiness asks whether the viewport has room to spare
    // rather than which form the chassis takes — and that was wrong for a
    // reason the argument could not see: `z-[2]` opens a STACKING CONTEXT, so
    // across 768-999 the compact sheet's `z-50` was ranked inside it and the
    // desktop nav rail, a sibling at `z-30`, painted over an open modal and
    // stayed clickable. A z-index is only ever relative to its context, and
    // the context has to end where the compact form begins.
    <div
      className="min-[1000px]:sticky min-[1000px]:top-0 min-[1000px]:z-[2]"
      style={{ background: "var(--bg)" }}
    >
      <FilterChassis
        form={wide ? "wide" : "compact"}
        // The sheet is `aria-modal` and carries its own debounced count, so
        // both regions firing would have a reader hear the number twice. The
        // deck and rack surfaces hand over the same way.
        silentResult={!wide && sheetOpen}
        chips={chips}
        onClearAll={onClearAll}
        resultLine={resultLine}
        announce={announcement}
        announceId={announceId}
        revision={revision}
        warnResult={warnResult}
        sort={<FilterPanel
          // Keyed on the form: `FilterPanel` holds its own `open` and has no
          // reset, so a sheet opened below the breakpoint would still be open
          // as a desktop popover after a resize — a modal appearing without a
          // trigger click. The deck sheet and the rack's popovers carry the
          // same fix.
          key={`sort-${wide ? "wide" : "compact"}`}
          // Out of the head (collection surfaces E1): the head is about to pin, and a sheet
          // fixed inside a sticky head sits under the phone tab bar.
          portalSheet
          desktopRowMinPx={44}
          compact={!wide}
          copy={collectionFilterCopy.sort}
          options={buildSortOptions(sort, sortDirection)}
          selected={[sort]}
          selectionMode="single"
          // Exactly one order is always chosen, so a lit border would say "on"
          // about a control that is never off, and a badge would count one of one.
          selectionOrnament={false}
          showCounts={false}
          searchable={false}
          widthPx={260}
          footerStatus={false}
          onToggle={(code) => {
            const next = nextSortState({ sort, direction: sortDirection }, code as SortKey);
            onSortChange(next.sort, next.direction);
            // Announced as authored, not lowercased: the labels carry "A–Z" and
            // "WUBRG", and "a–z" / "wubrg" change how a screen reader says them.
            onAnnounce(`Sorted by ${sortOrderLabel(next.sort, next.direction)}.`);
          }}
          onClear={() => {}}
          onAnnounce={onAnnounce}
        />}
        resultTrailing={
          <>
        <ViewToggle
          options={COLLECTION_VIEWS}
          value={view}
          onChange={onViewChange}
          // The chassis's breakpoint, like every other control in this frame.
          compact={!wide}
          className={wide ? "ml-[2px]" : ""}
        />
          </>
        }
        controls={
          <>
        {/* Search input — §Search Input: bg --surface-sunken, border 1px --border-strong, radius 8px, padding 9px 12px mobile / 10px 14px desktop */}
        <SearchField
          containerClassName={
            wide
              ? "gap-[10px] flex-1 px-[14px] py-[10px]"
              // `min-h-[44px]`, like every other control in the compact row.
              // The drawn padding gives ~37-41px on its own.
              //
              // `min-w-0 flex-1` rather than the `min-w-[220px] shrink-0` this
              // carried while the row scrolled: search is the chassis's field
              // slot and the one child allowed to shrink. The floor and the
              // `shrink-0` existed to stop four other controls crushing it, and
              // those controls are in the sheet now.
              : "gap-[8px] px-[12px] py-[9px] min-h-[44px] min-w-0 flex-1"
          }
          className="text-[14px]"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder={
            isDesktop
              ? collectionChassisCopy.searchPlaceholder.wide
              : collectionChassisCopy.searchPlaceholder.compact
          }
          aria-label="Search your cards"
          ref={searchRef}
        />

        {/* The pips and the three dimension panels are the WIDE form only. On
            compact they live in the sheet, behind one trigger — the shelf
            `/decks` and the commander lanes already use. This route drew them
            inline instead and let the row scroll, which at 390px filled the row
            with search and pips and put Type, Set and Availability off-screen
            with nothing on screen saying they were there.

            Search stays out here at both widths, as it does on the commander
            lanes: a field a reader can see beats one they must open a dialog to
            reach, and the badge never counts it for the same reason. */}
        {wide ? (
          <>
        {/* One colour control at both widths. It was a desktop pip row plus a
            separate mobile `Color ▾` panel — two drawings and two ARIA roles for
            one filter. The `COLOR` caption went with the row that carried it
            (decision 17): it existed to explain five abstract squares, and the
            symbols explain themselves. */}
        {/* The commander rack's control (H10): the pips, then `Any` / `Exactly`. */}
        <ColourControl
          wide={wide}
          colors={filters.colors.map((c) => c.toLowerCase())}
          match={filters.match ?? "contains"}
          onColorsChange={setColours}
          onMatchChange={(m) => onFiltersChange({ ...filters, match: m })}
          // `color-filter.ts` builds these with `disabled: count === 0`. The
          // retired mobile Color panel passed them through and the pips must
          // too, or a hue no surviving card carries is selectable and empties
          // the list.
          unavailable={colorOptions.filter((o) => o.disabled).map((o) => o.code)}
        />


        {/* Type ▾ — the same panel as Set ▾ with the search field off (#100).
            The vocabulary is fixed and short, so there is nothing to search and
            no footer total worth showing. */}
        <FilterPanel
          // Keyed on the form: `FilterPanel` holds its own `open` and has no
          // reset, so a sheet opened below the breakpoint would still be open
          // as a desktop popover after a resize — a modal appearing without a
          // trigger click. The deck sheet and the rack's popovers carry the
          // same fix. Named, because these panels are siblings in one fragment
          // and a bare form string would give all four the same key.
          key={`type-${wide ? "wide" : "compact"}`}
          desktopRowMinPx={44}
          compact={!wide}
          copy={collectionFilterCopy.type}
          options={typeOptions}
          selected={filters.types}
          searchable={false}
          widthPx={300}
          footerStatus={false}
          onToggle={(code) =>
            onFiltersChange({
              ...filters,
              types: filters.types.includes(code)
                ? filters.types.filter((t) => t !== code)
                : [...filters.types, code],
            })
          }
          onClear={() => onFiltersChange({ ...filters, types: [] }, "clear-types")}
          onAnnounce={onAnnounce}
        />

        {/* Set ▾ — the designed searchable multi-select panel (#86). Rows carry
            the set abbreviation, which is also what the search matches (#118). */}
        <FilterPanel
          // Keyed on the form: `FilterPanel` holds its own `open` and has no
          // reset, so a sheet opened below the breakpoint would still be open
          // as a desktop popover after a resize — a modal appearing without a
          // trigger click. The deck sheet and the rack's popovers carry the
          // same fix.
          key={`set-${wide ? "wide" : "compact"}`}
          desktopRowMinPx={44}
          compact={!wide}
          copy={collectionFilterCopy.set}
          options={setOptions}
          selected={filters.setCodes}
          searchable
          onToggle={(code) =>
            onFiltersChange({
              ...filters,
              setCodes: filters.setCodes.includes(code)
                ? filters.setCodes.filter((c) => c !== code)
                : [...filters.setCodes, code],
            })
          }
          onClear={() => onFiltersChange({ ...filters, setCodes: [] }, "clear-sets")}
          onAnnounce={onAnnounce}
        />

        {/* Sort ▾ — the same panel as Type/Set in single-select mode (#119).
            Picking the chosen order again reverses it; `Clear` never renders,
            since a list is always sorted by something. */}


        {/* Availability ▾ (#43) — the Type ▾ shape: fixed four-item vocabulary,
            no search, no footer total. Rows carry the marker's glyph so the
            menu and the list agree about what each state looks like. */}
        <FilterPanel
          // Keyed on the form: `FilterPanel` holds its own `open` and has no
          // reset, so a sheet opened below the breakpoint would still be open
          // as a desktop popover after a resize — a modal appearing without a
          // trigger click. The deck sheet and the rack's popovers carry the
          // same fix.
          key={`avail-${wide ? "wide" : "compact"}`}
          desktopRowMinPx={44}
          compact={!wide}
          copy={collectionFilterCopy.availability}
          options={availabilityOptions.map((o) => ({
            ...o,
            // Free is the absence of a glyph, which is why the shipped
            // component refuses the state rather than returning null for it.
            // The seam only reads as a seam against the row it sits on.
            leadingGlyph:
              o.code === "free" ? null : (
                <AvailabilityGlyph state={o.code} seam="var(--surface-rail)" />
              ),
          }))}
          selected={filters.availability ?? []}
          searchable={false}
          widthPx={280}
          footerStatus={false}
          disabled={!availabilityOk}
          disabledAriaLabel={availabilityCopy.degraded.collectionFilterDisabledAria}
          onToggle={(code) =>
            onFiltersChange({
              ...filters,
              availability: toggleAvailability(
                filters.availability ?? [],
                code as AvailabilityState,
              ),
            })
          }
          onClear={() => onFiltersChange({ ...filters, availability: [] }, "clear-availability")}
          onAnnounce={onAnnounce}
        />

          </>
        ) : (
          <FiltersTrigger
            active={activeDimensions}
            expanded={sheetOpen}
            onClick={() => setSheetOpen((open) => !open)}
          />
        )}
          </>
        }
        after={
          /* Closed, this renders nothing: the sheet is never a hidden duplicate
             of the controls it replaces. */
          !wide && (
            <CollectionFilterSheet
              open={sheetOpen}
              onDismiss={() => setSheetOpen(false)}
              filters={filters}
              onChange={onFiltersChange}
              colorOptions={colorOptions}
              typeOptions={typeOptions}
              setOptions={setOptions}
              availabilityOptions={availabilityOptions}
              availabilityOk={availabilityOk}
              shown={shown}
              total={total}
            />
          )
        }
      />
    </div>
  );
}

/**
 * The compact form's one filter affordance. Module scope, as everywhere in this
 * codebase: a component declared inside `FilterBar` would be a new type on every
 * render and would remount its own subtree.
 *
 * The badge counts DIMENSIONS, not values — "3" beside a trigger that opens four
 * groups reads as three groups on, which is what it is. Zero draws no badge at
 * all rather than a `0`.
 */
function FiltersTrigger({
  active,
  expanded,
  onClick,
}: {
  active: number;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={collectionChassisCopy.sheet.triggerAria(active)}
      className={[
        "inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap",
        "rounded-full border border-solid px-[13px] font-sans text-[12.5px] font-medium",
        active > 0
          ? "border-[color:var(--accent)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-[color:var(--fg)]",
      ].join(" ")}
    >
      {collectionChassisCopy.sheet.trigger}
      {active > 0 && (
        <span
          aria-hidden
          className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--accent)] px-[5px] font-mono text-[10px] text-[color:var(--bg)]"
        >
          {active}
        </span>
      )}
    </button>
  );
}
