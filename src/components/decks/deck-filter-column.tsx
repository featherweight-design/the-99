"use client";

// The desktop filter column. It owns no state: it takes a `DeckFilters` and
// hands back a whole new one, which is what makes it and the phone sheet
// incapable of disagreeing. Neither file reads or writes a URL — the view does.
//
// There is no Apply. Ticking a filter re-filters immediately and Clear is the
// only commitment control (README §5, READINESS "Live filtering — Closed").

import { refreshCopy } from "../../lib/copy/refresh";
import {
  type DeckFilters,
  type DeckState,
  type PlayedWindow,
} from "../../lib/decks/filter";
import { deckStateMarksCopy } from "../../lib/copy/deck-state-marks";
import type { DeckSort } from "../../lib/decks/sort";
import type { StatusPill } from "../../lib/decks/status";
import { SearchIcon } from "./search-icon";
import { AFFIX_FOCUS, AFFIX_INPUT } from "../ui/text-field";

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
  New: "new",
  Draft: "draft",
  Building: "building",
  Over: "over",
  Unresolved: "unresolved",
  "To buy": "toBuy",
  Complete: "complete",
};

/** The deck-state rows, keyed off the copy file like every label here. */
export const STATE_LABEL: Record<DeckState, string> = {
  pending: deckStateMarksCopy.filter.hasPending,
};

export const PLAYED_LABEL: Record<PlayedWindow, string> = {
  thisMonth: refreshCopy.filters.lastPlayedThisMonth,
  never: refreshCopy.filters.lastPlayedNever,
};

export function SearchField({
  value,
  onChange,
  size,
  autoFocus,
  placeholder = refreshCopy.filters.searchPlaceholder,
}: {
  value: string;
  onChange: (next: string) => void;
  size: "column" | "sheet";
  autoFocus?: boolean;
  /** What the field searches, when it is not a deck list's. */
  placeholder?: string;
}) {
  const column = size === "column";
  return (
    <label
      // The field carries --fg-faint so the magnifier's `currentColor` lands
      // there; the input overrides it, because typed text is not a hint.
      className={`flex items-center gap-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] text-[color:var(--fg-faint)] ${AFFIX_FOCUS} ${
        column ? "h-[34px] rounded-[8px] px-[11px]" : "h-[44px] rounded-[10px] px-[12px]"
      }`}
    >
      <SearchIcon size={column ? 14 : 16} />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`min-w-0 flex-1 ${AFFIX_INPUT} text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] [&::-webkit-search-cancel-button]:appearance-none ${
          column ? "text-[12.5px]" : "text-[16px]"
        }`}
      />
    </label>
  );
}
