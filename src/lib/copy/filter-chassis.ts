// Copy for the shared filter chassis, per `design/design_handoff_the99_filter_chassis/`.
//
// Strings the commander lanes already own are re-exported from `lanes.ts` rather
// than restated: the chassis mounts one control on four routes, so a second
// definition of "Color identity" would be a second thing to keep in step.
// Where a string is new it is new because `/decks` and `/collection` had no
// equivalent — neither route captioned its colour control at all.

import { filterCopy } from "./lanes";
import { manaSpriteBackground } from "../cards/mana-sprite";
import { deckStateMarksCopy } from "./deck-state-marks";
import { refreshCopy } from "./refresh";
import type { FilterPanelCopy } from "./collection";

/** One formatter for every figure this module prints. */
const fmt = (n: number) => n.toLocaleString("en-US");

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
    /**
     * A hue no surviving card carries. `collection/color-filter.ts` states the
     * contract — listed and disabled, because the vocabulary is fixed and a hue
     * vanishing from the row would move the other four — and the name has to
     * say so, since the pip itself draws no disabled treatment.
     */
    pipAriaUnavailable: (name: string) => `${name}, no matches`,
    /** Reused on the commander lanes; stated for the two routes that had none. */
    legend: "Color",
    /** Chip label past one pip — never one chip per hue. */
    collapsed: filterCopy.colour.collapsed,
    /**
     * With the match modifier on, the chip says so. Without it, "any of these
     * three" and "exactly these three" produce the same chip for two filters
     * that return very different lists.
     */
    collapsedExactly: (count: number) =>
      `Exactly ${fmt(count)} ${count === 1 ? "color" : "colors"}`,
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
  triggerAriaWithSelection: (n) => `${dimension} filter, ${fmt(n)} on`,

  panelAriaLabel: `${dimension} options`,
  sheetTitle: dimension,
  // NONE of these dimensions is searchable: status has six values, deck state
  // two and last-played two, which are lists you read rather than hunt through.
  searchPlaceholder: "",
  searchAriaLabel: "",
  clearSearch: "",

  groupDefault: dimension,
  groupSelected: (n) => `${fmt(n)} on`,
  groupMatches: (n) => countNoun(n),

  optionAria: (name, count) => `${name}, ${countNoun(count)}`,
  optionAriaUnavailable: (name) => `${name}, no decks`,

  // Raw counts, formatted here. `FilterPanel` used to format before calling,
  // which meant a caller could not pluralise without parsing its own string
  // back out — and left two separator conventions reachable in one sentence on
  // a non-`en-US` browser, since only some figures were pinned.
  footerTotal: (total) => `${fmt(total)} ${total === 1 ? "deck" : "decks"}`,
  footerSelected: (n, total) => `${fmt(n)} of ${fmt(total)} on`,
  clear: refreshCopy.filters.clear,
  done: "Done",
  closeLabel: `Close ${dimension.toLowerCase()} filter`,

  emptyTitle: "Nothing here",
  emptyBody: (query) => ({ before: "No ", query, after: " to show" }),

  announceMatches: (n) => countNoun(n),
  announceAdded: (name, n, shown, total) => `${name} on. ${fmt(shown)} of ${fmt(total)} decks.`,
  announceRemoved: (name, n, shown, total) => `${name} off. ${fmt(shown)} of ${fmt(total)} decks.`,
  announceCleared: (total) => `Filters cleared. ${fmt(total)} decks.`,
});

const deckCount = (n: number) => `${fmt(n)} ${n === 1 ? "deck" : "decks"}`;

export const deckChassisCopy = {
  status: deckPanel(refreshCopy.filters.statusHeading, deckCount),
  /**
   * The deck-state marks. Its own heading rather than two more Status rows,
   * because Status partitions ONE fact — how the matched count stands against
   * the body size — and these answer two others: whether the deck is committed
   * at all, and whether its draft has moved since.
   *
   * NOT because of the panel's `N of N` footer, which is what an earlier draft
   * of this note claimed: `/decks` passes `footerStatus={false}` to every panel
   * it mounts, so that string is never drawn on this route. What a seventh
   * `STATUS_ORDER` member would really break is the vocabulary it serialises —
   * `?status=` values, `filterDecks`' comparison against `statusPill`, and the
   * exhaustiveness `statusPill()` is written around.
   */
  state: deckPanel(deckStateMarksCopy.filter.heading, deckCount),
  played: deckPanel(refreshCopy.filters.lastPlayedHeading, deckCount),
  /** Row 3. The count the header used to print, now the chassis's result line. */
  result: (shown: number, total: number) =>
    shown === total ? deckCount(total) : `${fmt(shown)} of ${deckCount(total)} match`,
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

/**
 * The five hues' art, beside the order rather than beside the component.
 *
 * It lived in `colour-pips.tsx`, which is `"use client"` — so a SERVER
 * component importing it received a client reference and every lookup came
 * back `undefined`. `/about`'s set figure rendered five 16px boxes with
 * `background: url(undefined)`: no error, no failing test, nothing on screen.
 * The browse figure was unaffected only because it is itself a client module,
 * which is what made the difference invisible.
 *
 * Nothing here is client-only, so nothing here needs to be in a client module.
 */
// Each hue's CSS \`background\`: its cell in the one preloaded sprite, not a file fetched at paint.
// See \`mana-sprite.ts\`.
export const PIP_BACKGROUND: Record<PipCode, string> = {
  W: manaSpriteBackground("W") as string,
  U: manaSpriteBackground("U") as string,
  B: manaSpriteBackground("B") as string,
  R: manaSpriteBackground("R") as string,
  G: manaSpriteBackground("G") as string,
};

export type PipCode = (typeof PIP_ORDER)[number];
