/**
 * src/lib/copy/combo-awareness.ts — combo awareness (sub-project 3), the three states.
 *
 * Transcribed from `design/design_handoff_the99_combo_awareness/combo-awareness · copy
 * strings.ts`, with ONE DEPARTURE: the handoff's `completes with ${partner}` is gone. Hugh ruled
 * on 2026-09-22 that states 2 and 3 draw the lemniscate and the partner's name with no words
 * (errata §6), so `clause` carries `ownBoth` alone and the sentence survives only as what a
 * screen reader hears, `a11y.completes`. Round 1 (the card mark) owns `cardMarkCopy` and Round 2
 * owns the lemniscate's key entry and its fact name; this block owns only the sentences.
 *
 * States 2 and 3 share one rendering: they differ by ownership of the row's card, which every
 * host already draws with the shipped `OwnershipDot` and `BuyTag`.
 *
 * BOUNDED BY CONSTRUCTION. Detection excludes template-gated variants by design, so nothing
 * here may carry a count, a definite article, or a deck-level total. Naming one partner is
 * true whether or not there are others — which is why `4 combos`, `with X +1` and
 * `the combo with X` were all refused, and are recorded at the foot of the handoff's own copy
 * file so they are not reinvented.
 */

/**
 * The modal line's lead. A module constant rather than a field read back off
 * `comboAwarenessCopy` while that object is still being inferred: the self-reference
 * typechecks today, but it is the shape that produces TS7022 the moment anything else in the
 * object gains an inferred dependency on it, and it costs nothing to avoid.
 */
const MODAL_LINE_LEAD = 'with ';

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
    ownBoth: (partner: string) => `with ${partner}, you own both`,
    /**
     * States 2 and 3 have NO words: the clause is the lemniscate and the partner's name.
     * Hugh, 2026-09-22 — `completes with` truncated to `completes wi…` and `complete…` on
     * the hosts it was drawn on, ahead of the name it existed to introduce. What a screen
     * reader hears is `a11y.completes`, and the glyph's gloss is `keyWord`.
     */
  },

  /**
   * `/collection` — the marker's hover tooltip, in the Game Changer register: "This card is on
   * the Game Changer list." Sentence case, full stop, not mono.
   *
   * Pointer-fine only. On touch there is no tooltip and the row's own tap opens the modal,
   * which is the behaviour the bolt already has.
   */
  markerTooltip: {
    /** State 1, one partner. */
    ownBoth: (partner: string) => `Two-card combo with ${partner}. You own both.`,
    /**
     * Several partners — a count of what the tooltip is NOT naming, never of what exists.
     *
     * SINGULAR AT ONE. The handoff's string is `and ${others} others` unconditionally, which
     * emits `and 1 others` for a card with exactly two partners — and two partners is the
     * common shape, not an edge: the median piece has two. Corrected here and flagged to
     * Design rather than left to ship.
     */
    ownBothMore: (partner: string, others: number) =>
      `Two-card combo with ${partner}, and ${others} ${others === 1 ? "other" : "others"}.`,
    /**
     * States 2 and 3 — the hover on the clause's lemniscate, now that the clause draws no
     * words (errata §6). Hugh, 2026-09-22: the glyph gets the tooltip the other marks have.
     * The words are `a11y.completes` sentence-cased and stopped, in this block's register, so
     * the eye on hover and the ear read the same sentence rather than two paraphrases.
     */
    completes: (partner: string) => `Completes a two-card combo with ${partner}.`,
  },

  /** The card modal's block — the ONE surface in this feature that enumerates. */
  modal: {
    heading: 'Two-card combos',
    /**
     * Deck-scoped only, and it takes over from the counts on the open header rather than
     * adding a line — so the block gains no chrome by opening.
     *
     * A combo is a PAIR fact, so this block alone among the modal's reads differently
     * depending on where it was opened from: opened from a deck a partner can be
     * `in this deck`, and opened from `/collection` that sentence has no referent. The scope
     * line is what makes that visible instead of looking like an inconsistency.
     */
    scope: (deckName: string) => `against ${deckName}`,
    /**
     * One line per detected partner. Ordered: inDeck, then owned, then unowned.
     *
     * `lineLead` is exported because the addendum sets the two halves in DIFFERENT type: the
     * words at `--fg-body`, the partner's name at weight 600 in `--fg`. Composing `line` from
     * it keeps one source, so the sentence and its parts cannot disagree.
     */
    lineLead: MODAL_LINE_LEAD,
    line: (partner: string) => `${MODAL_LINE_LEAD}${partner}`,
    state: {
      inDeck: 'in this deck',
      owned: 'you own it',
      notOwned: "you don't own it",
    },
    /**
     * The closed row's summary. The block is closed by default at EVERY count, so this is what
     * most readers ever see — and it is the one place in this feature a count is legal: it
     * describes this list, not what exists. The same licence `+N more` had.
     *
     *   `1 in this deck · 1 you own · 4 you don’t`
     *
     * A state with a count of zero is omitted entirely: `4 you don’t` alone, or
     * `1 in this deck · 4 you don’t` — never `0 you own`.
     */
    summary: {
      inDeck: (n: number) => `${n} in this deck`,
      owned: (n: number) => `${n} you own`,
      notOwned: (n: number) => `${n} you don’t`,
      join: ' · ',
    },
    /** The closed row is a button; its name is the label plus the counts as words. */
    toggleAria: (summarySpoken: string) => `Two-card combos, ${summarySpoken}`,
    /** The shipped disclosure's own collapse word, so a toggle never announces one state
     *  while offering the other. */
    collapse: 'Show fewer',
    /**
     * THE DETECTION BOUND, said once, behind the heading's marker rather than printed under
     * every block — a caveat that repeats that often stops being read, which is the opposite
     * of what a caveat is for.
     *
     * It is also why the heading carries no count: `+8 more` is a fact about what is HIDDEN,
     * where `Two-card combos · 14` would be a claim about what exists, and detection excludes
     * template-gated variants by design.
     */
    boundMarkerAria: 'About this list',
    qualifier:
      'From Commander Spellbook. Combos needing a third piece are not listed.',
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
