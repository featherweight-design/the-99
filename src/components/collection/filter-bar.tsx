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
import { ColourPips } from "../ui/colour-pips";
import { FilterChassis, type FilterChip } from "../ui/filter-chassis";
import { SearchField } from "../ui/text-field";
import { FilterPanel } from "../ui/filter-panel";
// Placeholder copy differs by breakpoint (§Copy (placeholders)) and the
// placeholder attribute can't vary via CSS, so track the md breakpoint.
// The hook moved to ui/use-is-desktop.ts when filter-panel.tsx needed it too;
// it is re-exported here because browser.tsx already imports it from this file.
import { useIsDesktop } from "../ui/use-is-desktop";
import Link from "next/link";
import { ViewToggle, type ViewToggleOption } from "../ui/view-toggle";
import { setPageCopy } from "../../lib/copy/set-collections";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";

export { useIsDesktop };


export type ViewMode = "rows" | "grid";

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
  availabilityOk,
  hasCollection,
  chips,
  onClearAll,
  resultLine,
  announcement,
  onAnnounce,
  onFiltersChange,
  onSortChange,
  onViewChange,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  sortDirection: SortDirection;
  view: ViewMode;
  /** Owned sets, newest first, with counts under the other active filters. */
  setOptions: SetOption[];
  /** The whole type vocabulary, in the design's fixed order, with counts. */
  typeOptions: TypeOption[];
  /** The four availability states with counts under the other active filters. */
  availabilityOptions: AvailabilityOption[];
  /** False when the availability aggregate could not be read (Task 7 / Task 9). */
  availabilityOk: boolean;
  /**
   * Whether the reader has a collection at all — NOT whether the current filters left any
   * sets. `setOptions` is filter-aware, so keying the By set pill on it removed the entry
   * point whenever a type or colour filter excluded everything, which is an ordinary thing
   * to do and has nothing to say about whether the sets page is worth visiting.
   */
  hasCollection: boolean;
  /** Chips the chassis draws, already shaped by `collectionChips`. */
  chips: FilterChip[];
  onClearAll: () => void;
  /** Row 3's sentence, composed by the browser from its three counts. */
  resultLine: string;
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
    // §Filter Bar Container: sticky top:0 desktop, bg --bg, padding 18px 34px 14px desktop, border-bottom 1px --border, z-index 2
    <div className="md:sticky md:top-0 md:z-[2]" style={{ background: "var(--bg)" }}>
      <FilterChassis
        form={isDesktop ? "wide" : "compact"}
        chips={chips}
        onClearAll={onClearAll}
        resultLine={resultLine}
        announce={announcement}
        sort={<FilterPanel
          desktopRowMinPx={44}
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
        />}
        resultTrailing={
          <>
        {hasCollection ? (
          <Link
            href="/collection/sets"
            aria-label={setPageCopy.entryPoint.aria}
            className="inline-flex shrink-0 items-center gap-[6px] rounded-lg px-[10px]
                       min-h-[44px] md:min-h-[auto] md:h-[46px] text-[13px]
                       border border-[color:var(--accent)] text-[color:var(--fg-body)]
                       hover:bg-[color:var(--elevated)]"
          >
            <span
              aria-hidden
              className="inline-block rotate-45 bg-[color:var(--accent)]"
              style={{ width: 7, height: 7 }}
            />
            {setPageCopy.entryPoint.label}
          </Link>
        ) : null}
        <ViewToggle
          options={COLLECTION_VIEWS}
          value={view}
          onChange={onViewChange}
          className="md:ml-[2px]"
        />
          </>
        }
        controls={
          <>
        {/* Search input — §Search Input: bg --surface-sunken, border 1px --border-strong, radius 8px, padding 9px 12px mobile / 10px 14px desktop */}
        <SearchField
          containerClassName="gap-[8px] md:gap-[10px] md:flex-1 px-[12px] md:px-[14px] py-[9px] md:py-[10px]"
          className="text-[14px]"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder={isDesktop ? "Search by card name…" : "Search your cards…"}
          aria-label="Search your cards"
        />

        {/* One colour control at both widths. It was a desktop pip row plus a
            separate mobile `Color ▾` panel — two drawings and two ARIA roles for
            one filter. The `COLOR` caption went with the row that carried it
            (decision 17): it existed to explain five abstract squares, and the
            symbols explain themselves. */}
        <ColourPips
          form={isDesktop ? "wide" : "sheet"}
          value={filters.colors}
          onToggle={(code) => toggleColor(code)}
        />


        {/* Type ▾ — the same panel as Set ▾ with the search field off (#100).
            The vocabulary is fixed and short, so there is nothing to search and
            no footer total worth showing. */}
        <FilterPanel
          desktopRowMinPx={44}
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
          desktopRowMinPx={44}
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
          desktopRowMinPx={44}
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

        {/* By set → the last control before the view well, and never inside it.
            The leading cluster changes WHAT IS IN THE LIST; the trailing cluster
            changes WHAT SURFACE YOU ARE ON, and sets is a surface.

            It always goes to the index. Carrying `Set ▾`'s current value into the
            route — so that filtering to EOE and tapping this lands on the EOE page —
            is exactly the state-sharing behind the Commanders/Discover confusion,
            and would make one control go to two places depending on a filter set ten
            minutes ago. If that shortcut is ever wanted it belongs inside the Set ▾
            menu as an explicit row that says so.

            `Set ▾` and this are opposites and share nothing: one narrows the cards you
            OWN to a set, the other leaves for a page of the ones you DO NOT. Three
            carriers keep them apart — position, shape (a diamond link, with no
            dropdown affordance) and the words. */}
          </>
        }
      />
    </div>
  );
}
