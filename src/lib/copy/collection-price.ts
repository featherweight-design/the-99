// /collection sort by price (design handoff `design_handoff_the99_collection_price`, R1).
// Figures arrive pre-formatted by `formatCents` (src/lib/decks/price.ts). `foil`, `etched` and
// `no stock` are not here: they are `priceCopy.tag` and `setPageCopy.cell`, already shipped.
export const collectionPriceCopy = {
  sortLabel: "Price",
  direction: { desc: "Highest first", asc: "Lowest first" },
  // The visible suffix when a cheaper copy is owned. Replaces the finish word on screen.
  maxSuffix: "max",
  // Spoken last in the row or tile name, and only while sorted by price.
  aria: {
    priced: (figure: string) => `${figure} at Mana Pool`,
    mixed: (figure: string) => `${figure} at Mana Pool, your most valuable copy`,
  },
  // F1: the whole price read failed, so every card is silent and the order is A to Z.
  readFailed: "Prices didn't load, so this is A–Z.",
} as const;
