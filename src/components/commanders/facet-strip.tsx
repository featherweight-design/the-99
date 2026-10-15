"use client";
// FacetStrip — the radiogroup of pills that filters the synergy row list.
// Pill order: All · Creatures · Instants & sorceries · Artifacts · Enchantments · Lands.
// Other never gets a pill — its rows are reachable through All.
// A zero-count facet keeps an ordinary pill: selecting one is the only route to
// the panel's empty-facet line. Only a zero-count All is dropped, and only
// because the panel is never drawn when the full list is empty.

import type { CardFacet } from "../../lib/cards/facet";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { SegmentedSwitch } from "../ui/segmented-switch";

// Fixed pill order per the brief.
const FACET_ORDER: Array<CardFacet | "all"> = [
  "all",
  "creature",
  "spell",
  "artifact",
  "enchantment",
  "land",
];

// Display label for each facet in the strip.
const FACET_LABEL: Record<CardFacet | "all", string> = {
  all: synergyCopy.facet.all,
  creature: synergyCopy.facet.creatures,
  spell: synergyCopy.facet.spells,
  artifact: synergyCopy.facet.artifacts,
  enchantment: synergyCopy.facet.enchantments,
  land: synergyCopy.facet.lands,
  other: "", // never shown
};

export function FacetStrip({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<CardFacet | "all", number>;
  selected: CardFacet | "all";
  onSelect: (f: CardFacet | "all") => void;
}) {
  // The pills a player can actually reach, resolved before the render so the
  // roving tab stop and the arrow wrap both count the same list. "Other" never
  // gets a pill, and a zero-count "All" is dropped because the panel is only
  // drawn when the full list is non-empty.
  const shown = FACET_ORDER.filter(
    (facet) => facet !== "other" && !(facet === "all" && counts[facet] === 0),
  );

  // A radiogroup (segmented switch 3b): one tab stop, and the arrows, Home and End move the choice and the focus
  // together. Every pill is drawn alike: the dashed All and the accent ring went with the loose pills (d9, 2026-10-15).
  // The default size keeps the 44px phone floor, since a facet is the only route to its filter, and the well scrolls
  // sideways at phone rather than wrapping (R3 §2).
  return (
    <SegmentedSwitch<CardFacet | "all">
      kind="radio"
      scroll
      ariaLabel={synergyCopy.facet.groupAria}
      segments={shown.map((facet) => {
        const label = FACET_LABEL[facet];
        const countStr = String(counts[facet]);
        return {
          value: facet,
          ariaLabel: synergyCopy.facet.itemAria(label, countStr),
          label:
            facet === "spell" ? (
              <>
                <span className="md:hidden">{synergyCopy.facet.spellsShort}</span>
                <span className="hidden md:inline">{label}</span>
              </>
            ) : (
              label
            ),
          count: <span className="font-mono text-[10px] text-[color:var(--fg-faint)] md:text-[10.5px]">{countStr}</span>,
        };
      })}
      value={selected}
      onChange={onSelect}
    />
  );
}
