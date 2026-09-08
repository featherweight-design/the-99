"use client";

// The desktop filter column. It owns no state: it takes a `DeckFilters` and
// hands back a whole new one, which is what makes it and the phone sheet
// incapable of disagreeing. Neither file reads or writes a URL — the view does.
//
// There is no Apply. Ticking a filter re-filters immediately and Clear is the
// only commitment control (README §5, READINESS "Live filtering — Closed").

import { WUBRG_COLOR } from "../../lib/collection/browse";
import { colorNames } from "../../lib/copy/color-labels";
import { refreshCopy } from "../../lib/copy/refresh";
import {
  COLOUR_ORDER,
  EMPTY_FILTERS,
  STATUS_ORDER,
  type ColourCode,
  type DeckFilters,
  type PlayedWindow,
} from "../../lib/decks/filter";
import type { DeckSort } from "../../lib/decks/sort";
import { STATUS_TOKEN } from "../../lib/decks/status-style";
import type { StatusPill } from "../../lib/decks/status";
import { SearchIcon } from "./search-icon";

export type FilterChromeProps = {
  filters: DeckFilters;
  onChange: (next: DeckFilters) => void;
  sort: DeckSort;
  onSortChange: (next: DeckSort) => void;
  shown: number;
  total: number;
};

/**
 * Adds or removes one value and returns the result in the canonical order, not
 * in click order, so the same set of ticks always serialises to the same URL.
 */
export function toggleIn<T extends string>(
  order: readonly T[],
  current: T[],
  value: T,
): T[] {
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return order.filter((v) => next.includes(v));
}

/** The pill vocabulary, keyed off the copy file rather than the union member. */
export const STATUS_COPY_KEY: Record<StatusPill, keyof typeof refreshCopy.status> = {
  Draft: "draft",
  Building: "building",
  Over: "over",
  Unresolved: "unresolved",
  "To buy": "toBuy",
  Complete: "complete",
};

export const PLAYED_LABEL: Record<PlayedWindow, string> = {
  thisMonth: refreshCopy.filters.lastPlayedThisMonth,
  never: refreshCopy.filters.lastPlayedNever,
};

const HEADING =
  "m-0 px-[16px] pb-[7px] font-mono text-[10px] tracking-[0.14em] uppercase text-[color:var(--fg-faint)]";

/**
 * A 32px row that is on or off. The status token rides in on a custom property
 * rather than an inline `borderLeftColor`, because an inline colour on a button
 * outranks any `hover:` utility beside it — the same trap the repo's lint rule
 * guards.
 */
function FilterRow({
  label,
  on,
  token,
  onToggle,
}: {
  label: string;
  on: boolean;
  /** Absent for a Last-played row: the 3px keyline is a status idea only. */
  token?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      // The 3px slot is held open when the row is off, so ticking a row moves
      // no text.
      style={token ? ({ "--keyline": `var(${token})` } as React.CSSProperties) : undefined}
      className={`flex h-[32px] w-full cursor-pointer items-center gap-[10px] border-y-0 border-r-0 border-l-[3px] border-solid px-[16px] text-left font-sans text-[13px] transition-colors ${
        on
          ? "border-l-[color:var(--keyline)] bg-[color:var(--surface)] text-[color:var(--fg)]"
          : "border-l-transparent bg-transparent text-[color:var(--fg-body)] hover:bg-[color:var(--surface)]"
      }`}
    >
      {label}
    </button>
  );
}

/** 28px on desktop, 44px in the sheet — the phone touch-target floor. */
export function ColourSwatch({
  code,
  on,
  size,
  onToggle,
}: {
  code: ColourCode;
  on: boolean;
  size: "column" | "sheet";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      // `colorNames` is the exported reader over the copy module's private
      // MONO_NAMES and already returns White / Blue / Black / Red / Green.
      aria-label={colorNames([code])[0]}
      onClick={onToggle}
      style={{ "--swatch": WUBRG_COLOR[code] } as React.CSSProperties}
      className={`cursor-pointer border border-solid bg-[color:var(--swatch)] ${
        size === "column" ? "h-[28px] w-[28px] rounded-[7px]" : "h-[44px] w-[44px] rounded-[11px]"
      } ${on ? "border-[color:var(--fg)]" : "border-[color:var(--border-strong)]"}`}
    />
  );
}

export function DeckFilterColumn({ filters, onChange }: FilterChromeProps) {
  const c = refreshCopy.filters;

  return (
    <div className="hidden w-[262px] flex-none flex-col border-0 border-r border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] sm:flex">
      <div className="border-0 border-b border-solid border-[color:var(--border)] px-[16px] pt-[14px] pb-[12px]">
        <SearchField
          value={filters.search}
          onChange={(search) => onChange({ ...filters, search })}
          size="column"
        />
      </div>

      <div className="min-h-0 flex-auto overflow-y-auto">
        <h2 className={`${HEADING} pt-[13px]`}>{c.statusHeading}</h2>
        {STATUS_ORDER.map((status) => (
          <FilterRow
            key={status}
            label={refreshCopy.status[STATUS_COPY_KEY[status]]}
            on={filters.statuses.includes(status)}
            token={STATUS_TOKEN[status]}
            onToggle={() =>
              onChange({ ...filters, statuses: toggleIn(STATUS_ORDER, filters.statuses, status) })
            }
          />
        ))}

        <h2
          className={`${HEADING} mt-[12px] border-0 border-t border-solid border-[color:var(--border)] pt-[14px]`}
        >
          {c.colourHeading}
        </h2>
        <div className="flex gap-[6px] px-[16px]">
          {COLOUR_ORDER.map((code) => (
            <ColourSwatch
              key={code}
              code={code}
              size="column"
              on={filters.colours.includes(code)}
              onToggle={() =>
                onChange({ ...filters, colours: toggleIn(COLOUR_ORDER, filters.colours, code) })
              }
            />
          ))}
        </div>

        <h2
          className={`${HEADING} mt-[14px] border-0 border-t border-solid border-[color:var(--border)] pt-[14px]`}
        >
          {c.lastPlayedHeading}
        </h2>
        {(["thisMonth", "never"] as const).map((window) => (
          <FilterRow
            key={window}
            label={PLAYED_LABEL[window]}
            on={filters.played === window}
            // Single-select: clicking the one that is on turns it off. There is
            // no third row to mean "either", because no filter is already that.
            onToggle={() =>
              onChange({ ...filters, played: filters.played === window ? null : window })
            }
          />
        ))}
      </div>

      <div className="flex items-center gap-[10px] border-0 border-t border-solid border-[color:var(--border)] px-[16px] py-[12px]">
        {/* Statuses only, exactly as the copy string reads. The chip row above
            the grid is where the other headings report themselves. */}
        {/* Ticking all six says the same thing as ticking none, so both read
            `all statuses on` — the count would otherwise claim a narrowing the
            grid has not made. */}
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {filters.statuses.length === 0 || filters.statuses.length === STATUS_ORDER.length
            ? c.allOn
            : c.someOn(filters.statuses.length)}
        </span>
        <button
          type="button"
          // Never the sort: Clear is a filter control, and a reader who set an
          // order did not ask for it back.
          onClick={() => onChange(EMPTY_FILTERS)}
          className="ml-auto flex h-[32px] cursor-pointer items-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[13px] text-[12.5px] text-[color:var(--fg)]"
        >
          {c.clear}
        </button>
      </div>
    </div>
  );
}

/** Shared by both surfaces; only the box geometry differs. */
export function SearchField({
  value,
  onChange,
  size,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  size: "column" | "sheet";
  autoFocus?: boolean;
}) {
  const column = size === "column";
  return (
    <label
      // The field carries --fg-faint so the magnifier's `currentColor` lands
      // there; the input overrides it, because typed text is not a hint.
      className={`flex items-center gap-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] text-[color:var(--fg-faint)] ${
        column ? "h-[34px] rounded-[8px] px-[11px]" : "h-[44px] rounded-[10px] px-[12px]"
      }`}
    >
      <SearchIcon size={column ? 14 : 16} />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={refreshCopy.filters.searchPlaceholder}
        aria-label={refreshCopy.filters.searchPlaceholder}
        className={`min-w-0 flex-1 border-none bg-transparent text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-faint)] [&::-webkit-search-cancel-button]:appearance-none ${
          column ? "text-[12.5px]" : "text-[13.5px]"
        }`}
      />
    </label>
  );
}
