/**
 * src/lib/copy/deck-versioning.ts
 *
 * #389 — deck versioning. Production-final copy for the five §Surfaces plus the
 * Discard confirm. New block; see EDITS_TO_SHIPPED_COPY at the bottom for the two
 * strings this feature changes outside it.
 *
 * Vocabulary is fixed by §Modules: version · draft · commit a version.
 * Never "committed cards" — src/lib/decks/committed.ts owns that phrase and means
 * something else ("which deck is this card already in").
 */

/** The banner names the changes up to this many, and states counts beyond it. */
export const INLINE_CHANGE_MAX = 6;

export const deckVersioningCopy = {
  /* ---- §Surfaces 1 · pending state on the deck page ---- */
  pending: {
    label: 'Pending changes — not yet a version',
    counts: (adds: number, removes: number) =>
      [adds > 0 ? `+${adds}` : null, removes > 0 ? `−${removes}` : null]
        .filter(Boolean)
        .join(' / '),
    since: (n: number, version: number) =>
      `${n} ${n === 1 ? 'change' : 'changes'} since v${version}`,

    // The one figure that decides whether the review page is worth opening.
    money: (unfree: number, adds: number, total: string) =>
      `${unfree} of the ${adds} have no free copy, so this commit will ask for ` +
      `${unfree} to buy · ${total}.`,
    moneyPulls: (n: number) =>
      `${n} of those are sleeved in other decks and can be pulled instead.`,
    moneyNone: 'Every card coming in has a free copy, so this commit asks for nothing.',

    reviewCta: (n: number) => `Review ${n} changes`,
    reviewLink: 'review changes',
    commitCta: (version: number) => `Commit as v${version}`,
    discardCta: 'Discard',

    // Inline name lines, at or below INLINE_CHANGE_MAX.
    addPullHint: (deck: string) => `or pull from ${deck}`,
    removeHint: 'back in the pool on commit',

    // The decklist mark is a 3px --accent left rule on the row, not a chip: the
    // card-rows floor makes horizontal room the binding constraint, and a chip would
    // take ~86px of name width on each of nineteen rows. The rule is absorbed by the
    // row's own padding. This string is the row's ACCESSIBLE NAME only — it is never
    // rendered visually.
    addMarkA11y: 'pending add',
    // Said once above the list instead of once per row.
    addListCaption: (n: number) =>
      `the brass rule marks the ${n} ${n === 1 ? 'row' : 'rows'} this draft added`,
    // On the group heading, so grouping by type also maps where the draft happened.
    groupAddNote: (n: number) => `${n} added in this draft`,
    // The list toolbar's right slot, replacing "n cards are yours now" while a draft exists.
    toolbarNote: (n: number, version: number) => `${n} of these are not in v${version} yet`,
    // The mix cell's bottom-left slot takes the previous figure instead of the
    // recommendation while a draft exists — but ONLY when the figure actually moved.
    mixCellWas: (n: number) => `was ${n}`,

    // Committed and clean: the whole of versioning's permanent footprint.
    versionLine: (version: number, date: string) => `v${version} · committed ${date}`,

    // A versionless deck at a full body. Design's call, not the spec's — see READINESS.
    firstCommitCta: 'Commit as v1',
    firstCommitNote: 'locks this list as v1 — nothing about the deck changes',
  },

  /* ---- §Surfaces 2 · review changes ---- */
  review: {
    heading: (n: number, version: number) => `${n} changes since v${version}`,
    lede: (version: number) =>
      'Nothing here is a decision except the pulls. The list on the deck page is already ' +
      `this list — this page exists to show you what it costs before you lock it in as v${version}.`,

    chipIn: 'in',
    chipOut: 'out',
    chipBuy: 'to buy',
    chipPullable: 'can be pulled',

    groupIn: (n: number) => `Coming in · ${n}`,
    groupOut: (n: number) => `Going out · ${n}`,
    groupInBreakdown: (free: number, sleeved: number, buy: number) =>
      `${free} free · ${sleeved} sleeved · ${buy} to buy`,

    bucketFree: (n: number) => `Free in your collection · ${n}`,
    bucketSleeved: (n: number) => `Sleeved in another deck · ${n}`,
    bucketUnowned: (n: number) => `Not owned · ${n}`,

    bucketFreeNote: 'nothing to do — these are in the box already',
    bucketSleevedNote: 'buy, or pull it deliberately',

    heldBy: (deck: string) => `in ${deck}`,
    pull: 'Pull it',
    pulling: 'Pulling…',
    // The guard: the source deck has pending changes of its own, so committing it
    // automatically would sweep somebody's half-finished tinkering into a version.
    // The deck NAME is already on the row, so the reason is a four-letter tag beside
    // it and the action is the same width as `Pull it`. R1's two-line sentence
    // ("that deck has its own pending changes →") was too long visually and in copy.
    pullGuardTag: 'pending',
    pullGuardAction: 'Open →',
    // Never rendered — the action's accessible name.
    pullGuardA11y: (deck: string, card: string) =>
      `${deck} has pending changes of its own. Open it to release ${card}.`,
    // Third guard: commander claims are in the availability model, so `Pull it` would
    // otherwise be offered on a row where it can only ever fail. Same tag shape, NO
    // action — no route releases it, so an "Open →" would lead somewhere that cannot help.
    commanderGuardTag: 'commander',
    commanderGuardA11y: (deck: string, card: string) =>
      `${card} is ${deck}'s commander. It cannot be pulled.`,
    // A quantity move is ONE row carrying from → to — never a bare name, which would
    // assert the card left the deck. Reuse deck-import.ts's recountedItem rather than
    // authoring a second phrasing for the same fact (#513 ships it).
    recounted: (name: string, from: number, to: number) => `${name} ${from} → ${to}`,

    outNote: (n: number) =>
      `all ${n} go back in the pool when you commit. No per-row toggle: putting one back ` +
      'is adding it to the deck, and the deck page already does that.',

    footer: (cards: number, buy: number, released: number) =>
      `${cards} cards · ${buy} to buy · ${released} back in the pool`,
  },

  /* ---- §Surfaces 3 · commit ---- */
  commit: {
    heading: (version: number) => `Commit this list as v${version}`,
    lede: (version: number, unfree: number, removed: number) =>
      `v${version} becomes the deck's list immediately. The ${unfree} cards with no free copy ` +
      `keep their buy tags until you actually buy them, and the ${removed} you cut are back in ` +
      'the pool the moment you commit.',

    noteLabel: 'Why this version exists — optional',
    // Offered at commit time precisely because it is unrecoverable afterwards (§Surfaces 3).
    noteWarning: 'you cannot add this later — the version is not editable once committed',

    // The sheet carries the TOTAL, not the rows: the review page is directly above it
    // and already lists them. A confirmation that re-lists what you just read is a
    // second copy, not a confirmation.
    buyHeading: 'To buy',
    // "still" is doing work: five pulls are on the table and you have not taken them.
    buyBreakdown: (unowned: number, sleeved: number) =>
      [unowned > 0 ? `${unowned} not owned` : null,
       sleeved > 0 ? `${sleeved} still sleeved elsewhere` : null]
        .filter(Boolean).join(' · '),
    buyBackLink: (n: number) => `the ${n} rows are on the review page ↑`,
    // The only link-out in this feature. See OVERLAPS.md, call 1.
    linkOut: 'Open in Mana Pool',

    pullHeading: (n: number) => `Back in the pool · ${n}`,
    pullNote:
      'No action required — committing is what releases them. Take them out of the box ' +
      'whenever you next open it.',

    cta: (version: number) => `Commit v${version}`,
    ctaPending: 'Committing…',
    cancel: 'Cancel',
    footer: (cards: number, buy: number, released: number) =>
      `${cards} cards · ${buy} to buy · ${released} released`,

    refused: "We couldn't commit that version. Your changes are still here.",
    announced: (version: number, cards: number, buy: number) =>
      `Committed v${version}. ${cards} cards, ${buy} to buy.`,
    pullAnnounced: (card: string, deck: string, buy: number, total: string) =>
      `${card} pulled from ${deck}. ${buy} to buy, ${total}.`,
  },

  /* ---- Discard · unrecoverable, so it confirms (the #476 bar) ---- */
  discard: {
    // The number is in the question AND on the button: two changes and thirty-six
    // are different acts behind one word.
    question: (n: number) => `Discard ${n} changes?`,
    consequence: (version: number, date: string, cards: number, adds: number, removes: number) =>
      `The deck goes back to v${version} as committed on ${date} — ${cards} cards. The ${adds} ` +
      `you added and the ${removes} you cut are not stored anywhere, so this cannot be undone.`,
    confirm: (n: number) => `Discard ${n} changes`,
    cancel: 'Keep editing',
    pending: 'Discarding…',
    announced: (n: number, version: number) => `${n} changes discarded. Back to v${version}.`,
    refused: "We couldn't discard those changes. Nothing has changed.",
  },

  /* ---- §Surfaces 4 · versions (the fourth tab) and the diff ---- */
  history: {
    // The tab. Count absent at zero — and at zero the TAB is absent too, because a
    // deck with no version has no history (§Decisions 4).
    tab: 'Versions',
    heading: (n: number) => `${n} ${n === 1 ? 'version' : 'versions'}`,
    manaValue: (mv: string) => `mv ${mv}`,
    current: 'current',
    committed: (date: string, cards: number) => `committed ${date} · ${cards} cards`,
    delta: (adds: number, removes: number) => `+${adds} / −${removes}`,
    // A v1 has no predecessor. Never "+99" — the migration stamped a list that
    // was already there; ninety-nine decisions were not taken that day.
    initial: 'initial',
    noNote: 'no note',
    gamesHeld: (n: number) => `held ${n} ${n === 1 ? 'game' : 'games'}`,

    diffIn: (n: number) => `In · ${n}`,
    diffOut: (n: number) => `Out · ${n}`,
    diffNote:
      'no ownership dot, no prices, no pull offers — this is what the deck was, not what it needs',

    initialHeading: 'Initial',
    initialBody:
      'the list as it stood when versioning arrived. There is nothing before it to compare ' +
      'against, so there is no diff to show.',
    initialBrowse: (cards: number) => `Browse the ${cards} cards →`,

    commanderChange: (from: string, to: string) => `${from} → ${to}`,
  },

  /* ---- §Surfaces 2 · the what-changed strip ----
   * SIX cells: mana value plus the shipped five roles from ROLE_ORDER
   * (ramp, draw, removal, wipes, land). "body" is NOT a role in computeRoleCounts,
   * and a creature count already sits in the type-distribution block beside this.
   * Derived from draft-diff's two card sets plus the version's cards. No new column
   * and no new query — and it MUST be the same fold the deck page's mix strip uses,
   * or the two disagree on the same screen, one scroll apart. */
  changed: {
    manaValue: 'Mana value',
    manaValueDown: 'the curve comes down',
    manaValueUp: 'the curve goes up',
    clears: (rec: number) => `clears rec ${rec}`,
    under: (rec: number) => `still under rec ${rec}`,
    body: 'Body',
    bodyOver: (n: number) => `${n} over, not blocked`,
    // The six cells, in order. `body` above is the hero's over-cap line, NOT a strip cell.
    cells: ['manaValue', 'ramp', 'draw', 'removal', 'wipes', 'land'] as const,
    shapeHeading: "How the deck's shape moves",
    shapeRow: (before: number, after: number) => `${before} → ${after}`,
    delta: (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'),
  },

  /* ---- §Surfaces 5 · the game log stamp ---- */
  stamp: {
    columnHeader: 'ver',
    value: (version: number) => `v${version}`,
    // Games played before this shipped were played by a list nobody recorded.
    // Null is the accurate value; a backfill would be a fabricated claim.
    absent: '—',
  },
} as const;

/**
 * EDITS TO SHIPPED COPY — two strings, both in deckImportCopy.update
 * (src/lib/copy/deck-import.ts). See OVERLAPS.md, call 2.
 *
 * 1. arrival.delta — SUPPRESSED when the target deck has a version.
 *    The strip says "19 in, 6 out, 1 you kept" about the paste and is dismissible;
 *    the pending banner says what the deck now owes and is not. Same news twice,
 *    and the dismissible one is the one that can be wrong ten minutes later.
 *    On a deck with no version the strip is unchanged.
 *
 * 2. A new line above the diff's groups, rendered only when the deck has a version:
 */
export const draftPasteNotice = (version: number) =>
  `This deck is on v${version}. Applying this list changes your pending changes, not the ` +
  'committed deck — you will still commit it yourself.';
