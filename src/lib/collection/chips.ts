// `/collection`'s chip derivation, the shape `decks/filter.ts`'s `chipLabels`
// and `rack/chip-line.tsx`'s `chipsFor` already have on the other three routes.
//
// This REPLACED the route's own chip row. `browser.tsx` rendered `ChipRow`
// below the filter bar, with the selected values and the result count; the
// chassis draws both rows itself, so that component is deleted and this is what
// feeds the replacement. Unlike `/decks`, nothing here is new behaviour — it is
// the same information in the shared frame.
//
// One chip per CONTROL rather than per value — five sets collapse to "5 sets",
// and the trigger beside it is where the five are listed.

import type { AvailabilityState } from "../decks/availability";
import { collectionChassisCopy } from "../copy/collection";
import { filterCopy } from "../copy/lanes";
import { COLOR_NAMES } from "./color-filter";
import type { BrowseFilters } from "./browse";
import { WUBRG_COLOR } from "./browse";

const copy = collectionChassisCopy.chip;

/**
 * The shared map, not a second copy. `color-filter.ts` already owns it for the
 * filter options, and two of them would let a chip announce a colour by a name
 * the option beside it no longer uses.
 */
const colourName = (code: string) => COLOR_NAMES[code.toUpperCase()] ?? code;

export type CollectionChip = {
  key: string;
  label: string;
  /**
   * The availability states this chip stands for, so the mount can draw the
   * same marker the list rows use. Codes rather than nodes: this module is
   * pure and has no business constructing components.
   */
  markers?: readonly string[];
  /** The label with collapsed values named, for readers who cannot see swatches. */
  spoken?: string;
  /** One swatch per lit hue — the colour chip's label collapses them to a count. */
  dots?: string[];
  /** The filters with just this control unset. */
  next: BrowseFilters;
};

/** Labels a code through the options the bar already built, falling back to the code. */
type Named = { code: string; label: string };
const nameOf = (options: readonly Named[], code: string) =>
  options.find((o) => o.code === code)?.label ?? code;

/**
 * Every selected value, named, for the chip's accessible text.
 *
 * A chip collapses past one value — "2 types", "5 sets" — and that count is all
 * a screen reader would otherwise get, where the `ChipRow` this replaces named
 * each one. Returns undefined at a single value, because the label already IS
 * the name and a duplicate spoken string would say it twice.
 */
const spokenNames = (codes: readonly string[], options: readonly Named[]) =>
  codes.length > 1 ? codes.map((c) => nameOf(options, c)).join(", ") : undefined;

export function collectionChips(
  filters: BrowseFilters,
  options: { types: readonly Named[]; sets: readonly Named[]; availability: readonly Named[] },
): CollectionChip[] {
  const chips: CollectionChip[] = [];
  const avail = filters.availability ?? [];

  // Control order, matching the bar: search, colour, type, set, availability.
  // A chip and the control that made it stay on the same sight line.
  if (filters.search.trim() !== "") {
    chips.push({
      key: "q",
      label: copy.search(filters.search.trim()),
      next: { ...filters, search: "" },
    });
  }

  if (filters.colors.length > 0) {
    chips.push({
      key: "colors",
      label: copy.colours(filters.colors.length),
      // The swatches say which hues with colour alone, and they are
      // `aria-hidden`. The row this replaces named each one, so the names go
      // here rather than being lost to a count.
      // Colours are named at EVERY count, unlike sets and types. Their label is
      // `1 colour` even at one — a count, never the name — where a single set
      // or type renders as itself and a spoken copy would say it twice.
      spoken: filters.colors.map((c) => colourName(c)).join(", "),
      dots: filters.colors.map((c) => WUBRG_COLOR[c.toUpperCase()]),
      // Dropping the pips drops the modifier with them, the rack's rule (`chip-line.tsx`).
      next: { ...filters, colors: [], match: "contains" },
    });
  }

  // The modifier's own chip, the rack's and Sets' rule (H10): only while there are pips for it
  // to modify, and removing it returns to Any and keeps the pips.
  if (filters.colors.length > 0 && filters.match === "exactly") {
    chips.push({
      key: "m",
      label: filterCopy.match.exactlyShort,
      next: { ...filters, match: "contains" },
    });
  }

  if (filters.types.length > 0) {
    chips.push({
      key: "types",
      label: copy.types(filters.types.length, nameOf(options.types, filters.types[0])),
      spoken: spokenNames(filters.types, options.types),
      next: { ...filters, types: [] },
    });
  }

  if (filters.setCodes.length > 0) {
    chips.push({
      key: "sets",
      label: copy.sets(filters.setCodes.length, nameOf(options.sets, filters.setCodes[0])),
      spoken: spokenNames(filters.setCodes, options.sets),
      next: { ...filters, setCodes: [] },
    });
  }

  if (avail.length > 0) {
    chips.push({
      key: "avail",
      label: copy.availability(avail.length, nameOf(options.availability, avail[0])),
      spoken: spokenNames(avail, options.availability),
      // `free` is markerless in the rows, so it is markerless here too.
      markers: avail.filter((state) => state !== "free"),
      next: { ...filters, availability: [] as AvailabilityState[] },
    });
  }

  return chips;
}
