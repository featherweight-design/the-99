"use client";
// Filter bar per property table §Filter Bar.
// Sticky top:0 on desktop; horizontal scroll on mobile.
// Every dropdown in the row is a FilterPanel: Type and Set multi-select, Color
// on mobile only (desktop keeps the inline pip row), and Sort single-select.
// Visual chrome matches the §Filter Button spec (radius 999px mobile / 8px desktop).

import { type BrowseFilters, type SortDirection, type SortKey } from "../../lib/collection/browse";
import {
  buildSortOptions,
  nextSortState,
  sortOrderLabel,
} from "../../lib/collection/sort-options";
import type { ColorOption } from "../../lib/collection/color-filter";
import type { SetOption } from "../../lib/collection/set-filter";
import type { TypeOption } from "../../lib/collection/type-filter";
import {
  toggleAvailability,
  type AvailabilityOption,
} from "../../lib/collection/availability-filter";
import type { AvailabilityState } from "../../lib/decks/availability";
import { collectionFilterCopy } from "../../lib/copy/collection";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { ColorPip } from "./color-pip";
import { SearchField } from "../ui/text-field";
import { FilterPanel } from "../ui/filter-panel";
// Placeholder copy differs by breakpoint (§Copy (placeholders)) and the
// placeholder attribute can't vary via CSS, so track the md breakpoint.
// The hook moved to ui/use-is-desktop.ts when filter-panel.tsx needed it too;
// it is re-exported here because browser.tsx already imports it from this file.
import { useIsDesktop } from "../ui/use-is-desktop";

export { useIsDesktop };

const WUBRG = ["W", "U", "B", "R", "G"] as const;

export type ViewMode = "rows" | "grid";

/**
 * How the selection was changed. `Clear` and "toggle the last one off" both
 * end at an empty selection but announce DIFFERENT strings, and the end state
 * cannot tell them apart — the caller says which it was.
 */
export type FilterChangeIntent =
  | "clear-sets"
  | "clear-types"
  | "clear-colors"
  | "clear-availability";

export function FilterBar({
  filters,
  sort,
  sortDirection,
  colorOptions,
  view,
  setOptions,
  typeOptions,
  availabilityOptions,
  availabilityOk,
  announcement,
  onAnnounce,
  onFiltersChange,
  onSortChange,
  onViewChange,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  sortDirection: SortDirection;
  /** WUBRG, with counts under the other active filters — the mobile Color panel. */
  colorOptions: ColorOption[];
  view: ViewMode;
  /** Owned sets, newest first, with counts under the other active filters. */
  setOptions: SetOption[];
  /** The whole type vocabulary, in the design's fixed order, with counts. */
  typeOptions: TypeOption[];
  /** The four availability states with counts under the other active filters. */
  availabilityOptions: AvailabilityOption[];
  /** False when the availability aggregate could not be read (Task 7 / Task 9). */
  availabilityOk: boolean;
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

  function toggleColor(c: string) {
    const has = filters.colors.includes(c);
    onFiltersChange({
      ...filters,
      colors: has ? filters.colors.filter((x) => x !== c) : [...filters.colors, c],
    });
  }

  return (
    // §Filter Bar Container: sticky top:0 desktop, bg #14110E (--bg), padding 18px 34px 14px desktop, border-bottom 1px #2A241D (--border), z-index 2
    <div
      className="md:sticky md:top-0 md:z-[2] px-[16px] md:px-[34px] pt-[14px] pb-[14px] md:pt-[18px] md:pb-[14px]"
      style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      {/* §Filter Row: display flex, align center, gap 8px mobile / 12px desktop, horizontal-scroll on mobile */}
      <div className="flex items-center gap-[8px] md:gap-[12px] overflow-x-auto md:overflow-visible">
        {/* Search input — §Search Input: bg #181410 (--surface-sunken), border 1px #3A3229 (--border-strong), radius 8px, padding 9px 12px mobile / 10px 14px desktop */}
        <SearchField
          containerClassName="gap-[8px] md:gap-[10px] md:flex-1 px-[12px] md:px-[14px] py-[9px] md:py-[10px]"
          className="text-[14px]"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder={isDesktop ? "Search by card name…" : "Search your cards…"}
          aria-label="Search your cards"
        />

        {/* WUBRG pip selector (desktop) — §Color Filter */}
        <div
          className="hidden md:flex items-center gap-[6px] rounded-lg px-[10px] py-[7px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* §Color Filter Label "COLOR" — mono 10px, #8E8269 (--fg-faint), letter-spacing 0.1em, margin-right 2px */}
          <span className="font-mono text-[10px] mr-[2px] tracking-[0.1em]" style={{ color: "var(--fg-faint)" }}>
            COLOR
          </span>
          {WUBRG.map((c) => (
            <ColorPip
              key={c}
              color={c}
              selected={filters.colors.includes(c)}
              onToggle={() => toggleColor(c)}
            />
          ))}
        </div>

        {/* Mobile Color ▾ (#116) — the same overlaid panel as Type/Set. The
            <details> this replaces expanded in flow, pushing the filter row and
            the whole grid below it down the page on every open. */}
        <div className="md:hidden">
          <FilterPanel
            copy={collectionFilterCopy.color}
            options={colorOptions}
            selected={filters.colors}
            searchable={false}
            widthPx={260}
            onToggle={toggleColor}
            onClear={() => onFiltersChange({ ...filters, colors: [] }, "clear-colors")}
            onAnnounce={onAnnounce}
          />
        </div>

        {/* Type ▾ — the same panel as Set ▾ with the search field off (#100).
            The vocabulary is fixed and short, so there is nothing to search and
            no footer total worth showing. */}
        <FilterPanel
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
        <FilterPanel
          copy={collectionFilterCopy.sort}
          options={buildSortOptions(sort, sortDirection)}
          selected={[sort]}
          selectionMode="single"
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
        />

        {/* Availability ▾ (#43) — the Type ▾ shape: fixed four-item vocabulary,
            no search, no footer total. Rows carry the marker's glyph so the
            menu and the list agree about what each state looks like. */}
        <FilterPanel
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

        {/* View toggle — §View Toggle Container: bg #181410 (--surface-sunken), border 1px #3A3229 (--border-strong), radius 8px, padding 2px, gap 2px */}
        <div
          className="flex gap-[2px] md:ml-[2px] rounded-lg p-[2px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {(["rows", "grid"] as const).map((v) => {
            const active = v === view;
            return (
              <button
                key={v}
                type="button"
                aria-label={`${v === "rows" ? "Rows" : "Grid"} view`}
                aria-pressed={active}
                onClick={() => onViewChange(v)}
                // §View Toggle Segment: 28×24 mobile / 30×28 desktop, radius 6px, font 12/13px
                className={[
                  "flex items-center justify-center rounded-md text-[12px] md:text-[13px] w-[28px] h-[24px] md:w-[30px] md:h-[28px]",
                  active
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "bg-transparent text-[var(--fg-faint)]",
                ].join(" ")}
              >
                {v === "rows" ? "≣" : "▦"}
              </button>
            );
          })}
        </div>
      </div>

      {/* The bar's single live region. One region for the whole bar, so two
          filters changed in quick succession read in order rather than on top
          of each other — the panel writes here instead of owning its own. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
