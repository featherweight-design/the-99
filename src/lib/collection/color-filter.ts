// Color-filter option building — the pure half of the mobile Color ▾ panel (#116).
//
// Mirrors type-filter.ts. Desktop keeps the inline WUBRG pip row: it fits, and
// five pips read faster than a panel. Mobile had a <details> whose open list
// pushed the whole filter row down the page, so it becomes the same overlaid
// FilterPanel as Type and Set.

import { filterCards, type BrowseListCard, type BrowseFilters } from "./browse";

export const WUBRG = ["W", "U", "B", "R", "G"] as const;

/** Colorless is deliberately absent: the pip row has never offered it either. */
export const COLOR_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

/** One option row in the Color panel. `code` is the single WUBRG letter. */
export type ColorOption = {
  code: string;
  label: string;
  hint?: string;
  count: number;
  disabled: boolean;
};

/**
 * The five colors, each with the number of cards owned in that color identity
 * under the *other* filters — types and sets, not the search box and not the
 * color selection itself. Same rule as buildTypeOptions, so the two panels never
 * disagree about what a count means.
 *
 * A color with no matches stays listed and disabled: the vocabulary is fixed, so
 * removing one would make the list five, then three, then four rows tall.
 */
export function buildColorOptions(cards: BrowseListCard[], filters: BrowseFilters): ColorOption[] {
  const surviving = filterCards(cards, {
    search: "",
    colors: [],
    types: filters.types,
    setCodes: filters.setCodes,
    availability: filters.availability,
  });

  return WUBRG.map((code) => {
    let count = 0;
    for (const c of surviving) {
      if (c.colorIdentity.includes(code)) count += c.quantity;
    }
    return { code, label: COLOR_NAMES[code], hint: code, count, disabled: count === 0 };
  });
}
