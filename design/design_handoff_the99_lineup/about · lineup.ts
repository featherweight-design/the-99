// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '04', placed after
// "Stats: the deck, drawn" (deck-stats). Placeholders until /copy-review.
// R2: renamed from Lineup (Hugh, 2026-10-11). The switch keeps its code name, LINEUP_ENABLED, until Hugh rules.
// Batches into the all-decks cart line's bump: ABOUT_VERSION 14 → 15, since 15.

export const decksStatsEntry = {
  id: "decks-stats",
  chapter: "04",
  since: 15,
  switch: "LINEUP_ENABLED", // new AboutSwitch member (brief, "The About entry owed")
  title: "Stats: your decks, side by side",
  route: "/decks",
  opens: "opens Decks, on Stats",
  caption:
    "Decks has two views, the tiles and Stats. Stats draws all your decks together: when each last played, where they sit by bracket and color, the cards they share, and how much of your collection they use.\n\nPick a deck to see it among the others. Each chart folds to one line, and every deck and card in it opens when you press it.",
  keyLines: [
    "Never-played decks are always shown, together in their own group.",
    "Collection totals count each copy you own once, even when several decks play the card.",
    "Results are as logged, with the pod size each game had.",
    "Finished only leaves brews out of the charts. Your collection still counts every copy.",
  ],
  specimen: {
    component: "SharedRow",
    state: "wanted more than owned",
    fixture: { card: "Sol Ring", decks: 20, owned: 17 },
  },
  phone: "The row's name and figure share a line and the squares wrap under. Same component at 390.",
} as const;
