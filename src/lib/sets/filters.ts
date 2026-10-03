// The set grid's filters, its order, and their URL parameters. Pure, so the filtering a
// reader sees and the count the buy button quotes are the same computation in the same place.

import type { Cell } from "./completion";
import { filterByColors, type JoinMode } from "../commanders/filter";
import type { SortDirection } from "../collection/browse";

export const WUBRG = ["W", "U", "B", "R", "G"] as const;
// The four the rack offers, and no more. `special` was in this list while no control
// could select it and no copy named it, so a URL could carry a filter state no reader
// could reach or clear.
export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;

/**
 * Which cells ownership keeps. ONE field with three values rather than two booleans, because
 * the two filters are mutually exclusive (H12): `missing` and `owned` together match nothing,
 * and two booleans would make that empty state representable — in a URL, in a test, in a
 * chip line drawing two chips that cancel each other out.
 */
export type Ownership = "all" | "missing" | "owned";

/**
 * The set page's two orders (H16). `number` is collector order, the page's order before
 * there was a choice; `price` is the per-cell figure the cost strip sums.
 */
export type SetSort = "number" | "price";
export const SET_SORTS = ["number", "price"] as const satisfies readonly SetSort[];

/**
 * The direction each order opens in, `DEFAULT_SORT_DIRECTION`'s rule for `/collection`:
 * collector number reads forwards, and "sort by price" means dearest first to everyone —
 * the reader reaching for it is asking what the expensive cards are.
 */
export const DEFAULT_SET_SORT_DIRECTION: Record<SetSort, SortDirection> = {
  number: "asc",
  price: "desc",
};

export type SetGridFilters = {
  colors: string[];
  /**
   * How the colours match, the commander rack's modifier and its meanings (H10). `contains`
   * keeps a card whose identity holds EVERY lit colour; `exactly` keeps one whose identity
   * is the selection and nothing besides.
   */
  match: JoinMode;
  /** Multi-select since H13, as `/collection`'s Type is: `r=rare,mythic` is rare OR mythic. */
  rarities: string[];
  own: Ownership;
  /** The name search. A filter by any reading a player would give it, so it lives here. */
  query: string;
  /**
   * The order rides in the same state because it rides in the same URL, but it is NOT a
   * filter: it narrows nothing, no chip names it, no badge counts it, and `Clear all
   * filters` leaves it alone — the chassis's own exclusion, for the chassis's reason.
   */
  sort: SetSort;
  dir: SortDirection;
};

export const EMPTY_FILTERS: SetGridFilters = {
  colors: [], match: "contains", rarities: [], own: "all", query: "",
  sort: "number", dir: DEFAULT_SET_SORT_DIRECTION.number,
};

/**
 * Case-insensitive and diacritic-folded, so `aether` finds Æther and `jotun` finds Jötun.
 *
 * The ligature pass is NOT redundant with NFD. Normalisation decomposes a base letter from
 * its combining marks — `ö` becomes `o` plus a mark, which the `\p{Diacritic}` strip then
 * removes — but a ligature is a single character with no base letter to separate, so `Æ`
 * survives NFD untouched and the `aether` case would have failed silently.
 */
function fold(value: string): string {
  return value
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Substring on the printed name, matching EITHER HALF of a `//` name — a reader searching
 * for a back face is searching for a card they can see in the set.
 *
 * Deliberately not the type line, not oracle text and not the collector number: the control
 * is named for the name, and a field that quietly matched rules text would make the result
 * line's count unexplainable.
 */
export function matchesQuery(name: string, query: string): boolean {
  const needle = fold(query).trim();
  if (needle === "") return true;
  return name.split("//").some((half) => fold(half).includes(needle));
}

/**
 * Whether a query narrows anything — the ONE question every reader of this field asks, so
 * they cannot disagree about the answer.
 *
 * Folded, not trimmed: a query of nothing but combining marks (a pasted `\u0301`) survives
 * `trim` and folds to empty, so `matchesQuery` matched every card while serialisation, the
 * badge, the result line and the clear button all believed a filter was on — `q` in the URL
 * and a filtered count over an unfiltered grid.
 */
export function isQueryActive(query: string): boolean {
  return fold(query).trim() !== "";
}

/**
 * Colours match through the commander rack's own rule, `filterByColors`, called rather than
 * restated (H10, ruled 2026-10-02). This used to say the page deliberately had no join-mode
 * modifier and matched ANY lit colour — `c=W,U` kept every white card and every blue one —
 * which made this the one colour control in the app where lighting a second pip WIDENED the
 * grid. `contains` is now the default, as it is on `/commanders`: a card is kept when its
 * identity holds every lit colour, so `c=W,U` is the Azorius cards and a mono-white card is
 * not one. `exactly` keeps the identity that IS the selection. Both modes leave an empty
 * selection alone, and `filterByColors` never re-sorts, so collector order survives it.
 */
export function applyFilters(cells: Cell[], f: SetGridFilters): Cell[] {
  return filterByColors(cells, f.colors, f.match).filter((c) => {
    if (f.own === "missing" && c.owned) return false;
    if (f.own === "owned" && !c.owned) return false;
    if (!matchesQuery(c.name, f.query)) return false;
    if (f.rarities.length > 0) {
      const r = (c.rarity ?? "").toLowerCase();
      if (!f.rarities.includes(r)) return false;
    }
    return true;
  });
}

/** Defaults serialise as absences, so a bare URL is the unfiltered page. */
export function serialiseFilters(f: SetGridFilters): URLSearchParams {
  const params = new URLSearchParams();
  const colors = WUBRG.filter((c) => f.colors.includes(c));
  if (colors.length > 0) params.set("c", colors.join(","));
  const rarities = RARITIES.filter((r) => f.rarities.includes(r));
  if (rarities.length > 0) params.set("r", rarities.join(","));
  // `m=exact`, the commander lanes' key and value, written on the same condition
  // `serializeLaneParams` writes it, so one colour modifier is spelled one way across the app.
  // Only beside a lit pip. Exactly with nothing lit is a mode the reader cannot see (the
  // control greys its selector) that still decides which pips are offered, so the page never
  // holds it: the last pip off returns to Any, and a URL naming it alone is read as Any.
  if (f.match === "exactly" && colors.length > 0) params.set("m", "exact");
  // `own`, never `m` again. `m=1` was missing-only until H10 needed `m` for the colour
  // modifier; it is still READ as missing below, so an old link keeps working, and never
  // written, so it retires as links are rewritten.
  if (f.own !== "all") params.set("own", f.own);
  // `q`, matching the index's own field. R2's decision 15 read literally bans a shared key
  // name with /collection, but the shipped surface already shares `c` for colour and no bug
  // came of it. The rule it was written about is that no VALUE carries and no one name means
  // two things: `q` means "what I typed" on all three routes, and the place strip's Sets tab
  // carries nothing across.
  const query = f.query.trim();
  if (isQueryActive(query)) params.set("q", query);
  // `sort` and `dir`, `/collection`'s names for the same two things, and each written only
  // where it differs from its default — the default order is collector number, and a
  // direction is an absence while it is the one its order opens in.
  if (f.sort !== "number") params.set("sort", f.sort);
  if (f.dir !== DEFAULT_SET_SORT_DIRECTION[f.sort]) params.set("dir", f.dir);
  return params;
}

/** Unknown values are dropped rather than thrown on: a hand-edited URL still renders. */
export function parseFilters(params: URLSearchParams): SetGridFilters {
  const raw = params.get("q") ?? "";
  // Case-insensitive, because the comment above promises a hand-edited URL still renders
  // and `?r=Mythic` is exactly the kind of thing a person types. Colours are compared
  // upper, rarities lower, which is how each is written everywhere else.
  const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const colors = list("c").map((v) => v.toUpperCase());
  const rarities = list("r").map((v) => v.toLowerCase());
  const lit = WUBRG.filter((c) => colors.includes(c));
  const own = params.get("own");
  const sortRaw = params.get("sort");
  const sort: SetSort = SET_SORTS.find((s) => s === sortRaw) ?? "number";
  const dirRaw = params.get("dir");
  return {
    colors: lit,
    // Exactly only beside a recognized colour: `?m=exact`, or `?m=exact&c=Z`, is Any.
    match: params.get("m") === "exact" && lit.length > 0 ? "exactly" : "contains",
    // Multi-select since H13, so the whole list is kept, in canonical order. A single value
    // — every link written while the control was single-select — is a list of one.
    rarities: RARITIES.filter((r) => rarities.includes(r)),
    // `own` first; the LEGACY `m=1` is missing-only from before `m` meant the colour
    // modifier. The two cannot collide: `m` is `1` or `exact`, never both.
    own: own === "missing" || own === "owned" ? own : params.get("m") === "1" ? "missing" : "all",
    // Canonicalised on the way in, because `serialiseFilters` omits an inactive one on the
    // way out: untrimmed, `?q=%20` would sit in the field looking empty and in a shared URL
    // looking like a filter, until some other control happened to rewrite the string.
    //
    // `isQueryActive` rather than a bare trim, because trimming is not the whole test. A
    // hand-edited `?q=%CC%81` — a combining mark with no base letter — survives `trim` but
    // folds to nothing, so the grid was unfiltered while the field's × and the sheet's
    // Clear were both inert: a query in the URL with no visible way to clear it.
    query: isQueryActive(raw) ? raw.trim() : "",
    sort,
    dir: dirRaw === "asc" || dirRaw === "desc" ? dirRaw : DEFAULT_SET_SORT_DIRECTION[sort],
  };
}

/**
 * Picking an order, `/collection`'s rule (`nextSortState`): a different order switches to it
 * in its own opening direction, and picking the order already chosen reverses it. That is
 * the only direction control, as it is on every other sorted surface here.
 */
export function nextSetSort(
  current: { sort: SetSort; dir: SortDirection },
  picked: SetSort,
): { sort: SetSort; dir: SortDirection } {
  if (picked !== current.sort) return { sort: picked, dir: DEFAULT_SET_SORT_DIRECTION[picked] };
  return { sort: picked, dir: current.dir === "asc" ? "desc" : "asc" };
}

/**
 * One section in the chosen order. `cells` arrives in collector order (`sectionsOf` builds
 * it so), which is why `number` needs no comparator of its own.
 *
 * `price` reads `centsOf`, the cost strip's own per-cell figure, and a cell with NO figure —
 * never stocked, sold out, or owned with no row in the price read — goes LAST in both
 * directions. Reversing a list that put them first would bury the priced cards the reader
 * sorted to see under a run of cells with nothing to compare. Ties, and the unpriced run
 * itself, keep collector order: `Array.prototype.sort` is stable, and the comparator never
 * reverses an equal pair.
 */
export function sortCells(
  cells: Cell[],
  sort: SetSort,
  dir: SortDirection,
  centsOf: (cell: Cell) => number | null,
): Cell[] {
  if (sort === "number") return dir === "asc" ? cells : [...cells].reverse();
  const sign = dir === "asc" ? 1 : -1;
  const figure = new Map(cells.map((c) => [c, centsOf(c)] as const));
  return [...cells].sort((a, b) => {
    const pa = figure.get(a) ?? null;
    const pb = figure.get(b) ?? null;
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return sign * (pa - pb);
  });
}
