// What survives of the deck-state marks: one figure, and one filter row.
//
// R4 drew two wordless marks on the status pill and R6 retired both. The phase
// a hollow plate used to mean is the `Draft` status now, and the pending edge
// is gone with no replacement — ruling 4, confirmed twice: the deck page has
// its banner, Home's row has its stamp, and the tile has the figure below.
//
// This module is deliberately small rather than deleted. The figure and the
// facet row are real copy with real call sites, and folding them back into
// `refresh.ts` would move two strings for the sake of tidiness.

import { deckVersioningCopy } from "./deck-versioning";

export const deckStateMarksCopy = {
  /**
   * The deck tile's detail-row figure, and the ONE thing this module still
   * owns. Everything else it held — two accessible names, a phase word, a
   * second filter row — went with the marks R6 retired: the phase is a status
   * word now, and a word needs no gloss.
   *
   * It is the banner's own string rather than a second phrasing of one fact.
   */
  detail: deckVersioningCopy.pending.since,

  /** The filter facet: one heading, one row. */
  filter: {
    heading: "Deck state",
    /**
     * A committed deck that differs from its version. The row carries a
     * per-row count in the wide form, like Status and Last played beside it —
     * `FilterPanel`'s `showCounts` defaults true and `/decks` passes nothing to
     * any of its three panels.
     */
    hasPending: "Edited since last version",
  },
} as const;
