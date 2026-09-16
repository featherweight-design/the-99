"use client";

// The collection's own filter chips, for the `browse` figure.
//
// A client module, and it has to be: `FilterChipPill` is a client component and
// `FilterChip` requires `onRemove`, so a fixture built on the server hands a
// FUNCTION across the boundary — which React refuses outright. The figure threw
// on every real render while every unit test passed, because jsdom does not
// enforce the server/client split. The contact sheet is what found it.
//
// So the chips are built HERE, where the handler is allowed to exist, and
// nothing crosses. The labels still come from the collection's own copy: a
// rename must reach this figure without it being edited.

import { collectionChassisCopy } from "../../lib/copy/collection";
import { FilterChipPill, type FilterChip } from "../ui/filter-chassis";

// Inert, like every specimen: `Specimen` sets `pointer-events: none` over the
// whole figure, so this is never called. It exists because the type requires
// it, and the figure's subject is that the control EXISTS and is per-dimension.
const noop = () => {};

const CHIPS: FilterChip[] = [
  { key: "colour", label: collectionChassisCopy.chip.colours(1), dots: ["var(--success)"], onRemove: noop },
  { key: "set", label: "The Hobbit", onRemove: noop },
];

export function BrowseChips() {
  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      {CHIPS.map((chip) => (
        <FilterChipPill key={chip.key} chip={chip} />
      ))}
    </div>
  );
}
