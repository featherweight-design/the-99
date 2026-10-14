// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '01', placed after
// "What the cards you’re missing cost" (route /decks). Placeholders until /copy-review.
// ABOUT_VERSION 14 → 15 with this round; batches if another round takes 15 first.

export const allDecksCartEntry = {
  id: "all-decks-cart",
  chapter: "01",
  since: 15,
  switch: "ALL_DECKS_CART_ENABLED", // new AboutSwitch member (gap G3)
  title: "Shopping for all your decks",
  route: "/decks/shopping",
  opens: "opens the cart",
  caption:
    "Several decks short of cards? Shopping for all decks puts everything they’re missing on one list, with one total and one link to Mana Pool.\n\nEach line names the decks that need the card. Deselect a deck to leave it out of this visit’s cart. Nothing in the deck changes.",
  keyLines: [
    "Every deck that’s missing cards starts selected, brews included. Finished decks aren’t listed.",
    "Each deck gets its own copy. If three decks need Sol Ring, the cart buys three and names all three decks.",
    "A card you own can still be on the list when your other decks are using every copy. The line says how many you own.",
    "When you’re back from Mana Pool, press buy on what you got, and it goes into your collection.",
  ],
  specimen: {
    component: "CartLine",
    state: "listed",
    fixture: {
      name: "Sol Ring",
      decks: ["Gishath", "Kratos", "Thorin"],
      owned: 17,
      lineCents: 387,
    },
  },
  phone: "The line keeps its order: name, decks, owned, then the tag top-right. The decks line wraps and is never truncated.",
} as const;
