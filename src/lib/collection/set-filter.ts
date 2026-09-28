// Set-filter option building — the pure half of the Set ▾ panel (#86).
//
// Everything here is logic-free of the database: `loadOwnedSetMeta` in browse.ts
// fetches {code, name, releasedAt} rows, and these functions turn them plus the
// already-loaded BrowseCard[] into the panel's option list. Splitting it this
// way is what lets the ordering, the filter-aware counts and the fallback for a
// missing `sets` row be unit tested (untested-query pattern, see browse.ts).

import { filterCards, type BrowseFilters, type BrowseListCard } from "./browse";

/** One row of the `sets` catalog table, for a set the user actually owns. */
export type OwnedSetMeta = {
  code: string;              // lowercase, as stored
  name: string;
  releasedAt: string | null; // ISO date; null for undated sets (promos, Secret Lair)
};

/** One option row in the panel. `code` is uppercased — it is never shown lowercase. */
export type SetOption = {
  code: string;
  label: string;
  /** The set abbreviation, shown after the name. Absent when it would repeat the label. */
  hint?: string;
  count: number;
  disabled: boolean;
  releasedAt: string | null;
};

/**
 * The panel's option list: every set the user owns, newest first, with a count
 * of the cards from that set that survive the *other* active filters.
 *
 * Two judgment calls worth stating:
 *
 * 1. "Other filters" is the structured filters (colors, type) only — not the
 *    collection's free-text search box, and not the set selection itself. The
 *    handoff draws it this way (gap 4) so the number stays stable while typing
 *    and a selected set does not read as its own subset.
 * 2. A count is the sum of *quantities* owned from that set among the surviving
 *    cards, not the number of distinct oracle cards — the design's totals read
 *    as card counts ("2,933 cards"). Quantities come from `setCounts`, which is
 *    per set, so a card owned in two sets is not counted twice in each.
 *
 * A set whose count falls to 0 stays in the list, disabled; removing it would
 * make sets appear and vanish as the other filters change.
 */
export function buildSetOptions(
  cards: BrowseListCard[],
  filters: BrowseFilters,
  meta: OwnedSetMeta[],
): SetOption[] {
  const byCode = new Map<string, OwnedSetMeta>();
  for (const m of meta) byCode.set(m.code.toUpperCase(), m);

  // Every owned set, regardless of the current filters.
  const owned = new Set<string>();
  for (const c of cards) for (const [code] of c.setCounts) owned.add(code.toUpperCase());

  // Counts under the other filters only.
  const surviving = filterCards(cards, {
    search: "",
    colors: filters.colors,
    types: filters.types,
    setCodes: [],
    availability: filters.availability,
  });
  const counts = new Map<string, number>();
  for (const c of surviving) {
    // Uppercased on the way in, exactly as `owned` is above: these counts are
    // looked up by the option codes built from that set, and a case mismatch
    // does not fail — it reads as a zero and disables a chip the reader owns.
    for (const [code, quantity] of c.setCounts) {
      const key = code.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + quantity);
    }
  }

  const options: SetOption[] = [...owned].map((code) => {
    const m = byCode.get(code);
    const count = counts.get(code) ?? 0;
    return {
      code,
      label: m?.name ?? code, // never a lowercase raw code
      // Suppressed when the name already IS the code (no catalog row), so the
      // fallback row doesn't read "MH3  MH3".
      hint: m?.name ? code : undefined,
      count,
      disabled: count === 0,
      releasedAt: m?.releasedAt ?? null,
    };
  });

  // Release date descending; ties A→Z by label; undated sets last, A→Z.
  options.sort((a, b) => {
    if (a.releasedAt !== b.releasedAt) {
      if (a.releasedAt === null) return 1;
      if (b.releasedAt === null) return -1;
      return a.releasedAt < b.releasedAt ? 1 : -1;
    }
    return a.label.localeCompare(b.label);
  });
  return options;
}

/**
 * Case-insensitive substring match on set name *and* code, with prefix matches
 * ranked above substring matches and the incoming (release) order preserved
 * inside each group. An empty query returns the list untouched.
 */
export function rankSetOptions<T extends { code: string; label: string }>(
  options: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (q === "") return options;
  const prefix: T[] = [];
  const substring: T[] = [];
  for (const o of options) {
    const label = o.label.toLowerCase();
    const code = o.code.toLowerCase();
    if (label.startsWith(q) || code.startsWith(q)) prefix.push(o);
    else if (label.includes(q) || code.includes(q)) substring.push(o);
  }
  return [...prefix, ...substring];
}

/**
 * `?s=blb,mh3` → `["BLB","MH3"]`. A legacy single bare code (`?s=blb`) parses
 * as a one-element selection, so links shared before the multi-select landed
 * still work.
 */
export function parseSetCodesParam(param: string | null): string[] {
  if (!param) return [];
  const out: string[] = [];
  for (const raw of param.split(",")) {
    const code = raw.trim().toUpperCase();
    if (code !== "" && !out.includes(code)) out.push(code);
  }
  return out;
}

/**
 * `["BLB","MH3"]` → `BLB,MH3`. Codes are already uppercase by the time they get here —
 * `parseSetCodesParam` uppercases on the way in and the options are built uppercase — so the
 * URL form is uppercase and `parseSetCodesParam` round-trips it unchanged.
 */
export function serializeSetCodes(codes: string[]): string {
  return codes.join(",");
}
