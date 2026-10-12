// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '03', placed right after
// `fits-your-decks`, which stays as it is and keeps describing the free list.
// Placeholders until /copy-review. No ABOUT_VERSION bump: a switched entry is seen by id when its
// switch turns on (src/lib/about/visible.ts); `since` is the version current when it was written.

export const findADeckReadEntry = {
  id: "find-a-deck-read",
  switch: "FIND_A_DECK_READ_ENABLED", // new AboutSwitch member
  chapter: "03",
  title: "Which deck needs it most?",
  route: "/collection",
  opens: "opens the card detail",
  width: "plate",
  caption:
    "Some cards fit a dozen of your decks on paper and help two of them for real. Open “Find a deck for it” on any card and press “Which deck needs it most?” for a closer read.\n\nIt names the few decks the card actually helps, says how in each deck’s own cards, and suggests what it would replace. One press swaps it in. Handy for the niche rares that never seem to have a home.",
  keys: [
    "A read uses a credit. If it fails, finds no real fit, or too little of it holds up, the credit comes back.",
    "Every card a read names is checked against that deck’s list. A deck whose line doesn’t check out is left off.",
    "“Swap in” puts the card in the deck’s draft and takes the cut out. Press it again to undo.",
    "Reopening a read is free until one of your decks changes. Then it’s marked out of date.",
  ],
  // Specimen: one ReadRow, read-only (no Swap in), every string from copy/swap-tools.ts at render time.
  specimen: {
    component: "ReadRow",
    state: "read-only",
    fixture: { card: "Ajani Unrelenting", deck: "HD - Goblins", commander: "Krenko, Mob Boss", cut: "Skirk Prospector", plan: "overview" },
  },
  phone: "Same row at 390; the sentence rewraps and the cut line wraps its note under the card.",
  since: 14,
} as const;
