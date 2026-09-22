/**
 * Combo awareness — production copy.
 *
 * Round 1 (the card mark) owns `cardMarkCopy`; Round 2 owns the lemniscate's key entry and its
 * fact name. This block owns only the three states' sentences.
 *
 * Two strings, and the reason there are only two: states 2 and 3 differ by ownership of the
 * row's card, which every host already draws with the shipped OwnershipDot and BuyTag.
 *
 * Bounded by construction: detection excludes template-gated variants by design, so nothing here
 * may carry a count, a definite article, or a deck-level total. Naming one partner is true
 * whether or not there are others.
 */

export const comboAwarenessCopy = {
  /** The inline clause. `partner` is the card's printed name, never truncated in the string. */
  clause: {
    /** State 1 — both halves owned, neither assembled into a deck. /collection only. */
    ownBoth: (partner: string) => `with ${partner} — you own both`,
    /** State 1, 390px and the collection tile: the app's words shorten, the card's name does not. */
    ownBothShort: (partner: string) => `with ${partner} — both yours`,
    /** States 2 and 3, identically. `completes` presupposes the partner is in the deck. */
    completes: (partner: string) => `completes with ${partner}`,
  },

  /** The card modal's block — the one surface that enumerates. See ADDENDUM-modal-block.md. */
  modal: {
    heading: 'Two-card combos',
    /**
     * Deck-scoped only. A combo is a PAIR fact, so this block — alone among the modal's blocks —
     * reads differently depending on where the modal was opened from. The scope line is what
     * makes that visible instead of looking like an inconsistency.
     */
    scope: (deckName: string) => `against ${deckName}`,
    /** One line per detected partner. Ordered: inDeck, then owned, then unowned; popularity within. */
    line: (partner: string) => `with ${partner}`,
    state: {
      inDeck: 'in this deck',
      owned: 'you own it',
      notOwned: "you don't own it",
    },
    /** Shipped disclosure atoms. Cap is 6 desktop / 4 phone. */
    more: (n: number) => `+${n} more`,
    showAll: (n: number) => `Show all ${n}`,
    showAllAria: (n: number) => `Show all ${n} combo partners`,
    /** Per-variant link outs were withdrawn; the link is the source's own name in the tooltip. */
    spellbookAria: 'This card on Commander Spellbook, opens in a new tab',
    /** The linked words inside the qualifier. Plain text when no URL resolves. */
    spellbookLabel: 'Commander Spellbook',
    /**
     * The detection bound, said once, behind the heading's brass asterisk — tooltip on
     * pointer-fine, tap-to-disclose in place on touch. Sentence case, because it is now a
     * sentence in a tooltip rather than a mono footer.
     *
     * It is also why the heading carries no count: `+8 more` is a fact about what is hidden,
     * `Two-card combos · 14` is a claim about what exists.
     */
    boundMarkerAria: 'About this list',
    qualifier:
      'From Commander Spellbook. Combos needing a third piece are not listed.',
    /**
     * Only if eng takes Hugh's cut (unowned partners dropped from the block) — see
     * ADDENDUM-modal-block.md. One extra clause, nothing else changes.
     */
    qualifierOwnedOnly:
      'From Commander Spellbook. Combos needing a third piece, or a card you don’t own, are not listed.',
  },

  /** Screen-reader clauses. The glyph is aria-hidden; these are what is actually spoken. */
  a11y: {
    ownBoth: (partner: string) =>
      `two-card combo with ${partner}, and you own both`,
    completes: (partner: string) =>
      `completes a two-card combo with ${partner}`,
  },
} as const;

export type ComboPartnerState = 'inDeck' | 'owned' | 'notOwned';

/**
 * Refused strings, recorded so they are not reinvented:
 *
 *   `4 combos`                     — a count. Detection is bounded; a number would be the first
 *                                    thing on the surface that is not true.
 *   `with Isochron Scepter +1`     — a residual count is a completeness claim wearing a plus sign.
 *   `the combo with X`             — the definite article claims there is exactly one.
 *   `combo piece`                  — that is Round 2's fact, not this round's state.
 *   `completes a combo · $3.60`    — reads as a price for the combo; you already own the other half.
 *   `infinite with X`              — the feature name is not the player's word, and not every
 *                                    detected variant produces an infinite.
 *   `add this to go off`           — a recommendation. A mark states a fact.
 *   `Two-card combos · 14`         — a count in the heading; detection is bounded.
 *   `Two-card combos in Kykar`     — the heading must be stable across routes; the scope varies,
 *                                    so the scope is a subordinate line.
 *   `not yours`                    — withdrawn at the addendum: the other two states are written
 *                                    as sentences about the reader, and this was not.
 */
