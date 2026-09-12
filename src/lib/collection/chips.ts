// `/collection`'s chip derivation, the shape `decks/filter.ts`'s `chipLabels`
// and `rack/chip-line.tsx`'s `chipsFor` already have on the other three routes.
//
// The route had no chip line before the chassis: its filters reported
// themselves only inside their own triggers, so a reader scanning the bar saw
// which dimensions were touched and never which values. One chip per CONTROL
// rather than per value — five sets collapse to "5 sets", and the trigger
// beside it is where the five are listed.

import type { AvailabilityState } from "../decks/availability";
import { collectionChassisCopy } from "../copy/collection";
import type { BrowseFilters } from "./browse";
import { WUBRG_COLOR } from "./browse";

const copy = collectionChassisCopy.chip;

export type CollectionChip = {
  key: string;
  label: string;
  /** One swatch per lit hue — the colour chip's label collapses them to a count. */
  dots?: string[];
  /** The filters with just this control unset. */
  next: BrowseFilters;
};

/** Labels a code through the options the bar already built, falling back to the code. */
type Named = { code: string; label: string };
const nameOf = (options: readonly Named[], code: string) =>
  options.find((o) => o.code === code)?.label ?? code;

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
      dots: filters.colors.map((c) => WUBRG_COLOR[c.toUpperCase()]),
      next: { ...filters, colors: [] },
    });
  }

  if (filters.types.length > 0) {
    chips.push({
      key: "types",
      label: copy.types(filters.types.length, nameOf(options.types, filters.types[0])),
      next: { ...filters, types: [] },
    });
  }

  if (filters.setCodes.length > 0) {
    chips.push({
      key: "sets",
      label: copy.sets(filters.setCodes.length, nameOf(options.sets, filters.setCodes[0])),
      next: { ...filters, setCodes: [] },
    });
  }

  if (avail.length > 0) {
    chips.push({
      key: "avail",
      label: copy.availability(avail.length, nameOf(options.availability, avail[0])),
      next: { ...filters, availability: [] as AvailabilityState[] },
    });
  }

  return chips;
}
