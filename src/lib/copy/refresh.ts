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
    // Threshold is the lowest score in the READY SET, never a rounder number —
    // the 28th commander's where 28 are ranked, and the last one's where
    // `readySlice` truncated to fewer. Not the lowest of the two CARDS: those
    // rotate daily within the set and routinely exclude the commander this
    // figure comes from.
    moreAbove: (n: number, floor: number) => `${n} more scored ${floor} or better`,
    allCommanders: 'All commanders',

    resumeHeading: 'Pick up where you left off',
    // How the block says what its order means. A caption, not a control: the
    // block has one order and always has, and a dropdown here would imply it is
    // a list — which is the thing this round deleted.
    resumeSortCaption: 'last touched',

    /**
     * The touched stamp. The verb names the event that won the sort, so the row
     * prints its own evidence for the order it is in.
     *
     * No `imported`: `decks.last_edited_at` is seeded from the deck's creation,
     * so nothing distinguishes an import from an edit once seeded, and a verb
     * that cannot be derived would be a guess. Handoff errata E5.
     */
    touched: {
      edited: (t: string) => `edited ${t}`,
      committed: (t: string) => `committed ${t}`,
      played: (t: string) => `played ${t}`,
    },
    // Lower case, and no "just now" — a stamp of 0 is not news, so anything
    // under an hour reads `0h ago`.
    elapsed: {
      hours: (h: number) => `${h}h ago`,
      yesterday: 'yesterday',
      days: (d: number) => `${d}d ago`,
      weeks: (w: number) => `${w}w ago`,
      months: (m: number) => `${m}mo ago`,
    },

    // The resume block's footer. It carries the total the deleted `Your decks`
    // heading used to print, inside the control that goes there — so the number
    // is a destination rather than a label. Absent when `more` is 0.
    moreDecks: (more: number) => `${more} more deck${more === 1 ? '' : 's'}`,
    // Singular-aware, though the footer that prints it is absent below five
    // decks — the figure beside it would be nought, and a block whose figure is
    // nought is absent rather than zeroed. The string is exported, and `All 1
    // decks` is not a sentence this app would print anywhere.
    allDecks: (total: number) => `All ${total} deck${total === 1 ? '' : 's'}`,

    commitmentsHeading: 'Commitments',
    inUseRow: 'Cards in use',
    inUseValue: (n: string, total: string) => `${n} of ${total}`,
    overCommittedRow: 'Spoken for twice',
    overCommittedValue: (n: number) => (n === 1 ? '1 card' : `${n} cards`),
    toBuyRow: 'To buy, all decks',
    toBuyValue: (n: number, cost: string) => `${n} · ${cost}`,
    reviewCommitments: 'Review commitments',
    shopAllDecks: 'Shop all decks',
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
    // the figure counts trips to a shop, and a card an older committed deck has
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
      /**
       * The tile menu's Export row when the deck's export could not be read; pressing it reads again. A read writes
       * nothing, so no "unchanged" clause (`src/lib/copy/README.md`), and the tile names the deck. Short because the
       * menu is 186px wide and the row one line: "We couldn’t load that deck. Try again." would wrap and clip.
       */
      exportFailed: 'Export failed. Try again.',
      trigger: (deckName: string) => `Actions for ${deckName}`,
    },

    /**
     * The delete confirm, drawn in the overflow panel rather than by
     * `window.confirm`. The pane is the folder delete's, specified by the
     * folders handoff (decision 25); only the sentence differs, because what a
     * deck takes with it is not what a folder takes with it.
     */
    del: {
      /** The deck is named, because a player has many and the tile is small. */
      heading: (name: string) => `Delete “${name}”?`,
      /**
       * THE SENTENCE. Same shape as the folder's, for the same reason: what
       * happens, then what does not, because the second half is what a reader
       * fears. Every table that references a deck is `on delete cascade`, so
       * the first half is a promise the database keeps however the deck goes;
       * `collection_items` references no deck at all, which is why the second
       * half can be stated flatly.
       */
      body: 'Its list, its versions and its game log go with it. Nothing leaves your collection.',
      cancel: 'Keep it',
      confirm: 'Delete deck',
      /** Present tense, because the row it replaces is still on screen. */
      pending: 'Deleting…',
      /**
       * An outage, not a refusal: `deleteDeck` has no `false` to return — it
       * either deletes and redirects or throws. So this says the delete
       * cannot be confirmed and asks for the one thing that can be done: look.
       */
      failed: 'We couldn’t confirm that deck was deleted. Reload to check.',
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
    // The bracket chip rides beside the status in the aria-hidden footer, so the link names it
    // there too, or the chip would be visual-only.
    statusWithBracket: (status: string, bracket: string) => `${status}, bracket ${bracket}`,
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
      'Pick a commander and we’ll assemble the 99 from cards you already own, then track what’s missing.',
    decksBodyShort: 'Pick a commander and we’ll assemble the 99 from cards you already own.',
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
      'Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox. We read owned counts, sets and finishes.',
    step1BodyShort: 'Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox.',
    // While the embedded review is open, on the phone (first-run redesign D11, 5a). Drawn in mono
    // uppercase; the count is pinned to en-US like every figure here.
    step1Reviewing: (file: string, rows: number) =>
      `Reviewing · ${file} · ${rows === 1 ? '1 row' : `${rows.toLocaleString('en-US')} rows`}`,
    uploadCsv: 'Upload a CSV',
    pasteList: 'Paste a list',
    // Names BOTH paths while it is still locked (first-run ruling 2, 2026-09-28): with the
    // import foot gone this card is the only place a first-run player learns import exists.
    step2Title: 'Pick a commander or import a deck',
    // Locked steps state what unlocks them. Not "coming soon", not blank.
    step2Locked: 'Opens once your cards are in',
    step3Title: 'Build the 99',
    step3Locked: 'Opens once you pick a commander',
    // A locked rail or tab slot is a button that opens its note; the name says
    // it is locked and the note, its description, says why. The name does not
    // repeat the note (onboarding audit, correction 1).
    lockedItemAria: (label: string) => `${label}, locked`,
    // The lock's own words (design table first-run-locked-nav.md).
    lock: {
      // Desktop only, under the first-run H1; the phone's bracket carries it.
      pageLine: 'Collection, Commanders, Discover and Decks open once your cards are in.',
      // `others` is the other three locked labels, joined by `nameList` ("A, B and C").
      note: (label: string, others: string) =>
        `${label} opens once your cards are in. So do ${others}.`,
      tabBracket: 'Open once your cards are in',
      railLabel: 'Locked',
      goToStep1: 'Go to step 1',
    },
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
    // already does in create-pre-filled.tsx. Rendered copy is US English
    // throughout since 2026-09-25. The key name is the handoff's.
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
  // source, seven strings; a rename is a rename everywhere.
  // Cascade order, and the order is the meaning: this object is read
  // top-to-bottom by anybody learning the vocabulary, and `statusPill()` tests
  // the phase before any count.
  status: {
    new: 'New',
    draft: 'Draft',
    over: 'Over',
    building: 'Building',
    unresolved: 'Unresolved',
    toBuy: 'To buy',
    complete: 'Complete',
  },
} as const;
