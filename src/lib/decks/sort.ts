// The three deck orders. The handoff draws only the default (`Sort · last
// played`) and names no others; these three are the engineering call, and the
// gap report records them as one.

export type DeckSort = "lastPlayed" | "name" | "newest";

export const DEFAULT_DECK_SORT: DeckSort = "lastPlayed";

/** The word the `Sort · …` trigger prints. Lowercase, as drawn. */
export const DECK_SORT_LABELS: Record<DeckSort, string> = {
  lastPlayed: "last played",
  name: "name",
  newest: "newest",
};

/**
 * Both absences are accepted because this parameter arrives by two routes: the
 * Decks page reads it off `searchParams` and gets `undefined`, while the filter
 * control reads it off `URLSearchParams.get`, which returns `null`. Every other
 * URL-param parser here takes `string | null` for the second reason.
 *
 * Own-property lookup rather than a bare `in`: a raw of `"__proto__"` or
 * `"toString"` reaches the Object prototype and would otherwise be accepted as
 * a sort key.
 */
export function parseDeckSort(raw: string | null | undefined): DeckSort {
  return raw != null && Object.hasOwn(DECK_SORT_LABELS, raw)
    ? (raw as DeckSort)
    : DEFAULT_DECK_SORT;
}

/** The default serialises as an absence, so the clean URL is the clean state. */
export function serializeDeckSort(sort: DeckSort): string | undefined {
  return sort === DEFAULT_DECK_SORT ? undefined : sort;
}
