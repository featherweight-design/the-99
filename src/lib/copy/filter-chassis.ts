// Copy for the shared filter chassis, per `design/design_handoff_the99_filter_chassis/`.
//
// Strings the commander lanes already own are re-exported from `lanes.ts` rather
// than restated: the chassis mounts one control on four routes, so a second
// definition of "Colour identity" would be a second thing to keep in step.
// Where a string is new it is new because `/decks` and `/collection` had no
// equivalent — neither route captioned its colour control at all.

import { filterCopy } from "./lanes";

export const chassisCopy = {
  chips: {
    /**
     * Row 2 at rest. Present rather than absent, so the chassis never changes
     * height between result states — the line IS the invariant that makes the
     * frame a fixed height (decision 2).
     */
    none: "No filters on",
    /** Named, so a reader hears which value leaves rather than a bare "Remove". */
    removeAria: (label: string) => `Remove filter: ${label}`,
    /**
     * The only control that touches every dimension. "filters" is load-bearing:
     * it deliberately does not touch the sort.
     */
    clearAll: "Clear all filters",
    clearAllAria: "Clear all filters. The sort is unchanged.",
  },

  colour: {
    /**
     * Per-pip accessible name. The hue letter is never the name on its own:
     * `color-pip.tsx` shipped `Filter by B`, which reads as a letter rather than
     * a colour. The lit state is spoken because the ring that carries it is the
     * only visual signal, and a ring is not announced.
     */
    pipAria: (name: string, on: boolean) => `${name}${on ? ", on" : ""}`,
    /** Reused on the commander lanes; stated for the two routes that had none. */
    legend: "Colour",
    /** Chip label past one pip — never one chip per hue. */
    collapsed: filterCopy.colour.collapsed,
    /**
     * With the match modifier on, the chip says so. Without it, "any of these
     * three" and "exactly these three" produce the same chip for two filters
     * that return very different lists.
     */
    collapsedExactly: (count: number) => `Exactly ${count} colours`,
    /** The five hues, in WUBRG order, with the names the lanes already use. */
    names: filterCopy.colour.names,
  },
} as const;

/** WUBRG, in the order the pips draw. */
export const PIP_ORDER = ["w", "u", "b", "r", "g"] as const;

export type PipCode = (typeof PIP_ORDER)[number];
