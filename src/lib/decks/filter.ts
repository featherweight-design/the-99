// The Decks filter, as a value. The desktop column and the phone sheet are two
// renderings of this one object, so a filter that behaves differently in the
// sheet than in the column is not possible by construction.
//
// Three rulings the drawing does not make, settled here:
//   1. Colour identity matches by containment, not equality. Ticking R shows
//      mono-red and Mardu alike. Exactly-equals would turn five pips into five
//      questions with thirty-one answers, and "show me my red decks" — the only
//      question a player with nine decks asks — would be unanswerable.
//   2. `This month` is the current calendar month, not a rolling thirty days: a
//      window that silently drops a deck at midnight on the 31st is a figure
//      that changes while you look at it.
//   3. A pair deck's colour is the UNION of both commanders', matched through
//      `deckIdentity` — the same helper the tiles and both deck-header spines
//      word their colour with. Reading the primary's alone hid a deck from the
//      colour its own tile claimed, and the search reaches the partner's name
//      for the same reason: the tile prints it.
//   4. Within a heading, values OR; across headings, they AND. This is how every
//      filter the app already ships behaves, and neither surface offers a
//      control that could say otherwise.

import { deckIdentity } from "./format";
import { parseDeckSort, serializeDeckSort, type DeckSort } from "./sort";
import type { StatusPill } from "./status";

export type ColourCode = "W" | "U" | "B" | "R" | "G";
export type PlayedWindow = "thisMonth" | "never";
/**
 * A committed deck whose draft has moved since its version.
 *
 * ONE member, and the heading holds one row. `uncommitted` was retired with the
 * marks: ticking `New` and `Draft` in Status is that filter exactly, and a
 * facet duplicating two status rows is a control that can only disagree with
 * them. A stale `?state=uncommitted` is dropped by `readList` as an unknown
 * value, so nothing is owed a migration.
 */
export type DeckState = "pending";

/** Build order, and the order the column renders. Never re-sorted at the call site. */
export const STATUS_ORDER: readonly StatusPill[] = [
  "New",
  "Draft",
  "Over",
  "Building",
  "Unresolved",
  "To buy",
  "Complete",
];

/** One row, and the order is trivial — kept as a list so the facet reads like
    every other one here and a second member needs no new shape. */
export const STATE_ORDER: readonly DeckState[] = ["pending"];

/** WUBRG. The pips render in this order and nothing else. */
export const COLOUR_ORDER: readonly ColourCode[] = ["W", "U", "B", "R", "G"];

const PLAYED_WINDOWS: readonly PlayedWindow[] = ["thisMonth", "never"];

export type DeckFilters = {
  statuses: StatusPill[];
  states: DeckState[];
  colours: ColourCode[];
  played: PlayedWindow | null;
  search: string;
};

export const EMPTY_FILTERS: DeckFilters = {
  statuses: [],
  states: [],
  colours: [],
  played: null,
  search: "",
};

/** The subset of `DeckListItem` a filter reads. Field names are its field names. */
export type FilterableDeck = {
  name: string;
  commanderName: string;
  /** The name printed on the copy the player owns, where it differs. The tile draws THIS
      name, so a search that matched the oracle name alone would find nothing for the very
      string on screen. Both are matched: the oracle name is what a player who knows the
      card types, and the printed one is what they are reading. */
  commanderPrintedName?: string | null;
  commanderColorIdentity: string[];
  /** The partner's, where there is one. A pair deck's colour is the UNION of the
      two — which every surface words — so a filter reading the primary's alone
      hides a deck from the very colour its own tile claims. */
  partnerName: string | null;
  partnerColorIdentity: string[] | null;
  statusPill: StatusPill;
  /** Null when the deck has never committed a version — the plan. */
  lastCommittedAt: Date | null;
  /** Cards the draft has changed since that version; 0 on a plan. */
  pendingChanges: number;
  lastPlayedAt: Date | null;
};

/**
 * What the phone trigger badge shows. Values, not headings: two statuses and a
 * colour is three things switched on, which is what a reader counting the chips
 * above the grid would also say.
 */
export function activeFilterCount(f: DeckFilters): number {
  return (
    f.statuses.length
    + f.states.length
    + f.colours.length
    + (f.played ? 1 : 0)
    + (f.search.trim() ? 1 : 0)
  );
}

function inCurrentMonth(then: Date, now: Date): boolean {
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth();
}

export function filterDecks<T extends FilterableDeck>(
  decks: T[],
  f: DeckFilters,
  now: Date,
): T[] {
  const needle = f.search.trim().toLowerCase();
  return decks.filter((d) => {
    if (f.statuses.length && !f.statuses.includes(d.statusPill)) return false;
    if (f.states.length && !(d.lastCommittedAt !== null && d.pendingChanges > 0)) {
      return false;
    }
    // The UNION, through the same helper every surface words its colour with. A
    // pair whose red comes only from its partner reads `Jeskai` on its own tile
    // and used to vanish when Red was ticked.
    //
    // Composed INSIDE the guard: `/decks` calls this once for the grid and again
    // for every status and play option's count, so building a Set and two arrays
    // per deck on the common unfiltered render would be work for no result.
    if (f.colours.length) {
      const identity = deckIdentity(d.commanderColorIdentity, d.partnerColorIdentity);
      if (!f.colours.every((c) => identity.includes(c))) return false;
    }
    if (f.played === "never" && d.lastPlayedAt) return false;
    if (f.played === "thisMonth" && (!d.lastPlayedAt || !inCurrentMonth(d.lastPlayedAt, now))) {
      return false;
    }
    if (
      needle &&
      !d.name.toLowerCase().includes(needle) &&
      !d.commanderName.toLowerCase().includes(needle) &&
      !(d.commanderPrintedName ?? "").toLowerCase().includes(needle) &&
      !(d.partnerName ?? "").toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });
}

export function filtersToParams(f: DeckFilters, sort: DeckSort): URLSearchParams {
  const params = new URLSearchParams();
  if (f.statuses.length) params.set("status", f.statuses.join(","));
  if (f.states.length) params.set("state", f.states.join(","));
  if (f.colours.length) params.set("colour", f.colours.join(","));
  if (f.played) params.set("played", f.played);
  const search = f.search.trim();
  if (search) params.set("q", search);
  const serialised = serializeDeckSort(sort);
  if (serialised) params.set("sort", serialised);
  return params;
}

/**
 * Filters the canonical order by what was given, rather than mapping what was
 * given. That is what puts a hand-typed `colour=G,W` back in WUBRG order, and
 * what makes an unknown value harmless: a hand-edited URL cannot inject a
 * status the column has no row for.
 */
function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  order: readonly T[],
): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  const given = new Set(raw.split(","));
  return order.filter((value) => given.has(value));
}

export function filtersFromParams(params: URLSearchParams): {
  filters: DeckFilters;
  sort: DeckSort;
} {
  const played = params.get("played");
  return {
    filters: {
      statuses: readList(params, "status", STATUS_ORDER),
      states: readList(params, "state", STATE_ORDER),
      colours: readList(params, "colour", COLOUR_ORDER),
      played: PLAYED_WINDOWS.find((w) => w === played) ?? null,
      search: params.get("q")?.trim() ?? "",
    },
    sort: parseDeckSort(params.get("sort")),
  };
}
