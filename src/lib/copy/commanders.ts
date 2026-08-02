// Commanders copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Commanders.
// The degraded/EDHREC-offline banner is deliberately absent: the handoff ships
// it as the counter-example showing where character is NOT allowed. Its copy
// stays where it is, straight, in degraded-banner.tsx — as does the separate
// "EDHREC doesn't track this commander" note on rec-card.tsx / detail.tsx.

export const commandersCopy = {
  filteredEmpty: {
    heading: (guild: string) => `No generals in ${guild}.`,
    caption: (words: string, total: number) =>
      `Your collection has opinions about ${words}. All ${total} candidates are one filter away.`,
    count: (total: number) => `Showing 0 of ${total}`,
    cta: "Clear color filter",
  },
  firstRun: {
    // The locale is pinned: an unpinned toLocaleString() renders "1.418" or
    // "1 418" under a European locale, and these strings are verbatim.
    line: (cardsRead: number, candidates: number) =>
      `${cardsRead.toLocaleString("en-US")} cards read. ${candidates.toLocaleString("en-US")} can lead. I ranked them — you're welcome.`,
    // Not from the mock. The mock wrote this line for a crumb row; here it sits
    // in the guided-setup banner, whose job is to say what to do next. The v1
    // body it replaces carried this instruction, and the mock line carries no
    // directive — dropping it would leave step 2 of 3 with nothing to act on.
    directive: "Pick one to build your first 99.",
  },
} as const;
