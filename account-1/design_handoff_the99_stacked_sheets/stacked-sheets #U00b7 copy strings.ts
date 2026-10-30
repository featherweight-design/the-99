// Stacked sheets on the phone. PLACEHOLDERS, owed to /copy-review.
// Target: lib/copy/card-carousel.ts → cardSheetCopy.back (new block). Each opener passes its label as backLabel.

export const stackedSheetCopy = {
  back: {
    // Visible pill: "← {label}". The arrow is a glyph, aria-hidden.
    a11y: (label: string) => `Back to ${label}`, // = the shipped phone ✕ label, now visible

    labels: {
      receipt: (finding: string) => finding, // e.g. "Game changers"; the finding's own label
      upgradePath: "What would have to go", // = analysisTabCopy.sheets.upgradePath. Phone only; desktop keeps ← {target}
      reasoning: (title: string) => title, // shipped, e.g. "How we determined bracket 4"
      synopsis: "Synopsis", // shipped
      standIns: "Cheaper stand-ins", // shipped
      pullSource: "Which deck to pull from", // NEW. Not the title "Pull {card} from" (reads unfinished), not "Pull it" (reads as an action)
      card: (name: string) => name, // a list sheet over a card, e.g. "Plateau"
    },
  },

  take: {
    // Teaser foot row. Shipped label; moves from the footer.
    label: (card: string) => `Take ${card}`,
    // One line above the row, in the oracle's third line. The shipped footer's "· 3 of 4" is dropped (the counter says it).
    inPlaceOf: (card: string) => `in place of ${card}`,
  },
} as const;
