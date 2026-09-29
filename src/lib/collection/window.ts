// `/collection`'s first window, found the same way on both sides (list payload plan, PR 4).
//
// The page ships the draw fields (`COLLECTION_DRAW_KEYS`) for the cards the URL's own first window
// draws, and the browser draws its first window by these same steps from the same URL, so a card
// the browser draws on arrival always arrived whole. Pure, and free of any client module, so the
// server page can import it.
import {
  filterCards,
  sortCards,
  type BrowseFilters,
  type BrowseListCard,
  type SortDirection,
  type SortKey,
} from "./browse";
import { SORT_KEYS, parseSortDirection } from "./sort-options";
import { parseColors } from "../color-param";
import { parseTypesParam } from "./type-filter";
import { parseSetCodesParam } from "./set-filter";
import { initialAvailability } from "./availability-filter";
import type { CollectionDrawKey } from "./list-wire";
import type { AvailabilitySummary } from "../decks/availability";

/** The cards a window draws before `Show more`, and what each press adds. */
export const PAGE_SIZE = 200;

export type BrowseParams = { filters: BrowseFilters; sort: SortKey; direction: SortDirection };

/**
 * The browse state a URL names. Shared URLs can carry unknown values, and each falls back to its
 * default, exactly as the browser's own first render does.
 */
export function parseBrowseParams(get: (key: string) => string | null, availabilityOk: boolean): BrowseParams {
  const raw = get("sort");
  const sort: SortKey = raw !== null && (SORT_KEYS as readonly string[]).includes(raw) ? (raw as SortKey) : "name";
  return {
    filters: {
      search: get("q") ?? "",
      colors: parseColors(get("c")),
      types: parseTypesParam(get("t")),
      setCodes: parseSetCodesParam(get("s")),
      availability: initialAvailability(availabilityOk, get("avail")),
    },
    sort,
    direction: parseSortDirection(get("dir"), sort),
  };
}

/** A card with or without its draw fields: none of the steps below reads one. */
type Listed = Omit<BrowseListCard, CollectionDrawKey>;

/** The oracle ids the URL's first window draws. */
export function firstWindowIds(cards: Listed[], params: BrowseParams): Set<string> {
  const shown = sortCards(filterCards(cards as BrowseListCard[], params.filters), params.sort, params.direction);
  return new Set(shown.slice(0, PAGE_SIZE).map((c) => c.oracleId));
}

/**
 * The page's cut: the first window of the list it cached, for the URL it was asked for. The cached
 * list carries no availability (the page reads it alongside, and the wire joins them), so the
 * window is found over the JOINED cards: `?avail=` filters on it, and a list read without it
 * would call every card free and cut a different window from the one the browser draws.
 */
export function pageWindowIds(
  cards: Listed[],
  availability: Map<string, AvailabilitySummary> | null,
  get: (key: string) => string | null,
): Set<string> {
  const joined = cards.map((c) => ({ ...c, availability: availability?.get(c.oracleId) ?? null }));
  return firstWindowIds(joined, parseBrowseParams(get, availability !== null));
}
