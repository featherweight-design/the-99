// The copy of collection editing, behind COLLECTION_EDIT_ENABLED (collection screens plan).
// This PR carries the head's entry and the Add cards sheet; later PRs add their own blocks.
// Strings are the handoff's `collection-edit · copy strings.ts`, adopted as drawn. Counts are
// pinned to en-US like the place head, so a server render and a browser agree.

const n = (x: number) => x.toLocaleString("en-US");
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);

export const collectionEditCopy = {
  head: {
    add: "Add cards",
    /** The phone strip's trailing slot, where the longer label does not fit beside four tabs. */
    addShort: "Add",
  },
  add: {
    title: "Add cards",
    closeAria: "Close",
    searchPlaceholder: "Search any card by name",
    searchAria: "Search any card by name",
    resultsAria: "Cards matching your search",
    emptyBody:
      "Search every card, not just ones you own. Pick one and it goes on the list below. Set its printing, foil and how many, then keep going.",
    emptyBodyPhone:
      "Search every card, not just ones you own. Pick one and it goes on the list. Nothing is saved until you press Save.",
    emptyNote: "Nothing is saved until you press Save.",
    nothingYet: "Nothing on the list yet",
    uploadLead: "Have a file?",
    uploadInstead: "Upload it instead",
    noResultsTitle: (q: string) => `No card is named “${q}”`,
    noResultsBody: "Check the spelling, or try part of the name. Tokens and emblems aren't in the catalog.",
    searchFailed: "We couldn't search just now. Check your connection and try again.",
    resultAdd: "↵ add",
    listHeading: (k: number) => `On the list · ${n(k)}`,
    newestFirst: "newest first",
    choosePrinting: "Choose a printing",
    needsPrinting: (card: string) => `Choose ${card}'s printing first`,
    afterPrinting: "Foil and how many come next, once it's chosen.",
    printingChipAria: (card: string, printing: string) => `${card}, printing ${printing}. Change it.`,
    foil: "Foil",
    etched: "Etched",
    noFoil: "no foil printing",
    fewer: "Fewer",
    more: "More",
    countAria: (card: string) => `How many ${card}`,
    removeLineAria: (card: string) => `Take ${card} off the list`,
    owned: (have: number, after: number) => `you own ×${n(have)} → ×${n(after)}`,
    ownedElsewhere: (have: number) => `you own ×${n(have)} in other printings`,
    newToYou: "new to you",
    combined: (card: string, q: number) => `${card} was already on the list · now ×${n(q)}`,
    summary: (lines: number, c: number) => `${n(lines)} ${lines === 1 ? "line" : "lines"} · ${copies(c)}`,
    save: (c: number) => `Save ${copies(c)}`,
    saving: "Saving…",
    retry: "Try again",
    discardTitle: (k: number) => `Discard ${n(k)} ${k === 1 ? "card" : "cards"}?`,
    discardBody: "They're not saved yet. Close now and the list is gone.",
    discard: "Discard",
    keep: "Keep adding",
    savedTitle: (c: number) => `${copies(c)} added`,
    savedBody: (k: number) => `${n(k)} ${k === 1 ? "card is" : "cards are"} in your collection now.`,
    countsAfter: (from: number, to: number) => `${n(from)} → ${n(to)} cards`,
    addMore: "Add more",
    done: "Done",
    failed: "Nothing was saved. Your list is still here. Try again in a moment.",
    printingsFailed: "We couldn't load that card's printings. Try picking it again.",
    announceChoose: (card: string, k: number) => `${card}: choose a printing. ${n(k)} printings.`,
    announceAdded: (card: string) => `${card} added to the list`,
    announceSaved: (c: number) => `${copies(c)} added to your collection`,
    /** The required printing step (B4a/B4m). */
    choose: {
      intro: (k: number) => `Which printing are you adding? ${n(k)} printings.`,
      introPhone: (k: number) => `Which printing? ${n(k)} printings.`,
      regionLabel: "Printings",
      searchPlaceholder: "Set, code or number",
      searchAria: "Search this card's printings by set, code or number",
      emptyBody: (q: string, card: string) => `No printing of ${card} comes from a set matching “${q}”.`,
      tileOwned: (q: number) => `you own ×${n(q)}`,
    },
  },
} as const;
