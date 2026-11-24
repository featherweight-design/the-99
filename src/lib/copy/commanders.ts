// Commanders copy — wording transcribed from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Commanders.
// The degraded/EDHREC-offline banner is deliberately absent: the handoff ships
// it as the counter-example showing where character is NOT allowed. Its copy
// stays where it is, straight, in degraded-banner.tsx — as does the separate
// "EDHREC doesn't track this commander" note on rec-card.tsx / detail.tsx.

export const commandersCopy = {
  /** The ninety-nine as a numeral, the round mark on the empty ranks and the guided banner. */
  numeral: "XCIX",
  /**
   * `/commanders` at zero cards, the no-collection entry's (Open 7): one button to /collection, where every way in is.
   */
  noCards: {
    title: "Nothing to rank yet",
    body: "We rank commanders from the cards you own. Add some and every one you can build shows up here.",
    button: "Add your cards",
  },
  /** `/commanders` when the collection was scanned and no card can lead. */
  emptyRanks: {
    title: "No commanders in the ranks, yet",
    bodyMobile: (cardsRead: string) =>
      `We scanned all ${cardsRead} cards and none can helm a legal 99 on their own. Add a legendary creature and they’ll show up here.`,
    bodyDesktop: (cardsRead: string) =>
      `We scanned all ${cardsRead} cards and none can helm a legal 99 on their own. Add a legendary creature, or a planeswalker that can command, and they’ll appear here, ranked.`,
    addCards: "Add more cards",
    viewCollection: "View collection",
    retry: "Retry",
  },
  /** The degraded banner's synergy variant. */
  degradedSynergy: {
    heading: "Synergy data unavailable",
    retryNow: "Retry now",
  },
  /** A commander page's Pool section. */
  pool: {
    heading: "The Pool",
    size: (n: number) => `${n} card${n === 1 ? "" : "s"} fit this identity`,
    caption: (name: string) =>
      `Cards from your collection that fit within ${name}’s color identity and could slot into the 99.`,
  },
  /** A commander page's synergy section. */
  synergy: {
    heading: "EDHREC Synergy",
    hidden: "Synergy receipts hidden: EDHREC data unavailable",
    fitBarNone: "Synergy —",
    owned: (owned: number, total: number) => `${owned} / ${total} owned`,
    pctOwned: (pct: number) => `${pct}% owned`,
    ofTop: (total: number) => `of top ${total}`,
  },
  /** The ranking's reveal control and its end line. */
  reveal: {
    more: (step: number) => `Show ${step} more`,
    remaining: (n: number) => `${n.toLocaleString("en-US")} remaining`,
    moreAria: (step: number, remaining: number) =>
      `Show ${step} more commanders, ${remaining.toLocaleString("en-US")} remaining`,
    end: (total: number) => `End of ranking · ${total.toLocaleString("en-US")}`,
  },
  /** The first-run guide's banner on the commanders page. */
  guidedBanner: {
    step: "Step 2 of 3",
    setupCrumb: "Guided setup · step 2 of 3",
    reviewTitle: "Review your commanders",
    meetTitle: "Meet your commanders",
  },
  filteredEmpty: {
    heading: (guild: string) => `No generals in ${guild}.`,
    // Number agreement runs the whole clause, not just the noun: at one
    // candidate the pronoun and the verb have to move as well, or the line
    // reads "You own 1 legal commander, but none of them are white-red."
    caption: (colorWords: string, total: number) =>
      total === 1
        ? `You own 1 legal commander, but it is not ${colorWords}.`
        : `You own ${total} legal commanders, but none of them are ${colorWords}.`,
    count: (total: number) => `Showing 0 of ${total}`,
    cta: "Clear color filter",
  },
  firstRun: {
    // The locale is pinned: an unpinned toLocaleString() renders "1.418" or
    // "1 418" under a European locale, and these strings are verbatim.
    line: (cardsRead: number, candidates: number) =>
      `${cardsRead.toLocaleString("en-US")} card${cardsRead === 1 ? "" : "s"} read. ${candidates.toLocaleString("en-US")} can lead. I ranked ${
        candidates === 1 ? "it" : "them"
      }. You’re welcome.`,
    // Not from the mock. The mock wrote this line for a crumb row; here it sits
    // in the guided-setup banner, whose job is to say what to do next. The v1
    // body it replaces carried this instruction, and the mock line carries no
    // directive — dropping it would leave step 2 of 3 with nothing to act on.
    directive: "Pick a commander to build your first 99.",
  },
} as const;
