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

/** Render order for the phone sheet's sort chips. Default first. */
export const DECK_SORT_ORDER: readonly DeckSort[] = ["lastPlayed", "name", "newest"];

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

/** The subset of `DeckListItem` an order reads. Field names are its field names. */
export type SortableDeck = {
  id: string;
  name: string;
  createdAt: Date;
  lastPlayedAt: Date | null;
};

/**
 * The client-side twin of `listDecksWithStats`'s ORDER BY, so re-sorting in the
 * browser needs no request and lands on the same sequence a fresh load would.
 * The clauses mirror `read.ts:305-318` exactly, tiebreaks included:
 *
 *   - `lower(name)` rather than the bare name, because the ordering a player
 *     sees must not turn on collation.
 *   - The id is the tiebreak, not decoration: deck names are not unique.
 *   - `newest` breaks on id alone, and `lastPlayed` breaks on name then id,
 *     because that is what the SQL does.
 *   - Never played sorts last, which is what `nulls last` buys over there.
 */
export function sortDecks<T extends SortableDeck>(decks: T[], sort: DeckSort): T[] {
  const byName = (a: T, b: T) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id);

  const compare =
    sort === "name"
      ? byName
      : sort === "newest"
        ? (a: T, b: T) =>
            b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id)
        : (a: T, b: T) => {
            const at = a.lastPlayedAt?.getTime();
            const bt = b.lastPlayedAt?.getTime();
            if (at == null || bt == null) {
              if (at === bt) return byName(a, b);
              return at == null ? 1 : -1;
            }
            return bt - at || byName(a, b);
          };

  return [...decks].sort(compare);
}
