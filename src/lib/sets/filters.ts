// The set grid's filters and their URL parameters. Pure, so the filtering a reader sees and
// the count the buy button quotes are the same computation in the same place.

import type { Cell } from "./completion";
import { filterByColors, type JoinMode } from "../commanders/filter";

export const WUBRG = ["W", "U", "B", "R", "G"] as const;
// The four the rack offers, and no more. `special` was in this list while no control
// could select it and no copy named it, so a URL could carry a filter state no reader
// could reach or clear.
export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;

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
  missingOnly: boolean;
  /** The name search. A filter by any reading a player would give it, so it lives here. */
  query: string;
};

export const EMPTY_FILTERS: SetGridFilters = {
  colors: [], match: "contains", rarities: [], missingOnly: false, query: "",
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
    if (f.missingOnly && c.owned) return false;
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
  // With no pip lit it filters nothing (`filterByColors` leaves an empty selection alone) and
  // is kept anyway: the control greys it in place and remembers it, as the rack's does.
  if (f.match === "exactly") params.set("m", "exact");
  // `own=missing`, never `m=1` again. `m` was missing-only until H10 needed it for the
  // colour modifier, and one key cannot hold both `1` and `exact` at once — so a reader who
  // wanted the missing white-blue cards EXACTLY could not have been written down. `m=1` is
  // still READ as missing below, so an old link keeps working, and never written, so it
  // retires as links are rewritten. `own` rather than a second boolean key, because the
  // ownership control grows an Owned option next and that is one dimension with three
  // values, not two flags.
  if (f.missingOnly) params.set("own", "missing");
  // `q`, matching the index's own field. R2's decision 15 read literally bans a shared key
  // name with /collection, but the shipped surface already shares `c` for colour and no bug
  // came of it. The rule it was written about is that no VALUE carries and no one name means
  // two things: `q` means "what I typed" on all three routes, and the `By set` pill still
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
    match: params.get("m") === "exact" ? "exactly" : "contains",
    // Multi-select since H13, so the whole list is kept, in canonical order. A single value
    // — every link written while the control was single-select — is a list of one.
    rarities: RARITIES.filter((r) => rarities.includes(r)),
    // `own=missing` first; the LEGACY `m=1` is missing-only from before `m` meant the
    // colour modifier. The two cannot collide: `m` is `1` or `exact`, never both.
    missingOnly: params.get("own") === "missing" || params.get("m") === "1",
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
