// SUPERSEDED 2026-09-19 by R5 — see `to-build · copy strings.ts` in this folder.
// Every string below names one of the two deck-state marks, and both marks are
// retired: they were the only wordless signals in the deck list, and the plate
// measured ~39 near-neutral units against `Building`. What replaces them is a
// seventh STATUS VALUE, `To build`, which needs one label in
// `refreshCopy.status` and nothing else. Kept as the record.

/**
 * #### R4 — TWO marks, two axes, one box.
 *
 * The PLATE is the primary mark and answers "is this deck real": a deck with a
 * committed v1 keeps the status token's tint; a deck with no v1 at all — a plan
 * — takes `--bg`, the colour the tint was already mixing into, at 0%. Hollow,
 * but fully OPAQUE, because the art-wash amendment rules this plate opaque and
 * the mobile spine puts it on a wash.
 *
 * The 2px `--fg` LEFT RULE is the secondary mark and answers "does this real
 * deck differ from its version". It requires a version, so it and the hollow
 * plate are mutually exclusive by definition — no deck can show both.
 *
 * Neither is a `StatusPill` member and neither has a `refreshCopy.status` key:
 * the pill answers the count question and these answer two others.
 * `STATUS_ORDER`, `STATUS_COPY_KEY` and `statusPill()` are untouched, and the
 * six labels stay exactly as `refreshCopy.status` writes them — Title case,
 * `To buy` with a lower-case b.
 *
 * The rule's colour is `--fg`, not `--accent`: `STATUS_TOKEN["To buy"]` IS
 * `--accent`, so an accent rule collides with that one pill by construction in
 * every theme. `--fg` is the only ink in the palette that is not a status token.
 *
 * The visible word is `pending`, not the review page's `deck in draft`: that tag
 * says *deck* and sits beside a CARD name, which is what retired a bare
 * `pending` there. Here the subject is the deck and the mark sits against the
 * deck's own status.
 */

export const pendingMarkCopy = {
  /**
   * RETIRED as visible copy (R2). The mark is a 2px `--accent` left rule on the
   * status pill rather than a second chip, so there is no element to put this
   * word in: the pill's own label is the status, and the detail row below states
   * the change count in words. The word survives in `markAria` and as the
   * filter row's label.
   */

  /**
   * Appended to the PILL's accessible name, because the mark is now the pill's
   * own left edge (2px `--fg`). The full phrase, because an edge has no text at all: a
   * sighted reader gets the rule and the detail figure below it, and this is
   * everything a reader without the rule would otherwise miss.
   *
   * Deliberately NOT `deckVersioningCopy.pending.label` ("Pending changes: not
   * yet a version"): that is a BANNER heading and reads as one. This is an
   * element's name.
   */
  markAria: "pending changes, not yet a version",

  /**
   * The deck tile's detail-row figure, and it is the banner's own string rather
   * than a second phrasing of one fact — `deckVersioningCopy.pending.since` is
   * the function, called here. Stated so nobody writes a third one.
   *
   * R2 makes this the drawn WORDS of the mark rather than a supplement to a
   * chip, so it OUTRANKS the count figures while a draft is open: `2 over`
   * mid-swap is transience, not a fact to act on. `Unresolved` is the one
   * exception and keeps `2 lines unresolved` — an unnamed line is not a
   * consequence of editing.
   */
  detail: (changes: number, version: number): string =>
    `${changes} ${changes === 1 ? "change" : "changes"} since v${version}`,

  /**
   * Appended to the tile's and the row's existing accessible name, which already
   * states name, identity, status, count and detail in that order. It follows the
   * STATUS, because that is where the mark is drawn.
   *
   * Home's resume row uses this and draws no figure: it has no detail slot, and
   * its touched stamp already reads `edited 2h ago` for exactly these decks.
   */
  cardAriaSuffix: "pending changes",

  /** The filter facet. One heading, two rows, no counts — R4. */
  filter: {
    heading: "Deck state",
    /** The phase: no v1 at all. The primary mark's row. */
    notCommitted: "Not committed yet",
    /**
     * The diff: a committed deck that differs from its version. Mutually
     * exclusive with the row above — ticking both returns every unsettled deck,
     * which is a legal and useful read rather than a contradiction.
     */
    hasPending: "Has pending changes",
  },

  /**
   * The phase, in words. Drawn on the DECK PAGE only, beside the existing
   * `Commit as v1` offer: a grid teaches the hollow plate by contrast, and a
   * single deck page has no grid. Never in the tile's detail row — that slot
   * holds `31 to buy · $284.10`, which is the figure a plan is opened to see.
   */
  phase: {
    notCommitted: "Not committed yet",
    /** The pill's accessible-name suffix on every surface that draws a plan. */
    markAria: "not committed yet",
  },
} as const;

/**
 * The URL key, beside `status`, `colour`, `played` and `q`. Takes either or both
 * of `uncommitted` and `pending`, filtered into canonical order like every other
 * list param, so an unknown value is harmless.
 */
export const STATE_PARAM = "state";
export const STATE_ORDER = ["uncommitted", "pending"] as const;
