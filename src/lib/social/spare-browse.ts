// A friend's Spares tab, searched and filtered (handoff `design_handoff_the99_spares_search`). The pure half: the
// query's shape, the filter, the option counts the panels draw, the three orders and the address-bar round trip.
//
// A line is one CARD (the friend's spare of it), so every count here is cards, never copies: the result line says
// `3 of 25 spares` and a tile says how many copies it holds. Search is the Collection's own `matchesSearch`, so a
// name or a type word finds a card the same way on both surfaces.

import { frontFace } from "../cards/facet";
import { AVAILABLE_TYPES, matchesSearch } from "../collection/browse";
import { COLOR_NAMES, WUBRG } from "../collection/color-filter";
import { matchesColors, type JoinMode } from "../commanders/filter";
import type { FriendSpareLine } from "./spares";

/** A spare as the tab filters it: the loader's line, plus how many of the reader's decks still need the card. */
export type SpareBrowseLine = FriendSpareLine & { deckNeed: number };

export type SpareWanted = "wishlist" | "deck";
export const SPARE_WANTED: readonly SpareWanted[] = ["wishlist", "deck"];
export type SpareSort = "wanted" | "name" | "most";
export const SPARE_SORTS: readonly SpareSort[] = ["wanted", "name", "most"];

export type SpareFilters = {
  /** Trimmed or not; `filterSpares` trims and lowercases. */
  search: string;
  /** Uppercase WUBRG letters, the Collection's own case. */
  colors: string[];
  match: JoinMode;
  /** OR inside the dimension, AND with the rest: a card of ANY chosen type. */
  types: string[];
  /** OR inside the dimension: on the reader's wishlist, or needed by one of their decks. */
  wanted: SpareWanted[];
};

export const NO_SPARE_FILTERS: SpareFilters = { search: "", colors: [], match: "contains", types: [], wanted: [] };

/** Joins the loader's lines to the deck-need read: a card no deck needs is 0, and so is a read that failed. */
export function withDeckNeed(lines: readonly FriendSpareLine[], need: Readonly<Record<string, number>>): SpareBrowseLine[] {
  return lines.map((l) => ({ ...l, deckNeed: need[l.oracleId] ?? 0 }));
}

/** True when any dimension (search included) narrows the list. */
export function hasSpareFilters(f: SpareFilters): boolean {
  return f.search.trim() !== "" || f.colors.length > 0 || f.types.length > 0 || f.wanted.length > 0;
}

/** Dimensions with something on, never values and never search: the compact `Filters` badge counts these. */
export function activeSpareDimensions(f: SpareFilters): number {
  return (f.colors.length > 0 ? 1 : 0) + (f.types.length > 0 ? 1 : 0) + (f.wanted.length > 0 ? 1 : 0);
}

const isWanted = (l: SpareBrowseLine, w: SpareWanted) => (w === "wishlist" ? l.onWishlist : l.deckNeed > 0);

/**
 * Every dimension but the ones named in `skip`, so an option's count can leave out its own dimension (a selected type
 * must not read as its own subset) and the search box (the numbers stay still while typing).
 */
function filterLines(lines: readonly SpareBrowseLine[], f: SpareFilters, skip: ReadonlySet<"search" | "colors" | "types" | "wanted">) {
  const search = skip.has("search") ? "" : f.search.trim().toLowerCase();
  const types = skip.has("types") ? [] : f.types.map((t) => t.toLowerCase());
  const colors = skip.has("colors") ? [] : f.colors;
  const wanted = skip.has("wanted") ? [] : f.wanted;
  return lines.filter((l) => {
    if (search && !matchesSearch({ name: l.name, printedName: null, typeLine: l.typeLine }, search)) return false;
    if (!matchesColors(l.colorIdentity, colors, f.match)) return false;
    if (types.length > 0) {
      const line = frontFace(l.typeLine).toLowerCase();
      if (!types.some((t) => line.includes(t))) return false;
    }
    if (wanted.length > 0 && !wanted.some((w) => isWanted(l, w))) return false;
    return true;
  });
}

export function filterSpares(lines: readonly SpareBrowseLine[], f: SpareFilters): SpareBrowseLine[] {
  return filterLines(lines, f, new Set());
}

export type SpareOption = { code: string; label: string; count: number; disabled: boolean; hint?: string };

/** The whole type vocabulary in the Collection's order, each with the cards of that type under the other filters. */
export function buildSpareTypeOptions(lines: readonly SpareBrowseLine[], f: SpareFilters): SpareOption[] {
  const surviving = filterLines(lines, f, new Set(["search", "types"]));
  return AVAILABLE_TYPES.map((label) => {
    const needle = label.toLowerCase();
    const count = surviving.filter((l) => frontFace(l.typeLine).toLowerCase().includes(needle)).length;
    return { code: label, label, count, disabled: count === 0 };
  });
}

export function buildSpareColorOptions(lines: readonly SpareBrowseLine[], f: SpareFilters): SpareOption[] {
  const surviving = filterLines(lines, f, new Set(["search", "colors"]));
  return WUBRG.map((code) => {
    const count = surviving.filter((l) => l.colorIdentity.includes(code)).length;
    return { code, label: COLOR_NAMES[code], hint: code, count, disabled: count === 0 };
  });
}

export function buildWantedOptions(
  lines: readonly SpareBrowseLine[],
  f: SpareFilters,
  labels: Record<SpareWanted, string>,
): SpareOption[] {
  const surviving = filterLines(lines, f, new Set(["search", "wanted"]));
  return SPARE_WANTED.map((code) => {
    const count = surviving.filter((l) => isWanted(l, code)).length;
    return { code, label: labels[code], count, disabled: count === 0 };
  });
}

const byName = (a: SpareBrowseLine, b: SpareBrowseLine) =>
  a.name.localeCompare(b.name, "en") || (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0);

/** Wishlist cards first, then cards a deck of the reader's needs, then the rest; each group by name. */
const wantedRank = (l: SpareBrowseLine) => (l.onWishlist ? 0 : l.deckNeed > 0 ? 1 : 2);

const COMPARATORS: Record<SpareSort, (a: SpareBrowseLine, b: SpareBrowseLine) => number> = {
  wanted: (a, b) => wantedRank(a) - wantedRank(b) || byName(a, b),
  name: byName,
  most: (a, b) => b.spare - a.spare || byName(a, b),
};

export function sortSpares(lines: readonly SpareBrowseLine[], sort: SpareSort): SpareBrowseLine[] {
  return [...lines].sort(COMPARATORS[sort]);
}

/** `?q=&colors=WU&match=exactly&types=Creature,Land&wanted=wishlist,deck&sort=name`; absent is the rest state. */
export function parseSpareParams(params: URLSearchParams): { filters: SpareFilters; sort: SpareSort } {
  const rawColors = (params.get("colors") ?? "").toUpperCase();
  const colors = /^[WUBRG]*$/.test(rawColors) ? WUBRG.filter((c) => rawColors.includes(c)) : [];
  const types = (params.get("types") ?? "")
    .split(",")
    .map((raw) => AVAILABLE_TYPES.find((t) => t.toLowerCase() === raw.trim().toLowerCase()))
    .filter((t, i, all): t is (typeof AVAILABLE_TYPES)[number] => t !== undefined && all.indexOf(t) === i);
  const wanted = SPARE_WANTED.filter((w) => (params.get("wanted") ?? "").split(",").includes(w));
  const sort = SPARE_SORTS.find((s) => s === params.get("sort")) ?? "wanted";
  return {
    filters: {
      search: params.get("q") ?? "",
      colors: [...colors],
      match: params.get("match") === "exactly" ? "exactly" : "contains",
      types: [...types],
      wanted,
    },
    sort,
  };
}

/** Writes the state onto `url`, leaving every other parameter (`?spare=`) as it is. */
export function writeSpareParams(url: URL, f: SpareFilters, sort: SpareSort): void {
  const set = (key: string, value: string) => (value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
  set("q", f.search);
  set("colors", f.colors.join(""));
  set("match", f.colors.length > 0 && f.match === "exactly" ? "exactly" : "");
  set("types", f.types.join(","));
  set("wanted", f.wanted.join(","));
  set("sort", sort === "wanted" ? "" : sort);
}
