/**
 * Change commander (sub-project 7). Production copy, transcribed from the handoff's copy file
 * (`design/design_handoff_the99_change_commander/change-commander - copy strings.ts`, R1, with
 * Hugh's mana-value line of 2026-09-25).
 *
 * Vocabulary: "commander", "pair", "leads", "command zone". Never "score", "match", "fit %".
 *
 * One string the handoff carries is deliberately absent:
 *
 * - `sheet.noData` (`no deck data`). H2 (Hugh, 2026-09-25) hides a candidate whose EDHREC sample
 *   is under `MIN_CANDIDATE_DECKS`, and a candidate with no deck data is the smallest sample
 *   there is, so no row is ever drawn in that state.
 *
 * The file's `plural` helper is not carried either: no string here uses it.
 *
 * Four strings are added: `sheet.close.single` / `.pair`, the close control's name, which every
 * `ModalChrome` sheet carries and the handoff's file does not; and `sheet.groupNote` /
 * `groupNotePairBuy`, the group headings' right notes, which the canvas draws and the copy file
 * omits.
 */
export const changeCommanderCopy = {
  door: { single: "Change commander", pair: "Change pair", aria: "Change commander", menu: "Edit deck" },

  sheet: {
    title: { single: "Change commander", pair: "Change pair" },
    // Not in the handoff's file: every sheet's close control names the sheet it closes.
    close: { single: "Close change commander", pair: "Close change pair" },
    lede: {
      single: "Commanders who can lead these 99 without changing a card. The figure is how many of this deck's cards their decks run.",
      pair: "Pairs who can lead these 98 without changing a card. The figure is how many of this deck's cards their decks run.",
    },
    counted: (n: number) =>
      `${n} of your cards are counted. Basic lands and the staples every deck runs, like Sol Ring, are left out.`,
    groupYours: (n: number) => `Yours · ${n}`,
    groupBuy: (n: number) => `To buy · ${n}`,
    // From the canvas's group headings (not in the handoff's copy file): each group's right note.
    groupNote: "by figure",
    groupNotePairBuy: "a half to buy",
    ownsNone: "You own none of them yet.",
    showAll: (n: number) => `Show all ${n}`,
    showFewer: "Show fewer",
    // The one figure. "its" for a single, "their" for a pair.
    figure: (n: number, of: number, pair: boolean) => `${n} of ${of} are in ${pair ? "their" : "its"} decks`,
    figureAria: (n: number, of: number, name: string) => `${n} of ${of} cards in this deck are in ${name}'s decks. Show them.`,
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
    failed: { heading: "We couldn’t read the candidates.", body: "Nothing about your deck changed.", cta: "Try again" },
    none: {
      head: (identity: string) => `No other commander leads a ${identity} deck yet.`,
      body: "Only commanders in exactly this deck's colors are offered, so the 99 never change. A wider or narrower identity would mean cutting cards, which is a new deck.",
    },
    nonePair: {
      // The handoff's file wrote "four" with a note to take the count from the identity's size.
      head: (count: string) => `No other pair shares these ${count} colors.`,
      body: "Only pairs whose two identities add up to exactly this deck's are offered, so the 98 never change. When a new legal pairing appears in these colors, it shows up here.",
    },
  },

  confirm: {
    back: "← All candidates",
    backList: "Back to the list",
    out: "Leaves the deck", outPair: "Leave the deck",
    in: "Leads the deck", inPair: "Lead the deck",
    tradeOut: "Moves into the 99", tradeIn: "Moves to the command zone",
    // The half-trade (addendum): one new half out of the 98 while both old halves leave. Each card
    // carries a fate line; an incoming card to buy shows the shipped buy tag instead (`sheet.free`
    // for one that is free).
    outHalfTrade: "Leave the command zone",
    staysQuestion: (body: number) => `Which one stays in the ${body}?`,
    cardStays: (body: number) => `into the ${body}`,
    cardReleased: "leaves the deck",
    cardFromBody: (body: number) => `from the ${body}`,
    sentence: (nu: string, old: string, body: number) =>
      `${nu} takes the command zone. ${old} leaves the deck, and the ${body} stay exactly as they are.`,
    sentencePair: (a: string, b: string, c: string, d: string, body: number) =>
      `${a} and ${b} take the command zone. ${c} and ${d} leave the deck, and the ${body} stay exactly as they are.`,
    trade: (nu: string, old: string, body: number) =>
      `The two trade places. ${nu} leaves the ${body} for the command zone, and ${old} takes its slot. The deck stays at ${body}.`,
    buy: (short: string) => `You don't own ${short} yet. It joins this draft's buy list:`,
    lands: (oldShort: string) => `Lands in your pending changes, not yet a version. Discard puts ${oldShort} back.`,
    landsTrade: "Lands in your pending changes, not yet a version. Discard puts both back where they were.",
    // arrive: the half leaving the body; joins: the other new half; stays / released: the old halves.
    halfTrade: (arrive: string, joins: string, stays: string, released: string, body: number) =>
      `${arrive} leaves the ${body} for the command zone, and ${joins} joins it there. ${stays} takes ${arrive}'s slot, and ${released} leaves the deck. The deck stays at ${body}.`,
    // Hugh's tightening at /copy-review (2026-09-25).
    landsHalfTrade: "Lands in your pending changes, not yet a version. Discard undoes the whole swap.",
    brew: "This deck has no version yet, so there is nothing to discard back to. Changing commander again is the only way back.",
    cta: (short: string) => `Make ${short} commander`,
    ctaPair: (a: string, b: string) => `Make ${a} and ${b} commanders`,
    pending: "Changing…",
    failed: (oldShort: string) => `We couldn't change the commander. ${oldShort} still leads this deck.`,
    // The pair forms a pair reaches (audit F9: two names never share a singular verb). A pair's
    // trade is the half-trade, which has its own sentence (`halfTrade`), so `trade` has no pair form.
    failedPair: (oldShort: string) => `We couldn't change the commanders. ${oldShort} still lead this deck.`,
    failedRetry: "Try again",
    announced: (nu: string) => `${nu} leads this deck now. The change is pending.`,
    announcedPair: (nu: string) => `${nu} lead this deck now. The change is pending.`,
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
    // `Going out`'s note when its only rows are new commanders leaving the 99 for the command zone
    // (a trade): nothing in that column goes back in the pool.
    outNoteToZone: "it moves to the command zone",
    // A half-trade's two fates, one clause each; the middot is where it breaks at 390.
    noteHalfTrade: (stays: string, arrive: string, released: string) =>
      `${stays} and ${arrive} trade places · ${released} goes back in the pool when you commit`,
  },

  discard: {
    // Appended to deckVersioningCopy.discard.consequence's head when the draft holds a commander change.
    commanderBack: (oldShort: string) => `${oldShort} leads it again.`,
    // The pair form the audit owes (F9); the handoff's file carries the single only.
    commanderBackPair: (a: string, b: string) => `${a} and ${b} lead it again.`,
    // A draft that moved ONLY its commander. deckVersioningCopy.discard.consequence names the cards
    // added and cut and would lose its subject over zero of each ("3 cards.  are not stored
    // anywhere"), so this draft takes the version clause alone; `commanderBack` follows it.
    commanderOnly: (version: number, date: string, cards: number) =>
      `The deck goes back to v${version} as committed on ${date}: ${cards} ${cards === 1 ? "card" : "cards"}.`,
  },
} as const;
