// Type-filter option building — the pure half of the Type ▾ panel (#100).
//
// Mirrors set-filter.ts: the panel needs one option per card type with a count
// of the cards that survive the *other* active filters, and the counting is
// what wants unit tests, so it lives away from the component.

import { frontFace } from "../cards/facet";
import { AVAILABLE_TYPES, filterCards, type BrowseListCard, type BrowseFilters } from "./browse";

/** One option row in the Type ▾ panel. `code` is the type word itself. */
export type TypeOption = {
  code: string;
  label: string;
  count: number;
  disabled: boolean;
};

/**
 * Every card type, in the fixed order the design lists them, each with the
 * number of cards owned of that type under the other filters.
 *
 * The two judgment calls match set-filter.ts deliberately, so the two panels
 * never disagree about what a count means:
 *
 * 1. "Other filters" is colors and sets — not the free-text search box, and
 *    not the type selection itself, so the numbers stay still while typing and
 *    a selected type does not read as its own subset.
 * 2. A count is the sum of quantities owned, not the number of distinct oracle
 *    cards, because the design's totals read as card counts.
 *
 * Unlike sets, the option list is a fixed vocabulary rather than a function of
 * the collection, so a type with no matches is still listed — disabled, never
 * removed.
 */
export function buildTypeOptions(cards: BrowseListCard[], filters: BrowseFilters): TypeOption[] {
  const surviving = filterCards(cards, {
    search: "",
    colors: filters.colors,
    match: filters.match,
    types: [],
    setCodes: filters.setCodes,
    availability: filters.availability,
  });

  return AVAILABLE_TYPES.map((label) => {
    const needle = label.toLowerCase();
    let count = 0;
    for (const c of surviving) {
      if (frontFace(c.typeLine).toLowerCase().includes(needle)) count += c.quantity;
    }
    return { code: label, label, count, disabled: count === 0 };
  });
}

/**
 * `?t=Creature,Land` → `["Creature","Land"]`, matched case-insensitively against
 * the known vocabulary so a shared link cannot inject an unknown filter value.
 * A legacy single bare type (`?t=Creature`) parses as a one-element selection,
 * so links shared before the multi-select landed still work.
 */
export function parseTypesParam(param: string | null): string[] {
  if (!param) return [];
  const out: string[] = [];
  for (const raw of param.split(",")) {
    const match = AVAILABLE_TYPES.find((t) => t.toLowerCase() === raw.trim().toLowerCase());
    if (match && !out.includes(match)) out.push(match);
  }
  return out;
}

/** `["Creature","Land"]` → `Creature,Land`. Round-trips through parseTypesParam. */
export function serializeTypes(types: string[]): string {
  return types.join(",");
}
