// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '01', placed after
// "Shopping for all your decks" (all-decks-cart). Placeholders until /copy-review.
// Batches into the all-decks cart line's bump: ABOUT_VERSION 14 → 15, since 15.

export const addedCopyEntry = {
  id: "added-copy",
  chapter: "01",
  since: 15,
  switch: "KEEP_FREE_ENABLED", // new AboutSwitch member (added-copy gap G8)
  title: "Where a new copy goes",
  route: "/collection",
  opens: "opens Add cards",
  caption:
    "When you add a card one of your decks is missing, the app says which deck gets it: on Add cards, on I got it, and after an upload. Press Change to give it to a different deck, or to keep it free.\n\nNo deck counts a copy you keep free. Decks that need the card still show it missing, and it stays on their Shopping.",
  keyLines: [
    "A finished deck that’s missing the card gets the new copy first, and the deck that committed the card earliest goes first.",
    "A brew holds a copy only once you give it one. Until then, a spare copy is free for every brew that needs it.",
    "Keep it free counts copies. Keep one free and your decks still get the rest.",
    "To use a kept copy again, press Change and deselect Keep it free, or pick a deck.",
  ],
  specimen: {
    component: "CopyLine + ContestedCardRow keep row",
    state: "goesTo + kept selected",
    fixture: { card: "Sol Ring", deck: "HD - Brago", copies: 1, keep: 1 },
  },
  phone: "The line wraps and Change stays at the right. The keep row keeps one line.",
} as const;
