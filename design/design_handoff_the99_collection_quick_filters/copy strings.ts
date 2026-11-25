// Collection quick filters R2: the UI's own strings, verbatim from the boards. For src/lib/copy/.
// Mark names reuse the key's words where they exist (cardFactName, comboAwarenessCopy, foilMarkCopy); chip labels are plural.
export const quickFilterCopy = {
  lead: "Quick:",
  chips: {
    free: "In no deck",
    combos: "Two-card combos",
    gameChanger: "Game changers",
    tutor: "Tutors",
    extraTurns: "Extra turns",
    massLandDenial: "Mass land denial",
    foil: "Foil",
  },
  chipAria: (label: string, n: number, on: boolean) => `${label}, ${n}. ${on ? "On. Press to turn off." : "Press to show only these."}`,
  combos: {
    ownBoth: "You own both",
    ownOne: "You own one",
    ownBothLine: "Two-card combos where both cards are in your collection.",
    ownOneLine: "Combos you are one card away from, and what the missing card costs.",
    newTag: "NEW",
    inNoDeck: "In no deck together",
    bothIn: (deck: string) => `Both in ${deck}`,
    missing: (card: string) => `Missing ${card}`,
    notOwned: "not owned",
    findADeck: "Find a deck",
    addToWishlist: "Add to wishlist",
    howItWorks: "How it works",
    result: (n: number) => `${n} ${n === 1 ? "combo" : "combos"}`,
    emptyBoth: "No two-card combos with both cards in your collection yet.",
    emptyOne: "No combos one card away.",
  },
};
