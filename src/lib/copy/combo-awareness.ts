/**
 * src/lib/copy/combo-awareness.ts — combo awareness (sub-project 3), the three states.
 *
 * Transcribed verbatim from `design/design_handoff_the99_combo_awareness/
 * combo-awareness · copy strings.ts`. Round 1 (the card mark) owns `cardMarkCopy` and Round 2
 * owns the lemniscate's key entry and its fact name; this block owns only the sentences.
 *
 * Two clause strings, and the reason there are only two: states 2 and 3 differ by ownership of
 * the row's card, which every host already draws with the shipped `OwnershipDot` and `BuyTag`.
 *
 * BOUNDED BY CONSTRUCTION. Detection excludes template-gated variants by design, so nothing
 * here may carry a count, a definite article, or a deck-level total. Naming one partner is
 * true whether or not there are others — which is why `4 combos`, `with X +1` and
 * `the combo with X` were all refused, and are recorded at the foot of the handoff's own copy
 * file so they are not reinvented.
 */

export const comboAwarenessCopy = {
  /** The inline clause. `partner` is the card's printed name, never truncated in the string. */
  clause: {
    /** State 1 — both halves owned, neither assembled into a deck. `/collection` only. */
    ownBoth: (partner: string) => `with ${partner} — you own both`,
    /** State 1 at 390px and on the collection tile: the app's words shorten, the card's name
     *  does not. */
    ownBothShort: (partner: string) => `with ${partner} — both yours`,
    /** States 2 and 3, identically. `completes` presupposes the partner is in the deck. */
    completes: (partner: string) => `completes with ${partner}`,
  },

  /**
   * Screen-reader clauses. The glyph is `aria-hidden` and the visible text is composed into
   * the host's own accessible name, so these are what is actually spoken — once, in the place
   * that surface put it.
   */
  a11y: {
    ownBoth: (partner: string) => `two-card combo with ${partner}, and you own both`,
    completes: (partner: string) => `completes a two-card combo with ${partner}`,
  },
} as const;
