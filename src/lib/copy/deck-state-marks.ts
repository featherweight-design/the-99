// The two deck-state marks, in words.
//
// The PLATE is the primary mark and answers "is this a deck at all": a deck
// with a committed v1 keeps the status token's tint, a deck with no v1 — a plan
// — takes `--bg`. The 2px `--fg` LEFT RULE is the secondary mark and answers
// "does this real deck differ from its version". They are mutually exclusive by
// definition, so no surface ever states both.
//
// Neither is a `StatusPill` member and neither has a `refreshCopy.status` key:
// the pill answers the count question, and these two answer questions of their
// own. The six labels are untouched.
//
// The visible word is `pending`, not the review page's `deck in draft`. That
// tag says *deck* beside a CARD name, which is what retired a bare `pending`
// there; here the subject IS the deck and the mark sits against the deck's own
// status, so the ambiguity cannot arise.

import { deckVersioningCopy } from "./deck-versioning";

export const deckStateMarksCopy = {
  /**
   * Appended to the PILL's accessible name when the edge is drawn. The full
   * phrase, because an edge has no text at all: a sighted reader gets the rule
   * and the figure below it, and this is everything a reader without the rule
   * would otherwise miss.
   *
   * Deliberately NOT `deckVersioningCopy.pending.label` ("Pending changes: not
   * yet a version") — that is a banner heading and reads as one. This is an
   * element's name.
   */
  markAria: "pending changes, not yet a version",

  /**
   * Appended to a tile's or a row's existing accessible name, which already
   * states name, identity, status, count and detail in that order. It follows
   * the STATUS, because that is where the mark is drawn.
   */
  cardAriaSuffix: "pending changes",

  /**
   * The deck tile's detail-row figure — the banner's own string rather than a
   * second phrasing of one fact. Stated here so nobody writes a third one.
   */
  detail: deckVersioningCopy.pending.since,

  /** The phase, in words. */
  phase: {
    /**
     * Drawn on the DECK PAGE only, beside the existing `Commit as v1` offer: a
     * grid teaches the hollow plate by contrast and a single deck page has no
     * grid. Never in a tile's detail row — that slot holds `31 to buy ·
     * $284.10`, which is the figure a plan is opened to see.
     */
    notCommitted: "Not committed yet",
    /** The pill's accessible-name suffix on every surface that draws a plan. */
    markAria: "not committed yet",
  },

  /**
   * The filter facet: one heading, two rows.
   *
   * The rows carry per-row counts in the wide form, like Status and Last played
   * beside them — `FilterPanel`'s `showCounts` defaults true and `/decks`
   * passes nothing to any of its three panels. An earlier draft of this note
   * said "no counts", taking the handoff's line about the HEADING carrying no
   * figure to mean the rows carried none either; suppressing them on one
   * heading of three would be the inconsistency, not the fix.
   */
  filter: {
    heading: "Deck state",
    /** The phase: no v1 at all. */
    notCommitted: "Not committed yet",
    /**
     * The diff: a committed deck that differs from its version. Mutually
     * exclusive with the row above, so ticking both returns every deck that is
     * not settled — a legal and useful read rather than a contradiction.
     */
    hasPending: "Has pending changes",
  },
} as const;
