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

/**
 * The words before the partner name in `completes`. A module constant rather than a field
 * read back off `comboAwarenessCopy` while that object is still being inferred: the
 * self-reference typechecks today, but it is the shape that produces TS7022 the moment
 * anything else in the object gains an inferred dependency on it, and it costs nothing to
 * avoid.
 */
const COMPLETES_LEAD = 'completes with ';

export const comboAwarenessCopy = {
  /**
   * THE WORD THE GLYPH CANNOT SAY.
   *
   * A glyph identifies and cannot teach, so something on the surface has to say the word —
   * the rule `collection-mark-key.tsx` states, and the one the deck-status marks were
   * retired in a day for breaking. Neither clause sentence contains "combo", so without this
   * the lemniscate debuts on `/collection` unglossed.
   *
   * `Two-card combo` is Design's own noun for this, taken from the modal block's heading
   * (`Two-card combos`) in this round's copy file rather than coined here. ROUND 2 OWNS THE
   * LEMNISCATE'S FACT NAME and may land a different one; when it does, this follows it and
   * the key entry moves to `CARD_FACTS` with the rest.
   */
  keyWord: 'Two-card combo',

  /** The inline clause. `partner` is the card's printed name, never truncated in the string. */
  clause: {
    /** State 1 — both halves owned, neither assembled into a deck. `/collection` only. */
    ownBoth: (partner: string) => `with ${partner} — you own both`,
    /** State 1 at 390px and on the collection tile: the app's words shorten, the card's name
     *  does not. */
    ownBothShort: (partner: string) => `with ${partner} — both yours`,
    /**
     * The words BEFORE the partner name in `completes`, exported so a host can shrink them
     * separately and leave the name standing.
     *
     * The design's rule is that the clause ellipses and the partner name is the LAST thing to
     * go — and on this sentence the name is at the END, so plain end-truncation eats exactly
     * the word a reader cannot reconstruct. Splitting the sentence in the COMPONENT would put
     * sentence assembly outside this module, which is how quoted copy drifts from it; keeping
     * the lead here and composing `completes` FROM it means there is still one source and the
     * two cannot disagree.
     */
    completesLead: COMPLETES_LEAD,
    /** States 2 and 3, identically. `completes` presupposes the partner is in the deck. */
    completes: (partner: string) => `${COMPLETES_LEAD}${partner}`,
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
