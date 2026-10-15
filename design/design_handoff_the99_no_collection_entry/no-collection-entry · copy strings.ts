// no-collection-entry · copy strings.ts. R2. PLACEHOLDERS: /copy-review sets the words.
// Targets: src/lib/copy/refresh.ts (firstRun, lock), collection-edit.ts (empty, firstRun), precons.ts (pick),
// deck-import.ts (arrival.own, shopping.own), commanders.ts / commander-discovery.ts (empty), collection-edit.ts
// (upload.replaceBuilt). Unit: "cards" are copies, as the precon arrival counts them.

const n = (x: number) => x.toLocaleString("en-US");
const cards = (x: number) => (x === 1 ? "1 card" : `${n(x)} cards`);
const boxes = (x: number) => (x === 1 ? "1 box" : `${n(x)} boxes`);
const tokens = (x: number) => (x === 1 ? "1 token" : `${n(x)} tokens`);
/** "A", "A and B", "A, B and C", then "A, B and 4 others". */
const names = (xs: string[]) =>
  xs.length <= 3
    ? xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`
    : `${xs.slice(0, 2).join(", ")} and ${xs.length - 2} others`;

export const noCollectionEntryCopy = {
  // The group under the upload, on first run's step 1 and on the empty Collection (one component).
  ways: {
    kicker: "No file? Start another way",
    precons: "Precons I own",
    preconsSub: "Pick the boxes. We know every card in them.",
    preconsSubShort: "Pick the boxes you own.", // the empty Collection's narrower column
    importDeck: "Import a deck", // reuses zero.importDeck
    importDeckSub: "Paste a list you play.",
    importDeckSubShort: "Paste a list you play.",
    addByHand: "Add cards by hand", // first run (collectionEditCopy.firstRun.addByHand, moved)
    addCards: "Add cards", // the empty Collection (collectionEditCopy.empty.addTitle)
    addSub: "Search by name and add them one by one.",
    addSubShort: "Search by name, one by one.",
  },
  // CHANGED: the empty Collection's body.
  emptyBody: "A pile of possibilities waiting for a commander. Bring a file over, or start another way.",

  lock: {
    // CHANGED: three names while Collection is open (edit switch on). The four-name forms stay for the switch off.
    pageLine: "Commanders, Discover and Decks open once your cards are in.",
    // tabBracket unchanged: "Open once your cards are in".
    // Outside first run (Home with decks, any route): there is no step 1.
    addYourCards: "Add your cards", // → /collection
    withDecks: "Your decks are on Home until then.", // appended to the note when the account has a deck
  },

  home: {
    // Home with decks and 0 cards: the header's one action, replacing Update collection and New deck.
    kicker: (decks: number) => `0 cards · ${decks === 1 ? "1 deck" : `${n(decks)} decks`}`,
    addYourCards: "Add your cards",
  },

  pick: {
    title: "Precons I own",
    sub: "Tick every box you own. Its cards go into your collection at the box’s own printings, foils as foils, with its tokens. No deck is started.",
    subPhone: "Tick every box you own. Its cards and tokens go into your collection. No deck is started.",
    backHome: "‹ Home",
    backCollection: "‹ Collection",
    cards: (c: number) => cards(c), // the row's figure, `100 cards`; `100` at 390
    edition: "Edition",
    regular: "Regular", // precons.open.edition.regular
    collector: "Collector’s Edition", // precons.open.edition.collector
    collectorNote: "every card foil",
    added: (date: string) => `added ${date}`,
    addedAgain: (date: string) => `You added this box on ${date}. Adding it again adds a second copy of each card.`,
    leadNone: "Tick the boxes you own.",
    lead: (b: number, c: number, t: number) => `${boxes(b)} · ${cards(c)}${t > 0 ? ` and ${tokens(t)}` : ""}`,
    addHeld: "Add boxes",
    add: (b: number, c: number) => `Add ${boxes(b)} · ${cards(c)}`,
    adding: "Adding…",
    addingLead: (b: number) => `Adding ${boxes(b)} to your collection…`,
    cancel: "Cancel",
    done: "Done", // replaces Cancel once any box has landed (S7)
    landed: "added just now",
    // Refusals ride the shipped precons.start.owned.addFailed / addUnsure.
    partFailed: (landed: string[], failed: string[]) => `Added ${names(landed)}. We couldn’t add ${names(failed)}.`,
    tryAgain: "Try again",
  },

  // The receipt strip on Home after a precon add (S5).
  receipt: {
    head: (b: number) => `${b === 1 ? "1 precon" : `${n(b)} precons`} added to your collection:`,
    body: (boxNames: string[], c: number, t: number) =>
      `${names(boxNames)}. ${cards(c)}${t > 0 ? ` and ${tokens(t)}` : ""}.`,
    phone: (b: number, c: number) => `${b === 1 ? "1 precon" : `${n(b)} precons`} added · ${cards(c)}`,
    history: "History",
    dismiss: "Dismiss",
  },

  // Path (a), R2: the import's checkbox (deck-import.ts entry) and its arrival (deck-import.ts arrival).
  own: {
    label: "I own these cards. Add them to my collection.", // mirrors precons.start.owned.label
    arrivalHead: (lines: number) => `All ${n(lines)} lines came over clean.`,
    arrivalAdded: (c: number) => `All ${cards(c)} added to your collection.`,
    arrivalMeta: "Imported from your list a moment ago",
    history: "History",
    historyKind: "Deck add",
    // Refusals: precons.start.owned.addFailed / addUnsure, as a toast on the import page.
  },

  // Open 7. Replaces the inline literals in commanders/page.tsx and discover/page.tsx.
  rankEmpty: {
    title: "Nothing to rank yet",
    commandersBody: "We rank commanders from the cards you own. Add some and every one you can build shows up here.",
    discoverBody: "Discover finds commanders your cards are close to building. Add some and they show up here.",
    button: "Add your cards", // → /collection; switch off: the shipped "Upload collection" → /collection/replace
  },

  // S14: Replace's warning for a collection built without an upload (replaces choiceOverwriteNoUpload's count there).
  replaceBuilt: (c: number, preconCount: number, byHand: boolean) => {
    const from = [preconCount > 0 ? `${preconCount === 1 ? "1 precon" : `${n(preconCount)} precons`}` : null, byHand ? "by hand" : null]
      .filter(Boolean)
      .join(" and ");
    return `${cards(c)} you added ${preconCount > 0 ? "from " : ""}${from} ${c === 1 ? "isn’t" : "aren’t"} in this file and would leave. Revert can bring them back.`;
  },
} as const;
