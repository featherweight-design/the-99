// The set grid's three filters and their URL parameters. Pure, so the filtering a reader
// sees and the count the buy button quotes are the same computation in the same place.

import type { Cell } from "./completion";

export const WUBRG = ["W", "U", "B", "R", "G"] as const;
// The four the rack offers, and no more. `special` was in this list while no control
// could select it and no copy named it, so a URL could carry a filter state no reader
// could reach or clear.
export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;

export type SetGridFilters = {
  colors: string[];
  rarities: string[];
  missingOnly: boolean;
  /** The name search. A filter by any reading a player would give it, so it lives here. */
  query: string;
};

export const EMPTY_FILTERS: SetGridFilters = {
  colors: [], rarities: [], missingOnly: false, query: "",
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
 * Colours are always "any", and there is deliberately no join-mode modifier on this page.
 * A card has one colour identity in a set list, so *exactly* has nothing to modify —
 * passing a disabled modifier through would be a control that can never do anything.
 */
export function applyFilters(cells: Cell[], f: SetGridFilters): Cell[] {
  return cells.filter((c) => {
    if (f.missingOnly && c.owned) return false;
    if (!matchesQuery(c.name, f.query)) return false;
    if (f.colors.length > 0 && !f.colors.some((col) => c.colorIdentity.includes(col))) {
      return false;
    }
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
  if (f.missingOnly) params.set("m", "1");
  // `q`, matching the index's own field. R2's decision 15 read literally bans a shared key
  // name with /collection, but the shipped surface already shares `c` for colour and no bug
  // came of it. The rule it was written about is that no VALUE carries and no one name means
  // two things: `q` means "what I typed" on all three routes, and the place strip's Sets tab
  // carries nothing across.
  const query = f.query.trim();
  if (isQueryActive(query)) params.set("q", query);
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
  return {
    colors: WUBRG.filter((c) => colors.includes(c)),
    // Single-select, so `?r=common,mythic` canonicalises to the first recognised one
    // rather than producing a state the control can neither show nor serialise back.
    rarities: RARITIES.filter((r) => rarities.includes(r)).slice(0, 1),
    missingOnly: params.get("m") === "1",
    // Canonicalised on the way in, because `serialiseFilters` omits an inactive one on the
    // way out: untrimmed, `?q=%20` would sit in the field looking empty and in a shared URL
    // looking like a filter, until some other control happened to rewrite the string.
    //
    // `isQueryActive` rather than a bare trim, because trimming is not the whole test. A
    // hand-edited `?q=%CC%81` — a combining mark with no base letter — survives `trim` but
    // folds to nothing, so the grid was unfiltered while the field's × and the sheet's
    // Clear were both inert: a query in the URL with no visible way to clear it.
    query: isQueryActive(raw) ? raw.trim() : "",
  };
}
