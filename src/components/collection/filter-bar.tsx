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
import { filterCopy } from "../../lib/copy/lanes";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { ColourControl } from "../commanders/rack/colour-control";
import { CollectionFilterSheet } from "./filter-sheet";
import type { ColorOption } from "../../lib/collection/color-filter";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, FilterChipPill, type FilterChip } from "../ui/filter-chassis";
import { chassisCopy } from "../../lib/copy/filter-chassis";
import { useMinWidth } from "../ui/use-min-width";
import { ResultLine } from "../ui/result-line";
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
  // The CHASSIS's breakpoint, not `useIsDesktop`'s 768. The chassis switches
  // at 1000, and the search placeholder now follows this same `wide` rather
  // than its own 768px check — the two forms below are exactly the wide and
  // compact branches, so there is no longer a third breakpoint to reconcile.
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

  // Collection surfaces decision 6: a query, filter or sort change made while
  // the reader has scrolled past the head's rest offset returns them to it, so
  // results start under the pinned head rather than under wherever the list
  // happened to shorten to. Read the offset off a static SENTINEL sibling
  // rather than the sticky head's own ref: once the head is actually stuck,
  // Chromium's `offsetTop` on it tracks `window.scrollY` rather than reporting
  // its pre-stick static position, so a guard built on the head's own ref
  // never fires past that point (both read the same value once stuck). A
  // non-sticky sibling has no stuck state to fall into. Below 1000px only: the
  // wide chassis is untouched by this brief (decision 10).
  const headRef = useRef<HTMLDivElement>(null);
  const restOffsetSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wide) return;
    const el = restOffsetSentinelRef.current;
    if (!el) return;
    const offset = el.offsetTop;
    if (window.scrollY <= offset) return;
    // A single later scroll — observed consistently, on a sort change, shortly after a plain
    // `scrollTo` here succeeds — pulls the page back to its pre-reset position. Its source
    // wasn't pinned down (not scroll anchoring: disabling it changes nothing), so rather than
    // chase it, this reasserts the offset for half a second, which reliably wins the race
    // whatever still causes it.
    let frames = 0;
    const reassert = () => {
      if (window.scrollY !== offset) window.scrollTo(0, offset);
      frames++;
      if (frames < 30) requestAnimationFrame(reassert);
    };
    requestAnimationFrame(reassert);
    // `filters` and `sort`/`sortDirection` already change identity on every
    // edit, including a keystroke in search — nothing else needs to key this.
  }, [filters, sort, sortDirection, wide]);

  // E9: a tile reached by keyboard must not land under the pinned head.
  // Scoped to this mount (collection's own compact head) and cleaned up on
  // unmount and on crossing to wide, where the rule does not apply.
  useEffect(() => {
    if (wide) {
      document.documentElement.style.scrollPaddingTop = "";
      return;
    }
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () => {
      // 108/66, not the brief's provisional 102/60 — see the head's own comment below.
      document.documentElement.style.scrollPaddingTop = mq.matches ? "66px" : "108px";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.scrollPaddingTop = "";
    };
  }, [wide]);

  if (wide) {
    return (
      // §Filter Bar Container: sticky top:0 desktop, bg --bg, padding 18px 34px 14px desktop,
      // border-bottom 1px --border, z-index 2. Untouched by the collection surfaces brief
      // (decision 10): this branch is exactly what shipped before the pinned head.
      <div
        className="sticky top-0 z-[2]"
        style={{ background: "var(--bg)" }}
      >
        <FilterChassis
          form="wide"
          chips={chips}
          onClearAll={onClearAll}
          resultLine={resultLine}
          announce={announcement}
          announceId={announceId}
          revision={revision}
          warnResult={warnResult}
          sort={<FilterPanel
            key="sort-wide"
            portalSheet
            desktopRowMinPx={44}
            compact={false}
            copy={collectionFilterCopy.sort}
            options={buildSortOptions(sort, sortDirection)}
            selected={[sort]}
            selectionMode="single"
            selectionOrnament={false}
            showCounts={false}
            searchable={false}
            widthPx={260}
            footerStatus={false}
            onToggle={(code) => {
              const next = nextSortState({ sort, direction: sortDirection }, code as SortKey);
              onSortChange(next.sort, next.direction);
              onAnnounce(`Sorted by ${sortOrderLabel(next.sort, next.direction)}.`);
            }}
            onClear={() => {}}
            onAnnounce={onAnnounce}
          />}
          resultTrailing={
            <ViewToggle options={COLLECTION_VIEWS} value={view} onChange={onViewChange} className="ml-[2px]" />
          }
          controls={
            <>
              <SearchField
                containerClassName="gap-[10px] flex-1 px-[14px] py-[10px]"
                className="text-[14px]"
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                placeholder={collectionChassisCopy.searchPlaceholder.wide}
                aria-label="Search your cards"
                ref={searchRef}
              />
              <ColourControl
                wide
                colors={filters.colors.map((c) => c.toLowerCase())}
                match={filters.match ?? "contains"}
                onColorsChange={setColours}
                onMatchChange={(m) => onFiltersChange({ ...filters, match: m })}
                unavailable={colorOptions.filter((o) => o.disabled).map((o) => o.code)}
              />
              <FilterPanel
                key="type-wide"
                desktopRowMinPx={44}
                compact={false}
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
              <FilterPanel
                key="set-wide"
                desktopRowMinPx={44}
                compact={false}
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
              <FilterPanel
                key="avail-wide"
                desktopRowMinPx={44}
                compact={false}
                copy={collectionFilterCopy.availability}
                options={availabilityOptions.map((o) => ({
                  ...o,
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
          }
        />
      </div>
    );
  }

  // Below 1000px: collection's own pinned head (collection surfaces, R1 + addendum R2), not
  // the shared chassis. Two heights, both fixed and neither animated (STATES H1/H2):
  //   < 900px  — 108px, two rows: search + the view well, then Filters · Sort · the count.
  //   900-999  — 66px, one row: the same five controls side by side (`min-[900px]:flex-row`).
  // The brief's own arithmetic (8+44+6+36+7+1) states 102 and 60, 6px under both: it sizes
  // row 1 to the 44px search field alone, but `ViewToggle`'s shared compact well is 48px
  // content-box (`view-toggle.tsx`'s own 94×48 note) — 50px rendered with its border — and
  // row 1's height is the TALLER of the two. Shrinking that well just for this row would
  // repeat the drift `ViewToggle` exists to prevent (one control, one size, everywhere it is
  // mounted), so the head takes the well's real height instead of the brief's provisional one
  // — measured, the same way `CHASSIS_WIDE_MIN_PX` corrected the chassis breakpoint.
  // Chips leave the head entirely (decision 2 for this route, call 2): a 38px shelf sits
  // below it, in the ordinary scroll, only while a filter is on.
  return (
    <>
      {/* Static, never sticky: `headRef`'s own `offsetTop` tracks `scrollY` once the head is
          actually stuck, measured via a probe diagnostic — a non-sticky sibling's `offsetTop` is
          immune, since it has no stuck state to fall into. */}
      <div ref={restOffsetSentinelRef} aria-hidden className="h-0" />
      <div
        ref={headRef}
        className={[
          "sticky top-0 z-[2] flex flex-col gap-[6px]",
          "min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-[8px]",
          "border-0 border-b border-solid border-[color:var(--border)]",
          "px-[16px] pt-[8px] pb-[7px]",
        ].join(" ")}
        style={{ background: "var(--bg)" }}
      >
        {/* Row A — search, then the view well. The well hides under
            `:has(input:focus)` (readiness E2) rather than `:focus-within`,
            which would hide itself the moment Shift+Tab from Filters gave it
            focus and drop the reader's focus to nowhere. */}
        <div
          data-collection-search-row
          className="flex items-center gap-[8px] min-[900px]:flex-1 min-[900px]:min-w-0"
        >
          <SearchField
            containerClassName="gap-[8px] px-[12px] py-[9px] min-h-[44px] min-w-0 flex-1 rounded-[10px]"
            // 16px, the iOS zoom floor (#101; readiness E3) — the shipped 14px
            // zoomed the page on focus under a head that must not move.
            className="text-[16px]"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder={collectionChassisCopy.searchPlaceholder.compact}
            aria-label="Search your cards"
            ref={searchRef}
            // Readiness E4: the rack's own clear button and copy key — this
            // field had no clear control before the pinned head.
            trailing={
              filters.search !== "" ? (
                <button
                  type="button"
                  aria-label={filterCopy.search.clear}
                  onClick={() => onFiltersChange({ ...filters, search: "" })}
                  className="flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[color:var(--border)] p-0 text-[12px] leading-none text-[color:var(--fg-faint)]"
                >
                  ✕
                </button>
              ) : null
            }
          />
          <div data-collection-view-well className="flex-none">
            <ViewToggle options={COLLECTION_VIEWS} value={view} onChange={onViewChange} compact />
          </div>
        </div>

        {/* Row B — Filters (with its dimension badge), the hairline, Sort, the
            result count. Drawn at 36px (decision 7): the trigger and the
            count keep a 44px hit target through an overlay rather than a
            taller box, or the head would be 8px taller again. */}
        <div className="flex items-center gap-[8px] min-[900px]:flex-none">
          <FiltersTrigger
            active={activeDimensions}
            expanded={sheetOpen}
            onClick={() => setSheetOpen((open) => !open)}
          />
          <div aria-hidden className="h-[20px] w-px flex-none bg-[color:var(--border)]" />
          <FilterPanel
            key="sort-compact"
            portalSheet
            compact
            compactTriggerHeightPx={36}
            copy={collectionFilterCopy.sort}
            options={buildSortOptions(sort, sortDirection)}
            selected={[sort]}
            selectionMode="single"
            selectionOrnament={false}
            showCounts={false}
            searchable={false}
            widthPx={260}
            footerStatus={false}
            onToggle={(code) => {
              const next = nextSortState({ sort, direction: sortDirection }, code as SortKey);
              onSortChange(next.sort, next.direction);
              onAnnounce(`Sorted by ${sortOrderLabel(next.sort, next.direction)}.`);
            }}
            onClear={() => {}}
            onAnnounce={onAnnounce}
          />
          <div className="min-w-0 flex-1">
            <ResultLine
              line={resultLine}
              hiddenSuffix={collectionChassisCopy.resultCompactNoun(shown)}
              announce={announcement}
              announceId={announceId}
              revision={revision}
              warn={warnResult}
              // The filter sheet carries its own `role="status"` for the same count
              // (filter-sheet.tsx) — the same handover `silentResult` gives the shared
              // chassis elsewhere (rack, decks), so the two never announce it twice.
              silent={sheetOpen}
            />
          </div>
        </div>
      </div>

      {/* The shelf (call 2): only while a filter is on, below the head, in
          the ordinary scroll — never inside the sticky box (STATES H1, H3). */}
      {chips.length > 0 && (
        <div
          className="flex h-[38px] items-center gap-[6px] overflow-x-auto whitespace-nowrap px-[16px]"
          data-collection-chip-shelf
        >
          {chips.map((chip) => (
            <FilterChipPill key={chip.key} chip={chip} />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            aria-label={chassisCopy.chips.clearAllAria}
            className={[
              "relative ml-auto shrink-0 border-0 bg-transparent p-0",
              "font-mono text-[11px] leading-[14px] underline text-[color:var(--fg-muted)]",
              "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:min-w-[44px]",
              "after:w-full after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
              "cursor-pointer",
            ].join(" ")}
          >
            {chassisCopy.chips.clearAll}
          </button>
        </div>
      )}

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
    </>
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
        // Drawn at 36px (decision 7), with a 44px hit target kept by the
        // same `after:` overlay the chip ✕ and chassis Clear-all use —
        // drawing it at the shared 44px would make the pinned head 110px.
        "relative inline-flex h-[36px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap",
        "rounded-full border border-solid px-[13px] font-sans text-[12.5px] font-medium",
        "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:min-w-[44px] after:w-full",
        "after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
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
