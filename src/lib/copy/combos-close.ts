/**
 * src/lib/copy/combos-close.ts — combos one piece away (UI-1: the deck page's segment and the
 * list sheet).
 *
 * Transcribed from `design/design_handoff_the99_combos_close/` (`Deck-Page.dc.html`,
 * `The-List.dc.html`). Every string is a placeholder for `/copy-review`.
 */

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export const combosCloseCopy = {
  /** The status line's segment: `∞ 5 combos one piece away ›`. Never drawn at zero. */
  segment: (n: number) => `${count(n, "combo", "combos")} one piece away`,
  /** The segment's caret, after the words. */
  caret: "›",

  sheet: {
    eyebrow: "One piece away",
    title: (n: number) => count(n, "combo", "combos"),
    lead: (n: number, deckName: string) =>
      n === 1
        ? `It needs one more card in ${deckName}. Here’s where that card is.`
        : `Each needs one more card in ${deckName}. Here’s where that card is.`,
    closeAria: "Close combos one piece away",
    done: "Done",
    groups: {
      own: "You own it",
      buy: "To buy",
    },
    /** The turn-again mark's tooltip on a combo that loops turns (the app's phrase: "a loop of extra turns"). */
    loopMark: "This combo makes a loop of extra turns.",
    /** `with {held piece}`. */
    with: "with",
    /** After a held piece that is one of the deck's commanders. */
    commander: "commander",
    where: {
      spare: "spare in your collection",
      /** `in {deck}`, the deck's name a link. */
      inDeck: "in",
      /** A copy held elsewhere whose deck the read did not name. */
      inAnotherDeck: "in another deck",
      /** More decks hold a copy than the row names. */
      more: (n: number) => `+${n}`,
      deckLinkAria: (deckName: string) => `Open the ${deckName} deck`,
    },
    foot: "From Commander Spellbook. Two-card combos legal in this deck’s colors.",
  },
} as const;
