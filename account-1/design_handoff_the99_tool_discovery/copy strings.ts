// Finding the tools R1: every NEW or CHANGED string (placeholders for /copy-review). Shipped strings are reused as named.
export const findADeckCalloutCopy = {
  eyebrow: "Find a deck",
  title: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck`,
  body: "Narrow to them, then press a card’s two diamonds to see which of your decks it fits.",
  dismiss: "Dismiss", // = welcomeCreditsCopy.strip.dismiss
  // The switch. Q3: if A, `availabilityCopy.collection.filterFree` becomes "In no deck" too.
  switchAria: "Show",
  all: "All ·",
  free: "In no deck ·",
  pressAria: (card: string) => `Find a deck for ${card}`, // = swapToolsCopy.fits.calloutAria
};

export const tuningTabCopy = {
  tab: "Tuning", // = tuningHubCopy.title
  tabAria: "Tuning, tools for this deck",
  consider: {
    name: "Consider", // = addPanelCopy.tabs.consider
    purpose: "Cards that fill what this deck is short of, the ones you own first.",
    cost: "free", // = tuningHubCopy.tools.mana.cost
    status: (owned: number, toBuy: number) => `${owned} you own · ${toBuy} to buy`,
    none: "nothing to consider",
  },
};

export const welcomeSheetChanges = {
  // writtenForYouCopy.rows[].where, changed:
  suggestedWhere: "A deck’s Tuning tab",
  lookDeeperWhere: "A deck’s Tuning tab",
  findADeckReadWhere: "A card in no deck",
  // The free block.
  freeLine: "Free, no credit needed",
  free: [
    { id: "consider", name: "Consider", where: "A deck’s Tuning tab", short: "free", cost: "free" },
    { id: "find-a-deck", name: "Find a deck", where: "A card in no deck", short: "free", cost: "free" },
  ],
};
