// src/lib/copy/refresh.ts — Home and Decks, UI refresh (2026-09-07).
// Shape follows src/lib/copy/availability.ts: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted strings).
//
// VOICE. Labels and figures. No reassurance, no jokes, no second-person
// encouragement. Two rules that were violated in review and are now explicit:
//   • Never explain that a state is fine ("Nothing's broken here…").
//   • Never narrate an affordance ("Type it or tick it — same filter, either way").
// If a string cannot be read aloud in a bug report without embarrassment, cut it.
//
// COUNTS. Every count carries its denominator in the same string — `99 / 99`,
// `74 /100 fit`, `312 of 1,284`, `6 of 6`. No percentages, at any N.

export const refreshCopy = {
  // ── Home ──────────────────────────────────────────────────────────────
  home: {
    // Replaces the generated "Nine commanders you can build now" headline.
    // It is a greeting, not a claim — the claim is the kicker above it.
    greeting: 'Welcome back',
    // Kicker: collection size and freshness. Both figures, always both.
    kicker: (cards: string, when: string) => `${cards} cards · read ${when}`,
    updateCollection: 'Update collection',
    newDeck: 'New deck',

    readyHeading: 'Ready to build',
    // Card figures. `fit` prints the denominator because the detail hero does.
    fit: (score: number) => `${score} /100 fit`,
    fitLine: (n: number) => `${n} of your cards fit`,
    // Availability clause on a hero card. Absent when inUse === 0 — free says
    // nothing, per availability.ts.
    inUse: (n: number) => `${n} in use`,
    startDeck: 'Start this deck',
    seePool: 'See the pool',
    // Threshold is the lowest score actually rendered, never a rounder number.
    moreAbove: (n: number, floor: number) => `${n} more scored ${floor} or better`,
    allCommanders: 'All commanders',

    resumeHeading: 'Pick up where you left off',

    decksHeading: (n: number) => `Your decks · ${n}`,
    decksMore: (n: number) => `${n} more`,
    allDecks: 'All decks',

    commitmentsHeading: 'Commitments',
    inUseRow: 'Cards in use',
    inUseValue: (n: string, total: string) => `${n} of ${total}`,
    overCommittedRow: 'Spoken for twice',
    overCommittedValue: (n: number) => (n === 1 ? '1 card' : `${n} cards`),
    toBuyRow: 'To buy, all decks',
    toBuyValue: (n: number, cost: string) => `${n} · ${cost}`,
    reviewCommitments: 'Review commitments',
  },

  // ── Decks ─────────────────────────────────────────────────────────────
  decks: {
    title: 'Decks',
    // Must always equal the number of cards rendered. If they disagree, the
    // count is the bug, not the grid.
    shown: (shown: number, total: number) => `${shown} of ${total}`,
    newDeck: 'New deck',
    // ImportDeckButton survives as a peer of New deck: hairline, immediately to
    // its left. Desktop uses the short label; phone renders both full-width
    // under the header row, New deck first.
    importShort: 'Import',
    importLong: 'Import a deck',
    sort: (by: string) => `Sort · ${by}`,

    // Tile detail row — the one figure that explains the status.
    detailToBuy: (n: number, cost: string) => `${n} unowned · ${cost}`,
    detailComplete: 'all owned',
    detailUnresolved: (n: number) => (n === 1 ? '1 line unresolved' : `${n} lines unresolved`),
    detailOver: (n: number) => `${n} over`,
    detailDraft: 'created today',
    // Availability clause, reused verbatim from availability.ts vocabulary.
    detailInUseElsewhere: (n: number) => `${n} in use elsewhere`,
    // NOTE: decks.commander_oracle_id is NOT NULL — a deck always has a
    // commander, so there is no "no commander yet" string and no placeholder
    // art. A Draft deck is a named commander with 0 / 99 built.
    lastPlayedNever: 'never played',

    // Overflow menu — the three shipped items, in this order. Delete is
    // --danger and last. Do not add items here without a decision.
    menu: {
      updateFromList: 'Update from a list',
      rename: 'Rename',
      delete: 'Delete',
      trigger: (deckName: string) => `Actions for ${deckName}`,
    },

    // Card label for screen readers: name, status, count, and the detail
    // figure — the same four things the tile shows, in the same order.
    cardAria: (name: string, status: string, count: string, detail: string) =>
      `${name}, ${status}, ${count}, ${detail}`,
  },

  // ── Suggestion tile — the two add branches (R3.1 §4) ─────────────────
  // One geometry for both: the default hairline pill. The owned/unowned
  // distinction lives in the LABEL, never in the button's weight — two
  // hairline weights are indistinguishable in a panel of many tiles. Never
  // accent: the unowned branch creates a to-buy obligation, and accent is
  // already what to-buy looks like as DATA on this same tile.
  suggestion: {
    add: 'Add',
    // Names the consequence in the vocabulary the six statuses teach: adding an
    // unowned card moves the deck to To buy and adds a row to Home's total.
    addUnowned: 'Add · to buy',
    addAria: (name: string) => `Add ${name} to the deck`,
    addUnownedAria: (name: string) => `Add ${name} to the deck — you do not own it, it will be added to buy`,
  },

  // ── Zero states ───────────────────────────────────────────────────────
  // Distinct from filters.empty*, which is the FILTERED empty and offers Clear.
  zero: {
    decksHeading: 'No decks yet',
    decksBody:
      'Pick a commander and we assemble the 99 from cards you already own — then track what is missing.',
    decksBodyShort: 'Pick a commander and we assemble the 99 from cards you already own.',
    browseCommanders: 'Browse commanders',
    importDeck: 'Import a deck',
    // The figure that justifies Browse commanders being the primary. Omit the
    // whole line when buildable === 0.
    buildableFrom: (buildable: number, cards: string) =>
      `${buildable} commanders buildable from ${cards} cards`,
  },

  // ── First run — collection unread, no decks, rail locked ──────────────
  firstRun: {
    step: (n: number, of: number) => `Step ${n} of ${of}`,
    heading: 'Welcome to The 99',
    step1Title: 'Add your collection',
    step1Body:
      'Drop a CSV export from Moxfield, Archidekt, Deckbox or Manabox. We read owned counts, sets and finishes.',
    step1BodyShort: 'Drop a CSV export from Moxfield, Archidekt, Deckbox or Manabox.',
    uploadCsv: 'Upload a CSV',
    pasteList: 'Paste a list',
    step2Title: 'Pick a commander',
    // Locked steps state what unlocks them. Not "coming soon", not blank.
    step2Locked: 'Unlocks once a collection is read',
    step3Title: 'Build the 99',
    step3Locked: 'Unlocks with a commander',
    // Import is reachable during first run — arriving with a decklist and no
    // CSV must not be a dead end.
    importPrompt: 'Already have a deck elsewhere?',
    // Locked rail and tab items are dimmed and inert; the accessible name still
    // carries the reason.
    lockedItemAria: (label: string) => `${label} — unlocks once a collection is read`,
  },

  // ── Filters, both surfaces ────────────────────────────────────────────
  filters: {
    searchPlaceholder: 'Search decks',
    statusHeading: 'Status',
    colourHeading: 'Colour identity',
    lastPlayedHeading: 'Last played',
    lastPlayedThisMonth: 'This month',
    lastPlayedNever: 'Never',

    // Desktop column footer. States what is on, never what to do about it.
    allOn: 'all statuses on',
    someOn: (n: number) => (n === 1 ? '1 status on' : `${n} statuses on`),
    clear: 'Clear',

    // Phone sheet. The button dismisses; filtering already happened.
    sheetTitle: 'Filter decks',
    sheetMatch: (shown: number, total: number) => `${shown} of ${total} match`,
    sheetDismiss: (n: number) => (n === 1 ? 'Show 1 deck' : `Show ${n} decks`),
    // Trigger badge counts ACTIVE filters, not matching decks.
    triggerBadge: (n: number) => String(n),
    chipRemoveAria: (label: string) => `Remove filter: ${label.toLowerCase()}`,

    // Empty grid. No apology, no illustration, one route out.
    emptyHeading: 'No decks match',
    emptyAction: 'Clear filters',
  },

  // ── Status vocabulary — shipped values, do not translate here ─────────
  // These are the labels the tiles, rows, pills and filters all share. One
  // source, six strings; a rename is a rename everywhere.
  status: {
    draft: 'Draft',
    building: 'Building',
    over: 'Over',
    unresolved: 'Unresolved',
    toBuy: 'To buy',
    complete: 'Complete',
  },
} as const;
