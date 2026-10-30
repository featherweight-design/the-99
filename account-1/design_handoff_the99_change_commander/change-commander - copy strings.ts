// change-commander · copy strings (R1). Proposed home: src/lib/copy/change-commander.ts.
// Vocabulary: "commander", "pair", "leads", "command zone". Never "score", "match", "fit %".

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const changeCommanderCopy = {
  door: { single: "Change commander", pair: "Change pair", aria: "Change commander", menu: "Edit deck" },

  sheet: {
    title: { single: "Change commander", pair: "Change pair" },
    lede: {
      single: "Commanders who can lead these 99 without changing a card. The figure is how many of this deck's cards their decks run.",
      pair: "Pairs who can lead these 98 without changing a card. The figure is how many of this deck's cards their decks run.",
    },
    counted: (n: number) =>
      `${n} of your cards are counted. Basic lands and the staples every deck runs, like Sol Ring, are left out.`,
    groupYours: (n: number) => `Yours · ${n}`,
    groupBuy: (n: number) => `To buy · ${n}`,
    ownsNone: "You own none of them yet.",
    more: (step: number) => `Show ${step} more`,
    moreLeft: (n: number) => `${n} left`,
    // The one figure. "its" for a single, "their" for a pair.
    figure: (n: number, of: number, pair: boolean) => `${n} of ${of} are in ${pair ? "their" : "its"} decks`,
    figureAria: (n: number, of: number, name: string) => `${n} of ${of} cards in this deck are in ${name}'s decks. Show them.`,
    noData: "no deck data",
    // Hugh, 2026-09-25: the cost is drawn as CostPips; this is the comparison beside it. A pair sums its halves.
    manaValueRel: (mv: number, current: number, currentName: string) => {
      const d = mv - current;
      return `(${d === 0 ? "same as" : d < 0 ? `${-d} less than` : `${d} more than`} ${currentName})`;
    },
    free: "free",
    inDeck: "in this deck · trades places",
    choose: "Choose",
    chooseAria: (name: string) => `Choose ${name}`,
    expandCaption: (n: number, short: string) => `The ${n} ${short}'s decks run`,
    loading: "Reading which commanders' decks run your cards…",
    // The Analysis tab's error composition (2c): heading + body + bone Try again.
    failed: { heading: "We could not read the candidates.", body: "Nothing about your deck changed.", cta: "Try again" },
    none: {
      head: (identity: string) => `No other commander leads a ${identity} deck yet.`,
      body: "Only commanders in exactly this deck's colors are offered, so the 99 never change. A wider or narrower identity would mean cutting cards, which is a new deck.",
    },
    nonePair: {
      head: "No other pair shares these four colors.", // "{n} colors" from the identity's size
      body: "Only pairs whose two identities add up to exactly this deck's are offered, so the 98 never change. When the index sees a new legal pairing in these colors, it shows up here.",
    },
  },

  confirm: {
    back: "← All candidates",
    backList: "Back to the list",
    out: "Leaves the deck", outPair: "Leave the deck",
    in: "Leads the deck", inPair: "Lead the deck",
    tradeOut: "Moves into the 99", tradeIn: "Moves to the command zone",
    sentence: (nu: string, old: string, body: number) =>
      `${nu} takes the command zone. ${old} leaves the deck, and the ${body} stay exactly as they are.`,
    sentencePair: (a: string, b: string, c: string, d: string, body: number) =>
      `${a} and ${b} take the command zone. ${c} and ${d} leave the deck, and the ${body} stay exactly as they are.`,
    trade: (nu: string, old: string, body: number) =>
      `The two trade places. ${nu} leaves the ${body} for the command zone, and ${old} takes its slot. The deck stays at ${body}.`,
    buy: (short: string) => `You don't own ${short} yet. It joins this draft's buy list:`,
    lands: (oldShort: string) => `Lands in your pending changes, not yet a version. Discard puts ${oldShort} back.`,
    landsTrade: "Lands in your pending changes, not yet a version. Discard puts both back where they were.",
    brew: "This deck has no version yet, so there is nothing to discard back to. Changing commander again is the only way back.",
    cta: (short: string) => `Make ${short} commander`,
    ctaPair: (a: string, b: string) => `Make ${a} and ${b} commanders`,
    pending: "Changing…",
    failed: (oldShort: string) => `We couldn't change the commander. ${oldShort} still leads this deck.`,
    failedRetry: "Try again",
    announced: (nu: string) => `${nu} leads this deck now. The change is pending.`,
  },

  banner: {
    hint: "commander", hintPair: "commanders",
    // Counts-mode sentence, above moneyLine.
    replaces: (nu: string, old: string) => `${nu} replaces ${old} as commander.`,
    replacesPair: (a: string, b: string, c: string, d: string) => `${a} and ${b} replace ${c} and ${d} as commanders.`,
    // name: deckVersioningCopy.history.commanderChange(from, to); pairs via commanderPair.
    fromZone: "from the command zone", toZone: "to the command zone",
  },

  review: {
    heading: "Commander", headingPair: "Commanders",
    was: "was", now: "now",
    notePool: (oldShort: string) => `${oldShort} goes back in the pool when you commit`,
    notePoolPair: (a: string, b: string) => `${a} and ${b} go back in the pool when you commit`,
    noteTrade: "the two trade places",
  },

  discard: {
    // Appended to deckVersioningCopy.discard.consequence's head when the draft holds a commander change.
    commanderBack: (oldShort: string) => `${oldShort} leads it again.`,
  },
} as const;

export { plural };
