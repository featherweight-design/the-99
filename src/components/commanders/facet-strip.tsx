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
      // gap-[6px] at both widths per design table (desktop also uses 6px).
      className="flex flex-wrap gap-[6px] overflow-x-auto md:overflow-visible"
      style={{ scrollbarWidth: "none" }}
    >
      {FACET_ORDER.map((facet) => {
        // Other never gets a pill.
        if (facet === "other") return null;
        const count = counts[facet];

        // Zero-count facets: render as disabled pills so the empty-facet branch
        // in SynergyPanel is reachable when the player selects them.
        const isEmpty = count === 0;
        const isSelected = facet === selected;
        const label = FACET_LABEL[facet];
        const countStr = String(count);

        // Omit zero-count "All" pill — the panel is only drawn when the full
        // list is non-empty, so All can never be 0.
        if (facet === "all" && isEmpty) return null;

        return (
          <button
            key={facet}
            role="radio"
            aria-checked={isSelected}
            aria-label={synergyCopy.facet.itemAria(label, countStr)}
            type="button"
            onClick={() => !isEmpty && onSelect(facet)}
            disabled={isEmpty}
            className="shrink-0 md:shrink flex items-center gap-[5px] md:gap-[6px] font-mono cursor-pointer h-8 md:h-[30px] disabled:cursor-default disabled:opacity-60"
            style={{
              padding: "0 11px",
              borderRadius: 999,
              fontSize: 11.5,
              // eslint-disable-next-line no-restricted-syntax -- background is constant (transparent for All-unselected, --surface-raised otherwise); genuinely conditional
              background: !isSelected && facet === "all" ? "transparent" : "var(--surface-raised)",
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
            {/* Count: 10px phone, 10.5px desktop */}
            <span
              className="text-[10px] md:text-[10.5px]"
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
