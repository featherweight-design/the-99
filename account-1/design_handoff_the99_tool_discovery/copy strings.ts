// Finding the tools R2: every NEW or CHANGED string (placeholders for /copy-review). Shipped strings are reused as named.
export const findADeckCalloutCopy = {
  eyebrow: "Find a deck",
  title: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck`,
  bodyAll: "See which of your decks each one could go in.",
  show: "Show them",
  bodyFree: "Press Find a deck under a card to see which of your decks it fits.",
  dismiss: "Dismiss", // = welcomeCreditsCopy.strip.dismiss (accessible name of the bare ✕)
  button: "Find a deck", // = swapToolsCopy.fits title
  buttonAria: (card: string) => `Find a deck for ${card}`, // = swapToolsCopy.fits.calloutAria
};

export const whatYouCanDoCopy = {
  eyebrow: "What you can do",
  close: "Hide What you can do", // accessible name of the bare ✕
  free: "free",
  freeToStart: "free to start",
  spares: {
    title: "Find a home for your spare cards",
    line: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck. See which of your decks each one fits.`,
  },
  tune: {
    title: (deck: string) => `Make ${deck} better`,
    line: "Cards you own that fill what it’s short of, then swaps and cuts.",
  },
  build: { title: "Build another deck", line: "Commanders your cards can already lead, the closest first." },
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
