/**
 * src/lib/copy/combos-close.ts — combos one piece away (UI-1: the deck page's segment and the
 * list sheet; UI-2: the combo pushed inside it).
 *
 * Transcribed from `design/design_handoff_the99_combos_close/` (`Deck-Page.dc.html`,
 * `The-List.dc.html`, `How-It-Works.dc.html`). Every string is a placeholder for `/copy-review`.
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
    /** A row's press, which opens the combo: `Searing Touch with Avatar Aang`. */
    openAria: (missing: string, held: readonly string[]) => `Open the combo: ${missing} with ${held.join(", ")}`,
  },

  /** The combo pushed inside the sheet (UI-2, `How-It-Works.dc.html`). */
  detail: {
    /** `← 5 combos`: the way back to the list, with the list's count. */
    back: (n: number) => count(n, "combo", "combos"),
    backAria: (n: number) => `Back to ${count(n, "combo", "combos")} one piece away`,
    /** The combo's name, what a card stacked on it calls it (`← Avatar Aang + Searing Touch`). */
    name: (pieces: readonly string[]) => pieces.join(" + "),
    plate: {
      /** A held piece. */
      inThisDeck: "in this deck",
      /** The missing piece, owned and unclaimed. */
      spare: "spare",
    },
    /** The foot's compact Add, bottom right. */
    add: (card: string) => `Add ${card}`,
  },

  /** Card details' combo lines (UI-3, `Card-Details.dc.html`), drawn from the near-combos read. */
  card: {
    groups: {
      /** The partner is in the deck too: the combo is whole. */
      whole: "Whole in this deck",
      /** The partner is not in the deck; the deck holds the rest. */
      oneAway: "One piece away · you hold the rest",
    },
    /** A line's press, which opens the combo over the card: `Open the combo: Polyraptor + Warstorm Surge`. */
    openAria: (card: string, partner: string) => `Open the combo: ${card} + ${partner}`,
    /** The combo sheet's way back to the card it was opened from. */
    backAria: (card: string) => `Back to ${card}`,
    /** The combo sheet's ×, which also returns to the card. */
    closeAria: "Close the combo",
  },
} as const;
