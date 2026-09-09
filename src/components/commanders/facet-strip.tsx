"use client";
// FacetStrip — the radiogroup of pills that filters the synergy row list.
// Pill order: All · Creatures · Instants & sorceries · Artifacts · Enchantments · Lands.
// Other never gets a pill — its rows are reachable through All.
// A zero-count facet keeps an ordinary pill: selecting one is the only route to
// the panel's empty-facet line. Only a zero-count All is dropped, and only
// because the panel is never drawn when the full list is empty.

import { useRef } from "react";
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
  // The pills a player can actually reach, resolved before the render so the
  // roving tab stop and the arrow wrap both count the same list. "Other" never
  // gets a pill, and a zero-count "All" is dropped because the panel is only
  // drawn when the full list is non-empty.
  const shown = FACET_ORDER.filter(
    (facet) => facet !== "other" && !(facet === "all" && counts[facet] === 0),
  );

  // A radiogroup is one tab stop and the arrows move within it — the pattern a
  // screen-reader user expects the moment the role is announced. Selection
  // follows focus, matching the segmented control in commanders-view.tsx.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = (from: number, dir: 1 | -1) => {
    const next = (from + dir + shown.length) % shown.length;
    refs.current[next]?.focus();
    onSelect(shown[next]);
  };

  return (
    <div
      role="radiogroup"
      aria-label={synergyCopy.facet.groupAria}
      // One row and a horizontal scroll at phone width, never a wrap: 44px
      // chips make a wrapping strip tall enough to break the layout, and a
      // taller strip is the cost R3 §2 chose to pay in width instead. Desktop
      // wraps as before, where space allows.
      // gap-[6px] at both widths per design table (desktop also uses 6px).
      className="flex flex-nowrap md:flex-wrap gap-[6px] overflow-x-auto md:overflow-visible"
      style={{ scrollbarWidth: "none" }}
    >
      {shown.map((facet, i) => {
        // A zero-count facet keeps an ordinary selectable pill. The design table
        // gives it no disabled treatment, and selecting one is the only route to
        // the panel's empty-facet line.
        const isSelected = facet === selected;
        const label = FACET_LABEL[facet];
        const countStr = String(counts[facet]);

        return (
          <button
            key={facet}
            ref={(n) => {
              refs.current[i] = n;
            }}
            role="radio"
            aria-checked={isSelected}
            aria-label={synergyCopy.facet.itemAria(label, countStr)}
            type="button"
            // Roving: the checked pill is the group's single tab stop. The first
            // pill stands in when the selected facet has no pill of its own, so
            // the group never falls out of the tab order entirely.
            tabIndex={isSelected || (i === 0 && !shown.includes(selected)) ? 0 : -1}
            onClick={() => onSelect(facet)}
            onKeyDown={(e) => {
              const dir =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (dir === 0) return;
              e.preventDefault();
              step(i, dir);
            }}
            // The Dense chip variant, scoped by name to this strip: it is the
            // one horizontally scrolling row of many chips, where the default
            // pill's 14px/16px padding costs a visible chip per screen. The
            // 44px phone height is the same floor the default carries — a
            // facet chip is the only route to its filter, so it cannot sit
            // under it. R3 §2, R3.1 §5.
            //
            // `md:` where the refresh's other controls use `sm:`, deliberately:
            // matching the breakpoints would move this strip at a width nobody
            // reviewed.
            className="shrink-0 md:shrink flex items-center gap-[5px] md:gap-[6px] font-mono cursor-pointer h-[44px] md:h-[32px] px-[12px] rounded-[10px] md:rounded-[8px] text-[13px] md:text-[12.5px] font-medium"
            style={{
              // eslint-disable-next-line no-restricted-syntax -- background is constant (transparent for All-unselected, --surface-raised otherwise); genuinely conditional
              background: !isSelected && facet === "all" ? "transparent" : "var(--surface-raised)",
              // eslint-disable-next-line no-restricted-syntax -- border changes with isSelected and facet=all; genuinely dynamic
              border: isSelected
                ? "1px solid var(--accent)"
                : facet === "all"
                  ? "1px dashed var(--border-strong)"
                  // --border-strong, not --border: the pill table is the
                  // complete statement of this control's resting border, and
                  // R3.1 §5 made it so. Accent and the dashed All are state
                  // treatments layered on top, which R3 did not reopen.
                  : "1px solid var(--border-strong)",
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
