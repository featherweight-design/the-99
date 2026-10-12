// /collection sort by price — R1. ALL PLACEHOLDER, for /copy-review.
// Figures arrive pre-formatted by formatCents (src/lib/decks/price.ts).
// `foil`, `etched` and `no stock` are NOT new: they reuse priceCopy.tag and setPageCopy.cell.

export const collectionPriceCopy = {
  // sort-options.ts
  sortLabel: "Price",
  direction: { desc: "Highest first", asc: "Lowest first" }, // PLACEHOLDER

  // Visible suffix when the copies are in different printings. Replaces the finish word.
  maxSuffix: "max", // PLACEHOLDER

  // Spoken clause appended last to the row/tile accessible name, only when sort=price.
  aria: {
    priced: (figure: string) => `${figure} at ManaPool`, // PLACEHOLDER
    mixed: (figure: string, printings: number) =>
      `${figure} at ManaPool, the most valuable of ${printings} printings`, // PLACEHOLDER
    // no stock / never stocked / no answer: reuse setPageCopy.cellPrice.soldOut / neverStocked; silent adds nothing.
  },

  // F1 — the whole price read failed.
  readFailed: "Prices didn't load, so this is A–Z.", // PLACEHOLDER
} as const;
