// Finding the tools R4: every NEW or CHANGED string (placeholders for /copy-review). Shipped strings are reused as named.
export const findADeckCalloutCopy = {
  eyebrow: "Find a deck",
  title: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck`,
  bodyAll: "See which of your decks each one could go in.",
  show: "Show them",
  bodyFree: "Press Find a deck under a card to see which of your decks it fits.",
  // R3, the row view: from md the button carries the word; on a phone the line draws the glyph between lead and rest.
  bodyFreeRows: "Press Find a deck beside a card to see which of your decks it fits.",
  bodyFreeRowsPhone: { lead: "Press", rest: "beside a card to see which of your decks it fits." },
  dismiss: "Dismiss", // = welcomeCreditsCopy.strip.dismiss (accessible name of the bare ✕)
  button: "Find a deck", // = swapToolsCopy.fits title
  buttonAria: (card: string) => `Find a deck for ${card}`, // = swapToolsCopy.fits.calloutAria
};

// R3: Ask (replaces R2's whatYouCanDoCopy). Tool names, lines and costs are the shipped showcaseCopy.tools and hub costs.
export const askCopy = {
  placeholder: "Search cards, or ask a question", // replaces cardSearchCopy.label as placeholder and field name
  starters: {
    heading: "Not sure where to go? Ask",
    questions: ["Where can my spare cards go?", "How do I make my deck better?", "What can I build with my cards?", "What should I buy next?"],
  },
  tools: { heading: "Tools for this" },
  yours: { spares: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck` },
  noCards: "No card names match.",
  noTool: { title: "Nothing here answers that yet", body: "Try one of these, or search a card by name.", about: "Every tool, in About" },
  // R4: Home draws the field and the starters with no heading (the field names itself).
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

// R5: Home's search panel.
export const homeSearchCopy = {
  title: "Not sure where to go?",
  line: "Ask a question, or look up any card.",
};
