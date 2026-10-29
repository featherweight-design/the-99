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
import { SearchField } from "../ui/text-field";
import { SearchIcon } from "../ui/search-icon";

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

export function DeckSearchField({
  value,
  onChange,
  size,
  autoFocus,
  placeholder = refreshCopy.filters.searchPlaceholder,
  label,
  active = false,
  narrow = false,
}: {
  value: string;
  onChange: (next: string) => void;
  size: "column" | "sheet";
  autoFocus?: boolean;
  /** What the field searches, when it is not a deck list's. */
  placeholder?: string;
  /** The field's accessible name when it differs from the placeholder (the cart's compact `Search`, addendum R3 §2.3). */
  label?: string;
  /** A search is on: the field takes the accent edge (the cart's `.fld.on`). */
  active?: boolean;
  /**
   * The cart's compact field (addendum R3 §2.2, the board's `.sf`): 11px in, a 15px magnifier 8px from the text, and the
   * ✕ taking no space while there is nothing to clear, so `Search` fits beside a badged Filters pill at 320px. The text
   * stays 16px (the board draws 14px), since iOS Safari zooms into an input under 16px.
   */
  narrow?: boolean;
}) {
  const column = size === "column";
  return (
    <SearchField
      type="search"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onClear={() => onChange("")}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      containerClassName={`${column ? "h-[34px] gap-[9px] rounded-[8px] px-[11px] py-0" : narrow ? "h-[44px] gap-[8px] rounded-[10px] px-[11px] py-0" : "h-[44px] gap-[9px] rounded-[10px] px-[12px] py-0"}${active ? " border-[color:var(--accent)]" : ""}`}
      leading={narrow ? <SearchIcon size={15} className="shrink-0 text-[color:var(--fg-faint)]" /> : undefined}
      // Narrow: the empty field's ✕ is out of the row, not held hidden, so its 24px and gap go to the text.
      clearClassName={narrow && value === "" ? "hidden" : undefined}
      className={column ? "text-[12.5px]" : "text-[16px]"}
    />
  );
}
