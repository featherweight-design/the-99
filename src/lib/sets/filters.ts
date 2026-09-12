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
};

export const EMPTY_FILTERS: SetGridFilters = { colors: [], rarities: [], missingOnly: false };

/**
 * Colours are always "any", and there is deliberately no join-mode modifier on this page.
 * A card has one colour identity in a set list, so *exactly* has nothing to modify —
 * passing a disabled modifier through would be a control that can never do anything.
 */
export function applyFilters(cells: Cell[], f: SetGridFilters): Cell[] {
  return cells.filter((c) => {
    if (f.missingOnly && c.owned) return false;
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
  return params;
}

/** Unknown values are dropped rather than thrown on: a hand-edited URL still renders. */
export function parseFilters(params: URLSearchParams): SetGridFilters {
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
  };
}
