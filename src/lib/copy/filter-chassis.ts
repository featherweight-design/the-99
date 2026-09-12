// Copy for the shared filter chassis, per `design/design_handoff_the99_filter_chassis/`.
//
// Strings the commander lanes already own are re-exported from `lanes.ts` rather
// than restated: the chassis mounts one control on four routes, so a second
// definition of "Colour identity" would be a second thing to keep in step.
// Where a string is new it is new because `/decks` and `/collection` had no
// equivalent — neither route captioned its colour control at all.

import { filterCopy } from "./lanes";
import { refreshCopy } from "./refresh";
import type { FilterPanelCopy } from "./collection";

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
    clearAll: filterCopy.chips.clearAll,
    clearAllAria: "Clear all filters. The sort is unchanged.",
  },

  colour: {
    /**
     * Per-pip accessible name: the colour, and nothing else. The hue letter is
     * never the name on its own — `color-pip.tsx` shipped `Filter by B`, which
     * reads as a letter rather than a colour.
     *
     * The handoff specified `${name}, on` when lit, reasoning that the ring
     * carrying the state is not announced. The ring is not, but the pip is a
     * `role="switch"` and `aria-checked` is, so the suffix made a lit pip read
     * "Blue, on … on" while an unlit one relied on the ARIA state alone. The
     * state belongs to `aria-checked`; the name stays the colour.
     */
    pipAria: (name: string) => name,
    /** Reused on the commander lanes; stated for the two routes that had none. */
    legend: "Colour",
    /** Chip label past one pip — never one chip per hue. */
    collapsed: filterCopy.colour.collapsed,
    /**
     * With the match modifier on, the chip says so. Without it, "any of these
     * three" and "exactly these three" produce the same chip for two filters
     * that return very different lists.
     */
    collapsedExactly: (count: number) =>
      `Exactly ${count} ${count === 1 ? "colour" : "colours"}`,
    /** The five hues, in WUBRG order, with the names the lanes already use. */
    /**
     * Keyed lowercase by `lanes.ts`; the pips look up through a lowercased
     * code so the canonical uppercase vocabulary and the existing copy module
     * do not have to agree on case.
     */
    names: filterCopy.colour.names,
  },
} as const;

/**
 * `/decks`' two panel dimensions. Both are `FilterPanel` mounts, so both owe the
 * full `FilterPanelCopy` contract — the panel is mounted and parameterised, never
 * forked, which is the readiness verdict's §2 ruling.
 *
 * Every string that `refreshCopy` already owns is read from there rather than
 * restated: `/decks` had these words before it had a chassis, and two
 * definitions of "Status" would be two things to keep in step.
 */
const deckPanel = (
  dimension: string,
  countNoun: (n: number) => string,
): FilterPanelCopy => ({
  triggerLabel: dimension,
  triggerOne: (name) => `${dimension} · ${name}`,
  triggerAriaCollapsed: `${dimension} filter`,
  triggerAriaWithSelection: (n) => `${dimension} filter, ${n} on`,

  panelAriaLabel: `${dimension} options`,
  sheetTitle: dimension,
  // Neither dimension is searchable: status has six values and last-played two,
  // which is a list you read rather than one you hunt through.
  searchPlaceholder: "",
  searchAriaLabel: "",
  clearSearch: "",

  groupDefault: dimension,
  groupSelected: (n) => `${n} on`,
  groupMatches: (n) => countNoun(n),

  optionAria: (name, count) => `${name}, ${countNoun(count)}`,
  optionAriaUnavailable: (name) => `${name}, no decks`,

  footerTotal: (total) => countNoun(Number(total)),
  footerSelected: (n, total) => `${n} of ${total} on`,
  clear: refreshCopy.filters.clear,
  done: "Done",
  closeLabel: `Close ${dimension.toLowerCase()} filter`,

  emptyTitle: "Nothing here",
  emptyBody: (query) => ({ before: "No ", query, after: " to show" }),

  announceMatches: (n) => countNoun(n),
  announceAdded: (name, n, shown, total) => `${name} on. ${shown} of ${total} decks.`,
  announceRemoved: (name, n, shown, total) => `${name} off. ${shown} of ${total} decks.`,
  announceCleared: (total) => `Filters cleared. ${total} decks.`,
});

const deckCount = (n: number) => `${n} ${n === 1 ? "deck" : "decks"}`;

export const deckChassisCopy = {
  status: deckPanel(refreshCopy.filters.statusHeading, deckCount),
  played: deckPanel(refreshCopy.filters.lastPlayedHeading, deckCount),
  /** Row 3. The count the header used to print, now the chassis's result line. */
  result: (shown: number, total: number) =>
    shown === total ? deckCount(total) : `${shown} of ${deckCount(total)} match`,
} as const;

/**
 * WUBRG, in the order the pips draw, and **uppercase is canonical**.
 *
 * Two of the three surfaces that will mount the pips already store colour this
 * way — `/decks`' `COLOUR_ORDER` is `["W","U","B","R","G"]`
 * (`src/lib/decks/filter.ts:34`) and `/collection`'s `BrowseFilters.colors` is a
 * subset of the same (`src/lib/collection/browse.ts:133`). Only the commander
 * rack keeps lowercase, so it adapts at its own mount rather than the other two
 * adapting to it.
 *
 * This matters beyond tidiness: a toggle that emits `w` against an uppercase
 * `W` in state does not remove it, it appends a duplicate, and the filter and
 * its URL chip then disagree about what is on.
 */
export const PIP_ORDER = ["W", "U", "B", "R", "G"] as const;

export type PipCode = (typeof PIP_ORDER)[number];
