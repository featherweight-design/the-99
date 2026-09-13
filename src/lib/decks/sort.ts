// The three deck orders. The handoff draws only the default (`Sort · last
// played`) and names no others; these three are the engineering call, and the
// gap report records them as one.

export type DeckSort = "lastPlayed" | "name" | "newest";

export const DEFAULT_DECK_SORT: DeckSort = "lastPlayed";

/**
 * The word the `Sort · …` trigger prints, and the menu row beside it.
 *
 * Sentence case, not the lowercase this shipped with: these are the only menu
 * options in the app that were not capitalised, and the row they sit in reads as
 * a list of choices rather than a sentence. Ruled by Hugh 2026-09-13. The trigger
 * takes the same string, so it now reads `Sort · Last played`.
 */
export const DECK_SORT_LABELS: Record<DeckSort, string> = {
  lastPlayed: "Last played",
  name: "Name",
  newest: "Newest",
};

/** The localStorage key `useStoredView` keeps the chosen order under. */
export const DECK_SORT_KEY = "the99:decks:sort";

/** A stored value that is no longer one of the orders is absence, not a crash. */
export function isDeckSort(value: string): value is DeckSort {
  return Object.hasOwn(DECK_SORT_LABELS, value);
}

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
  return deckSortFromParams(raw) ?? DEFAULT_DECK_SORT;
}

/**
 * The URL's order, or `null` when it names none.
 *
 * `parseDeckSort` collapses "the URL said nothing" into "the default", which is
 * the right answer for a caller that needs an order — and the wrong one for the
 * view, which has a third source between those two. The stored preference sits
 * UNDER the URL and OVER the default, exactly as `/collection`'s view choice
 * does, and only an absence tells them apart.
 */
export function deckSortFromParams(raw: string | null | undefined): DeckSort | null {
  // Own-property lookup rather than a bare `in`: a raw of `"__proto__"` or
  // `"toString"` reaches the Object prototype and would otherwise be accepted.
  return raw != null && Object.hasOwn(DECK_SORT_LABELS, raw) ? (raw as DeckSort) : null;
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
 * The clauses mirror `listDecksWithStats`'s `order` in `read.ts` exactly,
 * tiebreaks included:
 *
 *   - `lower(name)` rather than the bare name, because the ordering a player
 *     sees must not turn on collation.
 *   - The id is the tiebreak, not decoration: deck names are not unique.
 *   - `newest` breaks on id alone, and `lastPlayed` breaks on name then id,
 *     because that is what the SQL does.
 *   - Never played sorts last, which is what `nulls last` buys over there.
 *
 * Every string comparison is by code point, never `localeCompare`, which reads
 * the runtime's own locale: two players on the same list would otherwise see
 * two orders for the same names, and neither would be the one the server sent.
 * The whole point of this function is to land on the sequence a fresh load
 * would, so it cannot be the one comparison in the pair that varies.
 */
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sortDecks<T extends SortableDeck>(decks: T[], sort: DeckSort): T[] {
  const byName = (a: T, b: T) =>
    byCodePoint(a.name.toLowerCase(), b.name.toLowerCase()) || byCodePoint(a.id, b.id);

  const compare =
    sort === "name"
      ? byName
      : sort === "newest"
        ? (a: T, b: T) =>
            b.createdAt.getTime() - a.createdAt.getTime() || byCodePoint(a.id, b.id)
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
