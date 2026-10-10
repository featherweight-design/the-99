// The copy of collection editing, behind COLLECTION_EDIT_ENABLED (collection screens plan).
// This PR carries the head's entry and the Add cards sheet; later PRs add their own blocks.
// Strings are the handoff's `collection-edit · copy strings.ts`, adopted as drawn. Counts are
// pinned to en-US like the place head, so a server render and a browser agree.

const n = (x: number) => x.toLocaleString("en-US");
const decks = (x: number) => (x === 1 ? "a deck" : `${n(x)} decks`);
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);

export const collectionEditCopy = {
  head: {
    add: "Add cards",
    /** The phone strip's trailing slot, where the longer label does not fit beside four tabs. */
    addShort: "Add",
  },
  empty: {
    body: "A pile of possibilities waiting for a commander. Bring a file over, or add cards one at a time.",
    uploadTitle: "Upload a file",
    uploadSub: "A CSV from ManaBox, Moxfield, Archidekt or Deckbox",
    addTitle: "Add cards",
    addSub: "Search by name and add them one by one",
  },
  firstRun: {
    addByHand: "Add cards by hand",
    bodyShort: "Drop a CSV export from Moxfield, Archidekt, Deckbox or Manabox, or add cards by hand.",
  },
  // §A, the Replace review (the choice step and the Add review come with the next PR). Strings are
  // the handoff's; lines marked (new) have no key there and go to /copy-review.
  upload: {
    reviewReplace: "Review before you replace",
    tiles: { unchanged: "unchanged", up: "going up or new", down: "going down", leaving: "leaving" },
    edited: "edited",
    overwriteBanner: (k: number, since: string) =>
      `This overwrites ${n(k)} ${k === 1 ? "change" : "changes"} you made in the app since your ${since} upload.`,
    /** (new) History does not reach the last upload, so no number is quoted. */
    overwriteUnknown: (last: string) =>
      `This may overwrite changes you made in the app. Your last upload was ${last}, before the 90 days history keeps, so we can't count them.`,
    /** (new) Never uploaded, so every change made in the app is still on record. */
    overwriteNoUpload: (k: number) => `This overwrites ${n(k)} ${k === 1 ? "change" : "changes"} you made in the app.`,
    decksShortHeading: (k: number) => `Decks that will read short · ${n(k)}`,
    listLeaving: (k: number) => `Leaving your collection · ${n(k)}`,
    listDown: (k: number) => `Going down · ${n(k)}`,
    listUp: (k: number) => `Going up or new · ${n(k)}`,
    showAll: (k: number) => `Show all ${n(k)}`,
    /** (new) A list longer than the 500 rows the preview ships. */
    capNote: (shown: number, total: number) => `Showing the first ${n(shown)} of ${n(total)}.`,
    /** (new) The new-holding stand-in for a ×0 before figure. */
    newBadge: "new",
    /** (new) Reading how the file compares. */
    preparing: "Comparing with your collection…",
    barReplace: (from: number, to: number, short: number) =>
      `Replaces your ${n(from)} cards with ${n(to)}.${short ? ` ${n(short)} ${short === 1 ? "deck" : "decks"} will read short.` : ""}`,
    confirmReplace: "Replace collection",
    pendingReplace: "Replacing…",
    failedTitle: "That didn't go through",
    failedBody: "Nothing changed. Your collection is exactly as it was, and this review is still here.",
    retry: "Try again",
  },
  // §E, the short-deck warning. Replace is the only source so far; Save, Remove and Revert join
  // with the PRs that draw them. Every string is a placeholder for /copy-review.
  shortWarning: {
    titleReplace: (k: number) => `Replacing leaves ${decks(k)} short`,
    body: "Nothing about these decks changes. Each will show what it's short of and put it on its shopping list.",
    figureOne: (k: number) => `short ${n(k)}`,
    figureMany: (k: number) => (k === 1 ? "1 card short" : `${n(k)} cards short`),
    more: (k: number) => `and ${n(k)} more ${k === 1 ? "deck" : "decks"}`,
    namedCount: 3,
    cancel: "Cancel",
    confirmReplace: "Replace anyway",
    checking: "Checking decks…",
    saving: "Saving…",
    changed:
      "This changed while you were deciding. Your collection was edited somewhere else, so here's the answer as of now. Nothing was saved.",
    newTag: "new",
    catalogFailure: (names: string[]) =>
      `${names.join(", ")} ${names.length === 1 ? "has" : "have"} been removed from the card catalog since this file was read. Nothing was changed.`,
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
