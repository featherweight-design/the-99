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
    // Signature corrected from the handoff's `(score)` under plan ruling 5: the
    // denominator is not always 100. `measurableTotal` is the number of points
    // a commander could have scored given what we could measure, and a score of
    // 32 out of 40 must never be rescaled to read as 80 — see the anti-
    // comparability rule in commander-explained.ts §4.3 and rec-card.tsx:83-88.
    fit: (score: number, outOf: number) => `${score} /${outOf} fit`,
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
    //
    // Both clauses read "to buy" rather than "unowned". Since seniority landed,
    // the figure counts trips to a shop, and a card an older finished deck has
    // already taken is one of them while being a card the player owns. The pill
    // BESIDE it says "To buy" and means the same thing — it sits on the progress
    // row now rather than on the art above this figure.
    detailToBuy: (n: number, cost: string) => `${n} to buy · ${cost}`,
    // The same clause when nothing on the list carries a price. No price row is
    // not a price of zero, so the copies print and the cost does not.
    detailToBuyNoPrice: (n: number) => `${n} to buy`,
    // Price-free clause. Not in the handoff's copy file: Home's resume rows and
    // the phone deck rail draw `99 / 99 · 3 cards` with no cost, and
    // detailToBuy always carries one. Added under plan ruling 5.
    //
    // Counts the copies and names nothing else. Both surfaces that use it print
    // the status word on the same line, so `3 to buy` beside a `To buy` pill
    // would say the same thing twice; the tile, whose pill sits up in the art,
    // keeps the fuller clause above.
    detailCopies: (n: number) => (n === 1 ? "1 card" : `${n} cards`),
    detailUnresolved: (n: number) => (n === 1 ? '1 line unresolved' : `${n} lines unresolved`),
    detailOver: (n: number) => `${n} over`,
    detailDraft: 'created today',
    // Availability clause, reused verbatim from availability.ts vocabulary.
    detailInUseElsewhere: (n: number) => `${n} in use elsewhere`,
    // NOTE: decks.commander_oracle_id is NOT NULL — a deck always has a
    // commander, so there is no "no commander yet" string and no placeholder
    // art. A Draft deck is a named commander with 0 / 99 built.

    // Overflow menu — the three shipped items, in this order. Delete is
    // --danger and last. Do not add items here without a decision.
    menu: {
      updateFromList: 'Update from a list',
      rename: 'Rename',
      delete: 'Delete',
      trigger: (deckName: string) => `Actions for ${deckName}`,
    },

    // Card label for screen readers: name, identity, status, count, and the
    // detail figure — the same five things the tile shows, in the same order.
    // `identity` is the commander (both, on a pair) and the deck's colour,
    // which the tile's block now draws under the name. This label is the tile's
    // ONE accessible representation: the link it sits on has no descendants, and
    // the presentation it covers is `aria-hidden`, so nothing is announced
    // twice and no part of the visible identity goes unannounced.
    //
    // `played` is last, where the tile draws it, and it is optional because
    // most tiles have no date to state: a Draft never draws one and a deck with
    // no logged game draws nothing there. Omitting it from this label is what
    // hiding the footer would otherwise cost — the date would be on screen and
    // in no accessible representation at all.
    cardAria: (
      name: string,
      identity: string,
      status: string,
      count: string,
      detail: string,
      played?: string,
    ) =>
      `${name}, ${identity}, ${status}, ${count}, ${detail}${played ? `, ${played}` : ""}`,
    // Building has no fourth thing — its count IS the explanation, and it is
    // already the third. The same is true of a Draft older than the day it was
    // created, which `detailDraft` cannot describe. Neither may fall back to
    // cardAria with the count repeated: a reader would hear the figure twice.
    cardAriaNoDetail: (
      name: string,
      identity: string,
      status: string,
      count: string,
      played?: string,
    ) => `${name}, ${identity}, ${status}, ${count}${played ? `, ${played}` : ""}`,
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
    // Phone only. The sheet is where a reader on a phone reaches the sort,
    // which has no other home there; the desktop column has none because the
    // header carries `decks.sort`.
    sortHeading: 'Sort',
    // "Color identity" is a Magic rules term and keeps Wizards' spelling, as it
    // already does in create-pre-filled.tsx. Ordinary prose stays British —
    // theme.ts ships "Colour theme". The key name is the handoff's.
    colourHeading: 'Color identity',
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
