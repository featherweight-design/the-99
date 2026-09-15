// The deck list's remembered orders — one per lane, one key for every deck.
//
// ONE KEY FOR EVERY DECK, like the list/card well beside it: "I read decks as
// cards" is a fact about the reader, and so is "I read a shopping list dearest
// first". `the99:deck-view` already works this way and the trigger now sits in
// that same cluster.
//
// BOTH LANES IN ONE VALUE, because the state is one sort per filter (brief
// §2.6): `All` falls back to its own default while `Shopping` keeps `Price`,
// and a single stored order could not restore the second on the way back.
//
// NOT THE URL. `/collection` mirrors its sort to the URL because a filtered
// collection view is a thing people link to; a deck's own list is reached
// through the deck, and a shared deck link carrying someone else's row order is
// noise in the link.

import {
  DECK_DEFAULT_SORT_DIRECTION,
  DECK_SORT_KEYS_BY_FILTER,
  type DeckSortDirection,
  type DeckSortKey,
} from "../copy/deck-sort";

export type DeckSortState = { key: DeckSortKey; direction: DeckSortDirection };
export type DeckSortMemory = Record<"all" | "shopping", DeckSortState>;

/** The key `useStoredView` keeps this under. */
export const DECK_SORT_STORAGE_KEY = "the99:deck-sort";

export const DEFAULT_DECK_SORT: DeckSortMemory = {
  all: { key: "name", direction: "asc" },
  shopping: { key: "price", direction: "desc" },
};

const DIRECTIONS: readonly DeckSortDirection[] = ["asc", "desc"];

/**
 * `all:name:asc|shopping:price:desc`.
 *
 * A single string because `useStoredView` is `<T extends string>` — the store
 * it wraps holds strings, and a JSON blob there would need its own parse anyway.
 * This shape is greppable in devtools, which a blob is not.
 */
export function serialiseDeckSort(memory: DeckSortMemory): string {
  return (["all", "shopping"] as const)
    .map((lane) => `${lane}:${memory[lane].key}:${memory[lane].direction}`)
    .join("|");
}

/**
 * Anything unreadable falls back to that lane's default rather than throwing.
 *
 * A key the lane does not offer is refused as well as one that does not exist —
 * `price` is not a question on `All`, so a stored `all:price:desc` (from a
 * hand-edited value, or a build that offered it) resolves to `All`'s default
 * rather than selecting a row the panel does not draw.
 *
 * `isStoredDeckSort` then rejects any raw string this does not reproduce
 * exactly, so the hook treats a partly-damaged value as absence — which is the
 * same outcome, arrived at one step earlier.
 */
export function parseDeckSort(raw: string | null): DeckSortMemory {
  if (raw === null) return DEFAULT_DECK_SORT;
  const parsed: DeckSortMemory = { ...DEFAULT_DECK_SORT };
  for (const part of raw.split("|")) {
    const [lane, key, direction] = part.split(":");
    if (lane !== "all" && lane !== "shopping") continue;
    if (!isSortKey(key) || !DECK_SORT_KEYS_BY_FILTER[lane].includes(key)) continue;
    if (!isDirection(direction)) continue;
    parsed[lane] = { key, direction };
  }
  return parsed;
}

/**
 * `useStoredView` takes a type guard over the raw string, and this one is a
 * round trip: a value is valid exactly when parsing and re-serialising it
 * returns what was stored. Anything else — a renamed key, a lane that no longer
 * exists, a truncated write — reads as absence, and the caller's defaults stand.
 */
export function isStoredDeckSort(value: string): value is string {
  return serialiseDeckSort(parseDeckSort(value)) === value;
}

function isSortKey(value: string | undefined): value is DeckSortKey {
  return value === "name" || value === "price" || value === "mana";
}

function isDirection(value: string | undefined): value is DeckSortDirection {
  return DIRECTIONS.includes(value as DeckSortDirection);
}

/** The default a lane adopts when nothing is stored for it. */
export function defaultFor(lane: "all" | "shopping"): DeckSortState {
  const key = DEFAULT_DECK_SORT[lane].key;
  return { key, direction: DECK_DEFAULT_SORT_DIRECTION[key] };
}
