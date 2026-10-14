// Commanders copy — wording transcribed from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Commanders.
// The degraded/EDHREC-offline banner is deliberately absent: the handoff ships
// it as the counter-example showing where character is NOT allowed. Its copy
// stays where it is, straight, in degraded-banner.tsx — as does the separate
// "EDHREC doesn't track this commander" note on rec-card.tsx / detail.tsx.

export const commandersCopy = {
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
      }. You're welcome.`,
    // Not from the mock. The mock wrote this line for a crumb row; here it sits
    // in the guided-setup banner, whose job is to say what to do next. The v1
    // body it replaces carried this instruction, and the mock line carries no
    // directive — dropping it would leave step 2 of 3 with nothing to act on.
    directive: "Pick a commander to build your first 99.",
  },
} as const;
