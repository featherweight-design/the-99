"use client";
// FacetStrip — the radiogroup of pills that filters the synergy row list.
// Pill order: All · Creatures · Instants & sorceries · Artifacts · Enchantments · Lands.
// Other never gets a pill — its rows are reachable through All.
// Zero-count facets are omitted (a pill for a facet with no rows is a control that does nothing).

import type { CardFacet } from "../../lib/cards/facet";
import { synergyCopy } from "../../lib/copy/synergy-discovery";

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
  return (
    <div
      role="radiogroup"
      aria-label={synergyCopy.facet.groupAria}
      // Horizontal scroll at phone width; wraps naturally on desktop where space allows.
      className="flex gap-[6px] overflow-x-auto"
      style={{ scrollbarWidth: "none" }}
    >
      {FACET_ORDER.map((facet) => {
        // Other never gets a pill; zero-count facets are omitted.
        if (facet === "other") return null;
        const count = counts[facet];
        if (count === 0) return null;

        const isSelected = facet === selected;
        const label = FACET_LABEL[facet];
        const countStr = String(count);

        return (
          <button
            key={facet}
            role="radio"
            aria-checked={isSelected}
            aria-label={synergyCopy.facet.itemAria(label, countStr)}
            type="button"
            onClick={() => onSelect(facet)}
            className="shrink-0 flex items-center gap-[5px] font-mono cursor-pointer h-8 md:h-[30px]"
            style={{
              padding: "0 11px",
              borderRadius: 999,
              fontSize: 11.5,
              // eslint-disable-next-line no-restricted-syntax -- background is constant (--surface-raised); no interactive state
              background: "var(--surface-raised)",
              // eslint-disable-next-line no-restricted-syntax -- border changes with isSelected and facet=all; genuinely dynamic
              border: isSelected
                ? "1px solid var(--accent)"
                : facet === "all"
                  ? "1px dashed var(--border-strong)"
                  : "1px solid var(--border)",
            }}
          >
            <span style={{ color: isSelected ? "var(--fg)" : "var(--fg-body)" }}>
              {facet === "spell" ? (
                <>
                  <span className="md:hidden">{synergyCopy.facet.spellsShort}</span>
                  <span className="hidden md:inline">{label}</span>
                </>
              ) : (
                label
              )}
            </span>
            <span
              style={{
                color: isSelected ? "var(--accent)" : "var(--fg-locked)",
              }}
            >
              {countStr}
            </span>
          </button>
        );
      })}
    </div>
  );
}
