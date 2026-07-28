"use client";
// Filter bar per property table §Filter Bar.
// Sticky top:0 on desktop; horizontal scroll on mobile.
// Position dropdowns are native <select> for a11y + parity; visual chrome
// matches the §Filter Button spec (radius 999px mobile / 8px desktop).

import { AVAILABLE_TYPES, type BrowseFilters, type SortKey } from "../../lib/collection/browse";
import type { SetOption } from "../../lib/collection/set-filter";
import { collectionFilterCopy } from "../../lib/copy/collection";
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

export function FilterBar({
  filters,
  sort,
  view,
  setOptions,
  announcement,
  onAnnounce,
  onFiltersChange,
  onSortChange,
  onViewChange,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  view: ViewMode;
  /** Owned sets, newest first, with counts under the other active filters. */
  setOptions: SetOption[];
  /** The bar's single live region content — the panel writes here too. */
  announcement: string;
  onAnnounce: (message: string) => void;
  onFiltersChange: (f: BrowseFilters) => void;
  onSortChange: (s: SortKey) => void;
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

        {/* Mobile "Color" pill — opens a stacked color chooser. Uses the same
            filter-button styling as Type/Set/Sort. Cycles through WUBRG one tap at a time. */}
        <details className="md:hidden">
          <summary
            className="cursor-pointer list-none whitespace-nowrap rounded-full px-[12px] py-[6px] font-sans text-[12.5px] font-medium"
            style={{
              color: "var(--fg)",
              background: "var(--elevated)",
              border: "1px solid var(--border-strong)",
            }}
          >
            Color
          </summary>
          <div className="mt-2 flex gap-2 p-2 rounded-lg" style={{ background: "var(--surface-sunken)", border: "1px solid var(--border-strong)" }}>
            {WUBRG.map((c) => (
              <ColorPip
                key={c}
                color={c}
                selected={filters.colors.includes(c)}
                onToggle={() => toggleColor(c)}
              />
            ))}
          </div>
        </details>

        {/* Type ▾ */}
        <select
          value={filters.type ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || null })}
          aria-label="Filter by type"
          className="whitespace-nowrap rounded-full md:rounded-lg font-sans text-[12.5px] md:text-[13px] font-medium px-[12px] md:px-[14px] py-[6px] md:py-[9px] cursor-pointer"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <option value="">Type ▾</option>
          {AVAILABLE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Set ▾ — the designed searchable multi-select panel (#86). Same tab
            stop, same position, same external geometry as the <select> it
            replaced; Type ▾ and Sort ▾ convert later. */}
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
          onClear={() => onFiltersChange({ ...filters, setCodes: [] })}
          onAnnounce={onAnnounce}
        />

        {/* Sort ▾ — mobile shows short labels ("A–Z ▾"), desktop shows "Sort: Name ▾" */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          aria-label="Sort cards"
          className="whitespace-nowrap rounded-full md:rounded-lg font-sans text-[12.5px] md:text-[13px] font-medium px-[12px] md:px-[14px] py-[6px] md:py-[9px] cursor-pointer"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <option value="name">{isDesktop ? "Sort: Name" : "A–Z ▾"}</option>
          <option value="quantity">{isDesktop ? "Sort: Quantity" : "Qty ▾"}</option>
          <option value="set">{isDesktop ? "Sort: Set" : "Set ▾"}</option>
          <option value="rarity">{isDesktop ? "Sort: Rarity" : "Rarity ▾"}</option>
          <option value="color">{isDesktop ? "Sort: Color" : "Color ▾"}</option>
        </select>

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
                    ? "bg-[var(--brass)] text-[var(--bg)]"
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
