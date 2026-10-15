// Sort ▾ option building — the pure half of the Sort panel (#119).
//
// Sort became a FilterPanel in single-select mode so it matches Type ▾ and
// Set ▾, and gained a direction at the same time. FilterPanel has no concept of
// direction: it reports "this row was picked" and the rules for what that means
// live here, which is what makes them testable without rendering a panel.

import { DEFAULT_SORT_DIRECTION, type SortDirection, type SortKey } from "./browse";
import { collectionPriceCopy } from "../copy/collection-price";
import { collectionAddedCopy } from "../copy/collection-added";

/**
 * Structurally what FilterPanel renders, declared here rather than imported from
 * the component: set-filter and color-filter each own their option type too, and
 * src/lib stays free of UI imports.
 */
export type SortOption = {
  code: string;
  label: string;
  hint?: string;
  count: number;
  disabled: boolean;
};

export const SORT_KEYS = ["name", "quantity", "set", "rarity", "color", "price", "added"] as const satisfies readonly SortKey[];

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  quantity: "Quantity",
  set: "Set",
  rarity: "Rarity",
  color: "Color",
  price: collectionPriceCopy.sortLabel,
  added: collectionAddedCopy.sortLabel,
};

/**
 * How each key's two directions read. "A–Z" says more than "ascending" for a
 * name and nothing at all for a rarity, so every key gets its own pair.
 */
const DIRECTION_LABELS: Record<SortKey, Record<SortDirection, string>> = {
  name: { asc: "A–Z", desc: "Z–A" },
  quantity: { asc: "Fewest", desc: "Most" },
  set: { asc: "A–Z", desc: "Z–A" },
  rarity: { asc: "Common first", desc: "Mythic first" },
  color: { asc: "WUBRG", desc: "Colorless first" },
  price: collectionPriceCopy.direction,
  added: collectionAddedCopy.direction,
};

export function sortDirectionLabel(sort: SortKey, direction: SortDirection): string {
  return DIRECTION_LABELS[sort][direction];
}

/** "Name · A–Z" — the trigger and the chosen row both read as the whole order. */
export function sortOrderLabel(sort: SortKey, direction: SortDirection): string {
  return `${SORT_LABELS[sort]} · ${sortDirectionLabel(sort, direction)}`;
}

/**
 * The panel's rows. Only the chosen row carries a direction hint: an unchosen
 * row has no direction yet — picking it adopts that key's default — so labelling
 * one would be a promise about a state the click does not produce.
 */
export function buildSortOptions(sort: SortKey, direction: SortDirection): SortOption[] {
  return SORT_KEYS.map((key) => ({
    code: key,
    label: SORT_LABELS[key],
    hint: key === sort ? sortDirectionLabel(key, direction) : undefined,
    count: 0,
    disabled: false,
  }));
}

/**
 * Picking a row: a different key switches to it in its natural direction;
 * picking the key already chosen reverses it. That reversal is the only
 * direction control — a separate asc/desc toggle would sit in the filter row
 * doing nothing four times out of five.
 */
export function nextSortState(
  current: { sort: SortKey; direction: SortDirection },
  picked: SortKey,
): { sort: SortKey; direction: SortDirection } {
  if (picked !== current.sort) return { sort: picked, direction: DEFAULT_SORT_DIRECTION[picked] };
  return { sort: picked, direction: current.direction === "asc" ? "desc" : "asc" };
}

/** `?dir=desc` → `"desc"`. Anything else, including absent, is the key's default. */
export function parseSortDirection(param: string | null, sort: SortKey): SortDirection {
  if (param === "asc" || param === "desc") return param;
  return DEFAULT_SORT_DIRECTION[sort];
}
