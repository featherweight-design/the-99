// H31 — card rows on the Versions tab. Additions to `deckVersioningCopy.history`.
// Placeholders until /copy-review.

export const versionRowsCopy = {
  history: {
    // RETIRED: diffNote "this is what the deck was, not what it needs".
    // Above the columns, both widths; only when In has rows.
    todayNote: (version: number) => `ownership and prices are today’s, not v${version}’s`,
    // After the name on a partly owned In row. Counts against the version's `to`.
    partialOwned: (owned: number, asked: number) => `own ${owned} of ${asked}`,
    // The row's accessible description in place of "Owned" on that row.
    partialA11y: (owned: number, asked: number) =>
      `You own ${owned} of the ${asked} this version runs`,
    // Unchanged words, reused from the decklist row: "Owned" / "Not owned".
  },
};

// About · `versions` entry — NO EDIT REQUIRED. Optional bullet, Hugh's call:
export const aboutVersionsOptionalBullet =
  "an opened version marks which of its cards you own today, and prices the rest at today’s price.";
