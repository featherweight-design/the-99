// The copy of collection editing, behind COLLECTION_EDIT_ENABLED (collection screens plan).
// This PR carries the head's entry and the Add cards sheet; later PRs add their own blocks.
// Strings are the handoff's `collection-edit · copy strings.ts`, adopted as drawn. Counts are
// pinned to en-US like the place head, so a server render and a browser agree.

const n = (x: number) => x.toLocaleString("en-US");
const decks = (x: number) => (x === 1 ? "a deck" : `${n(x)} decks`);
export const cards = (x: number) => (x === 1 ? "1 card" : `${n(x)} cards`);
export const rows = (x: number) => (x === 1 ? "1 row" : `${n(x)} rows`);
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);

export const collectionEditCopy = {
  head: {
    /** The head's Replace slot, now that the file may be added instead of replacing (copy-review call). */
    upload: "Upload a file",
    historyTab: "History",
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
    // The choice (§A1). Strings are the handoff's; the lines marked (new) have no key there and go to
    // /copy-review.
    step: (i: number, of: number) => `STEP ${i} OF ${of}`,
    choiceTitle: "Replace your collection, or add to it?",
    choiceTitlePhone: "Replace or add?",
    choiceLede: "Nothing changes until you confirm on the next screen.",
    replaceTitle: "Replace my collection",
    replaceBody: "Your collection becomes exactly this file. Anything not in it leaves.",
    addTitle: "Add these cards",
    addBody: "The file’s quantities are added to yours. Nothing is removed, and your art picks stay.",
    after: (from: number, to: number) => `${n(from)} → ${cards(to)}`,
    overwriteCount: (k: number, since: string) =>
      `${n(k)} ${k === 1 ? "change" : "changes"} you made in the app since your ${since} upload will be overwritten.`,
    choiceOverwriteUnknown: (last: string) =>
      `Changes you made in the app may be overwritten. Your last upload was ${last}, further back than the 90 days of history we keep, so we can’t count them.`,
    /** (new) Never uploaded, so every change made in the app is still on record. */
    choiceOverwriteNoUpload: (k: number) => `${n(k)} ${k === 1 ? "change" : "changes"} you made in the app will be overwritten.`,
    overlapNote: (pct: number) => `You already own ${pct}% of these cards. Adding the file raises those counts.`,
    continueReplace: "Review the replace →",
    continueAdd: "Review the add →",
    /** (new) The desktop foot's lead-in. */
    nextReplace: "Next: a review of every card this replace moves.",
    nextAdd: "Next: a review of every card this add raises.",
    cancel: "Cancel",
    /** (new) The comparison could not be read. */
    /** (new) A confirm failed and so did the read that would say whether it landed. */
    unconfirmed: "We couldn’t confirm whether that went through. Check your collection, then try again if it didn’t.",
    prepareFailed: "We couldn’t read how this file compares to your collection. Nothing was changed.",
    /** (new) The upload entry's note once the file can be added instead: the count sits between the two. */
    entryNote: { before: "Your file can replace your current ", after: " or be added to them. You’ll see every match before anything changes." },
    reviewAdd: "Review before you add",
    listAdded: (k: number) => `What gets added · ${n(k)}`,
    /** (new) The Add review's matched banner: the number, then its label. */
    addedFigure: (copies: number) => `+${n(copies)}`,
    addedLabel: (copies: number, cards: number) => `${copies === 1 ? "copy" : "copies"} across ${n(cards)} ${cards === 1 ? "card" : "cards"}`,
    allOwned: "You already own every card in this file.",
    allOwnedBody: (up: number) =>
      `Adding it raises them: ${n(up)} ${up === 1 ? "card goes" : "cards go"} up, none are new. If this is a fresh export of your whole collection, Replace is the one you want.`,
    switchToReplace: "Switch to Replace",
    barAdd: (add: number, skip: number, have: number) =>
      `Adding ${add === 1 ? "1 copy" : `${n(add)} copies`} and skipping ${skip === 1 ? "1 row" : `${n(skip)} rows`}. Your ${cards(have)} ${have === 1 ? "stays" : "stay"}.`,
    confirmAdd: (add: number) => `Add ${add === 1 ? "1 copy" : `${n(add)} copies`}`,
    pendingAdd: "Adding…",
    tiles: { unchanged: "unchanged", up: "going up or new", down: "going down", leaving: "leaving" },
    edited: "edited",
    overwriteBanner: (k: number, since: string) =>
      `This overwrites ${n(k)} ${k === 1 ? "change" : "changes"} you made in the app since your ${since} upload.`,
    /** (new) History does not reach the last upload, so no number is quoted. */
    overwriteUnknown: (last: string) =>
      `This may overwrite changes you made in the app. Your last upload was ${last}, further back than the 90 days of history we keep, so we can’t count them.`,
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
      `Replaces your ${cards(from)} with ${n(to)}.${short ? ` ${n(short)} ${short === 1 ? "deck" : "decks"} will read short.` : ""}`,
    confirmReplace: "Replace collection",
    pendingReplace: "Replacing…",
    failedTitle: "We couldn’t import that",
    failedBody: "Your collection is unchanged, and this review is still here.",
    retry: "Try again",
  },
  // §E, the short-deck warning. Replace and Revert are drawn so far; Save and Remove join with the
  // PRs that draw them. Every string is a placeholder for /copy-review.
  shortWarning: {
    titleReplace: (k: number) => `Replacing leaves ${decks(k)} short`,
    titleRevert: (k: number) => `Reverting leaves ${decks(k)} short`,
    /** (new) The warning's confirm when it is a revert's. */
    confirmRevert: "Revert anyway",
    // Edit copies (§C/§D): the handoff's strings for a save and a removal.
    titleRemove: (card: string, k: number) => `Removing ${card} leaves ${decks(k)} short`,
    titleSave: (k: number) => `Saving leaves ${decks(k)} short`,
    confirmRemove: "Remove anyway",
    confirmSave: "Save anyway",
    /** (new) The body for one card, as the R2 D2 specimen draws it. */
    bodyCard: (card: string) =>
      `Nothing about these decks changes. Each will show ${card} as short and put it on its shopping list.`,
    body: "Nothing about these decks changes. Each will show what it’s short of and put it on its shopping list.",
    figureOne: (k: number) => `short ${n(k)}`,
    figureMany: (k: number) => (k === 1 ? "1 card short" : `${n(k)} cards short`),
    more: (k: number) => `and ${n(k)} more ${k === 1 ? "deck" : "decks"}`,
    namedCount: 3,
    cancel: "Cancel",
    confirmReplace: "Replace anyway",
    checking: "Checking decks…",
    saving: "Saving…",
    changed:
      "This changed while you were deciding. Your collection was edited somewhere else, so here’s the answer as of now. Nothing was saved.",
    newTag: "new",
    catalogFailure: (names: string[]) =>
      `${names.join(", ")} ${names.length === 1 ? "has" : "have"} been removed from the card catalog since this file was read. Nothing was changed.`,
  },
  // §F, the revert confirmation (F4 to F7). The handoff's strings; (new) lines go to /copy-review.
  revert: {
    title: (kind: string) => `Revert “${kind}”?`,
    // Direction-neutral: a revert can move copies either way, so the lede names what moved without
    // claiming a direction. The Then and Now rows say what changes.
    lede: (when: string, c: number) => `From ${when}. Reverting this changes ${c === 1 ? "1 copy" : `${n(c)} copies`}.`,
    differs: "This does less than the original. Some of these cards have changed since, and a revert never takes you below zero.",
    then: "Then",
    now: "Now",
    confirm: "Revert",
    confirmPartial: "Revert what’s left",
    nothingLeft: "Nothing left to revert. Every card this changed is already back where it was.",
    /** (new) The reason beside a row whose copies stay the same but whose printing or condition is restored. */
    reasonDetails: "Printing or condition",
    /** (new) The lede when the revert moves no copies and only restores printings or conditions. */
    ledeDetails: (when: string, k: number) => `From ${when}. Reverting this restores the printing or condition of ${k === 1 ? "1 card" : `${n(k)} cards`}.`,
    /** (new) The reason beside a row whose count moved since the original. */
    reasonSince: "Changed since",
    /** (new) The reason beside a row the revert has nothing to do on. */
    reasonBack: "Already back",
    /** (new) Reading what the revert would do. */
    reading: "Checking what this would change…",
    catalogTitle: "We couldn’t revert this",
    catalogBody: (names: string[]) =>
      `${names.join(", ")} ${names.length === 1 ? "has" : "have"} been removed from the card catalog since. A revert can’t put back a card that no longer exists. Nothing was changed.`,
    /** (new) The change is already undone, or has aged out. */
    gone: "That change has already been reverted or has aged out of history. Nothing was changed.",
    close: "Close",
  },
  // §F, the history list. The handoff's strings; lines marked (new) have no key there and go to
  // /copy-review. Dates and times are UTC, spelled by the caller.
  history: {
    heading: "Changes to your collection",
    lede: "Every upload and edit from the last 90 days is listed here. A revert takes a change back as of today.",
    kinds: {
      uploadReplace: "Replace upload",
      uploadAdd: "Add upload",
      add: "Added in the app",
      edit: "Edited in details",
      /** A card marked bought from a deck's Shopping list (I got it); its deck line is in i-got-it.ts. */
      shopping: "From Shopping",
      remove: "Removed",
      revert: "Revert",
    },
    /** (new) A multi-card add, edit or removal, titled by its first card. */
    andMore: (first: string, k: number) => `${first} and ${n(k)} more`,
    /** (new) An entry's title when the ledger holds no filename or card name for it. */
    untitled: "Untitled change",
    addedFromPrecon: (name: string) => `Added from ${name}`,
    figures: (up: number, down: number, cards: number) =>
      // A change that moved no copies (a printing or condition swap, or a Replace that matched the
      // collection exactly) states its zero rather than leaving the figure blank.
      (up || down ? [up ? `+${n(up)}` : "", down ? `−${n(down)}` : ""].filter(Boolean).join(" · ") : "0") +
      ` ${up + down === 1 ? "copy of" : "copies across"} ${n(cards)} ${cards === 1 ? "card" : "cards"}`,
    /** (new) An opened entry that recorded no rows: a Replace that matched the collection exactly. */
    noRows: "This change didn’t move anything. Your collection already matched.",
    reverted: "Reverted",
    /** Reads after `reverted` and a separator: "Reverted · by the revert at 15:30". */
    revertedBy: (when: string) => `by the revert at ${when}`,
    undid: (title: string) => `Reverted “${title}”`,
    /** (new) A revert whose own entry is not on this page, so it cannot be titled. */
    undidOlder: "Reverted an earlier change",
    undidAged: (date: string) => `Reverted a change from before ${date}`,
    agedNote: "That change has aged out of history.",
    today: (date: string) => `Today · ${date}`,
    yesterday: (date: string) => `Yesterday · ${date}`,
    /** `details` is (new): a row whose printing or condition changed with its copies unchanged. */
    groups: { left: "Left", down: "Went down", up: "Went up", new: "New", details: "Details" },
    /** (new) The delta slot of a row whose copies did not move. */
    rowDetails: "details changed",
    showMore: (k: number, of: number) => `Show ${n(k)} more of ${n(of)}`,
    /** (new) The pager for entries past the first page. */
    olderEntries: "Show older changes",
    /** (new) Opening an entry, or paging, failed. */
    loadFailed: "We couldn’t load that. Nothing was changed.",
    loadRetry: "Try again",
    loading: "Loading…",
    foot: (date: string) =>
      `History keeps 90 days. Changes from before ${date} have aged out, but your cards haven’t. They’re all still in your collection.`,
    emptyTitle: "Nothing’s changed yet",
    emptyBody: (ship: string) =>
      `Uploads and edits since ${ship} show up here, ready to revert. Your collection from before that has no history to show.`,
    revert: "Revert",
    reverting: "Reverting…",
    /** (new) The expanded row's per-row quantity change. */
    rowDelta: (d: number) => (d > 0 ? `+${n(d)}` : `−${n(-d)}`),
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
    noResultsBody: "Check the spelling, or try part of the name. Tokens and emblems aren’t in the catalog.",
    searchFailed: "We couldn’t search just now. Check your connection and try again.",
    resultAdd: "↵ add",
    listHeading: (k: number) => `On the list · ${n(k)}`,
    newestFirst: "newest first",
    choosePrinting: "Choose a printing",
    needsPrinting: (card: string) => `Choose ${card}’s printing first`,
    afterPrinting: "Foil and how many come next, once it’s chosen.",
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
    discardBody: "They’re not saved yet. Close now and the list is gone.",
    discard: "Discard",
    keep: "Keep adding",
    savedTitle: (c: number) => `${copies(c)} added`,
    savedBody: (k: number) => `${n(k)} ${k === 1 ? "card is" : "cards are"} in your collection now.`,
    countsAfter: (from: number, to: number) => `${n(from)} → ${cards(to)}`,
    addMore: "Add more",
    done: "Done",
    /** (new) The saved state's link to the entry it just wrote (B8). */
    seeInHistory: "See it in History",
    failed: "We couldn’t add those. Your collection is unchanged.",
    printingsFailed: "We couldn’t load that card’s printings. Try picking it again.",
    announceChoose: (card: string, k: number) => `${card}: choose a printing. ${n(k)} printings.`,
    announceAdded: (card: string) => `${card} added to the list`,
    announceSaved: (c: number) => `${copies(c)} added to your collection`,
    /** The required printing step (B4a/B4m). */
    choose: {
      intro: (k: number) => `Which printing are you adding? ${n(k)} printings.`,
      introPhone: (k: number) => `Which printing? ${n(k)} printings.`,
      regionLabel: "Printings",
      searchPlaceholder: "Set, code or number",
      searchAria: "Search this card’s printings by set, code or number",
      emptyBody: (q: string, card: string) => `No printing of ${card} comes from a set matching “${q}”.`,
      tileOwned: (q: number) => `you own ×${n(q)}`,
    },
  },
  // Edit copies and removal (§C/§D, R2 canvas): the handoff's strings. Lines marked (new) have no
  // key there and go to /copy-review.
  copies: {
    edit: "Edit copies",
    addToCollection: "Add to collection",
    none: "none",
    sheetTitle: "Edit copies",
    sheetSub: (card: string, q: number, p: number) =>
      `${card} · you own ×${n(q)} in ${n(p)} ${p === 1 ? "printing" : "printings"}`,
    /** (new) The sub line for a card the player does not own yet. */
    sheetSubNone: (card: string) => `${card} · you own none`,
    addPrinting: "Add another printing",
    newPrinting: "New printing",
    newPrintingFirst: "Choose the new printing first",
    fixIntro: (k: number) => `Which printing is this copy? ${n(k)} printings.`,
    was: (from: string) => `was ${from}`,
    goesWith: (k: number) => (k === 1 ? "your 1 copy goes with it" : `your ${n(k)} copies go with it`),
    printingChanged: (k: number) => (k === 1 ? "1 printing changed" : `${n(k)} printings changed`),
    lastCopy: (card: string) => `That’s your last copy. Saving takes ${card} out of your collection.`,
    save: "Save",
    saving: "Saving…",
    retry: "Try again",
    saved: (card: string, q: number) => `Saved. ${card} ×${n(q)}.`,
    undo: "Undo",
    failed: "We couldn’t save that. Your collection is unchanged.",
    /** (new) A holding with no catalog printing behind it (a bare Name,Qty import). */
    noPrinting: "No printing recorded",
    /** (new) Reading the card's holdings, and the read failing. */
    loading: "Reading your copies…",
    loadFailed: "We couldn’t read your copies just now. Check your connection and try again.",
    /** (new) The collection moved while the sheet was open. */
    stale: "This card’s copies changed somewhere else, so the list is as it is now. Nothing was saved. Make your change again.",
    /** (new) The sheet's own discard question (B6), worded for changes rather than a list. */
    discardTitle: "Discard these changes?",
    discardBody: "They’re not saved yet. Close now and your copies stay as they were.",
    discard: "Discard",
    keep: "Keep editing",
    /** (new) Two lines would fold into more copies than one holding can hold. */
    tooMany: "That would be more copies than one printing can hold, so these two stay separate.",
    /** (new) An Undo went through but the list could not be refreshed. */
    undoneStale: "Undone. The list may show the old count until you refresh the page.",
    /** (new) The entry's time, as the revert confirmation spells it for the toast's Undo. */
    undoWhen: "today",
  },
  remove: {
    action: "Remove from collection",
    leaves: (card: string) => `${card} leaves your collection.`,
    confirm: (q: number) => `Remove ${copies(q)}`,
    /** Keeps what the confirm names: `Remove 1 copy` pairs with `Keep it`. */
    keep: (q: number) => (q === 1 ? "Keep it" : "Keep them"),
    toast: (card: string, q: number) => `${card} removed · ${copies(q)}`,
    undo: "Undo",
  },
} as const;
