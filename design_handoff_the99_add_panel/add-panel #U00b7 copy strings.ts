// src/lib/copy/decks-builder.ts — Add panel overhaul block (#158).
// Shape follows src/lib/copy/shell.ts: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted strings). Voice: Kitchen Table — utility copy stays straight;
// the two expressive moments are marked.

export const addPanelCopy = {
  // ── Tabs (replaces the Suggestions | Search tab bar) ──────────────────
  tabs: {
    deck: 'Your deck',
    consider: 'Consider',
    deckAria: (n: number) => `Your deck, ${n} cards`,
    considerAria: (n: number) => `Cards to consider, ${n} suggestions`,
    panelAria: 'Cards to consider',
  },

  // ── Consider toolbar ──────────────────────────────────────────────────
  consider: {
    // Replaces the old "Based on your collection and EDHREC data…" sub-caption.
    // Provenance for the collection; the EDHREC claim now sits on the shelf
    // that actually uses it.
    provenance: (n: number) => `${n} cards you already own`,

    sortLabel: 'Sort',
    sortGaps: 'Coverage gaps first',
    sortEdhrec: 'EDHREC first',
    sortCheapest: 'Cheapest first',
    sortAria: 'Sort suggestions',

    showAll: (n: number) => `Show all ${n}`,
    showAllAria: (role: string, n: number) => `Show all ${n} ${role} suggestions`,
    collapse: 'Show fewer',
  },

  // ── Shelf headers ─────────────────────────────────────────────────────
  // The header quotes the same numbers as the coverage cell above it.
  shelf: {
    coverage: (have: number, target: number) => `you have ${have} of ${target}`,
    count: (n: number) => `${n} to consider`,
    // The "Threats & synergy" shelf has no target — decision 7.
    noTarget: 'no target — this is the deck’s plan',
    labels: {
      ramp: 'Ramp',
      draw: 'Draw',
      removal: 'Removal',
      wipes: 'Wipes',
      land: 'Land',
      // Replaces role "other". The `role` value on the payload is unchanged.
      other: 'Threats & synergy',
      // The EDHREC-sourced shelf, when suggestions are not coverage-driven.
      edhrec: (commanderShortName: string) => `Top picks for ${commanderShortName}`,
    },
  },

  // ── Suggestion tile ───────────────────────────────────────────────────
  tile: {
    add: '+ Add',
    addAria: (name: string) => `Add ${name} to deck`,
    inDeck: '✓ In deck',
    inDeckAria: (name: string) => `${name} is already in this deck`,
    // The art and the name are both CardDetailTrigger; the modal owns its own
    // aria (cardDetailCopy.triggerAria), so nothing is redeclared here.
    detailHint: 'details ↗',
    // Honest omissions — never a 0% bar, never a blank plate.
    noArt: 'no art on file',
    noInclusion: 'no EDHREC figure',
    // Non-degraded, role-sourced picks (no EDHREC percentage for this card).
    fillsRole: (role: string) => `fills a ${role} slot`,
    inclusion: (pct: string) => `${pct}%`,
    inclusionAria: (pct: string, commanderShortName: string) =>
      `in ${pct}% of ${commanderShortName} decks on EDHREC`,
  },

  // ── Consider, empty (expressive moment — zero suggestions is a win) ────
  considerEmpty: {
    heading: 'We’re out of ideas, and that’s a compliment',
    body: (commanderShortName: string) =>
      `Every card in your collection that fits ${commanderShortName} is already in this deck. Add more to the pile and we’ll have more to say.`,
    cta: 'Add to your collection',
  },

  // ── Degraded (straight — a service outage is not a place to be charming) ──
  degraded: {
    heading: 'EDHREC isn’t answering right now.',
    body: (commanderShortName: string) =>
      `These are ranked by what your deck is short of, not by what other ${commanderShortName} decks run — so the shelves are honest and the percentages are missing.`,
    retry: 'Try again',
  },

  // ── Quick add (retrieval) ─────────────────────────────────────────────
  quickAdd: {
    placeholder: 'Add a card by name…',
    fieldAria: 'Add a card to this deck by name',
    identityNote: (identity: string) => `${identity} only`,
    enterHint: '↵ adds the top match',
    keyboardHint: '↑↓ to move · ↵ to add · Esc to dismiss',

    resultsAria: 'Card search results',
    resultCount: (n: number) => (n === 1 ? '1 match' : `${n} matches`),
    resultCountWithIdentity: (n: number, identity: string) =>
      `${n === 1 ? '1 match' : `${n} matches`} · ${identity} only`,

    rowAdd: 'Add',
    rowAddActive: '↵ add',
    rowInDeck: '✓ In deck',
    rowOwned: (qty: number) => `×${qty} owned`,
    rowNotOwned: 'not owned',
    rowAria: (name: string, typeLine: string, owned: boolean) =>
      `${name}, ${typeLine}, ${owned ? 'owned' : 'not owned'}`,

    ownedToggle: 'Owned only',
    ownedToggleAria: 'Show only cards you own',
    ownedFilterOffNote: (n: number) =>
      n === 1
        ? 'filter off — 1 result you don’t own'
        : `filter off — ${n} results you don’t own`,

    clear: 'Clear search',
  },

  // ── Quick add, no results ─────────────────────────────────────────────
  quickAddEmpty: {
    heading: 'Nothing in the pile by that name',
    body: (query: string, commanderShortName: string) =>
      `No card you own matches “${query}” in ${commanderShortName}’s colours.`,
    dropFilter: 'Search all cards instead',
    // Shown when the owned filter is already off — then it really is a miss.
    bodyAllCards: (query: string, identity: string) =>
      `No ${identity} card matches “${query}”.`,
  },

  // ── Empty builder (R2) ────────────────────────────────────────────────
  // Replaces decksBuilderCopy.builderEmpty. Three changes, no new flavour:
  //
  // 1. `cta: "Open suggestions"` is DELETED. Its only job was opening the
  //    bottom sheet, which no longer exists; the Consider tab sits 40px above
  //    the mark with its count on it, and the quick-add bar is focusable at the
  //    bottom of the same screen. Two live entrances, no button.
  // 2. `captionFor` / `captionForMobile` COLLAPSE INTO ONE. The split existed
  //    only because the two widths pointed at different constructs ("on the
  //    right" vs "one tap away"); they now point at the same two. This also
  //    closes the "flagged for Design ratification" note on captionForMobile.
  // 3. `roleHint` is promoted to both widths — mobile spent that vertical
  //    budget on the CTA, and it is the only line telling a first-time builder
  //    what to fill first.
  //
  // Voice: "A king with no army." and "eats everything anyway" are locked and
  // verbatim. Only the middle clause changed, and it was mechanical direction
  // rather than flavour.
  builderEmpty: {
    heading: 'A king with no army.',
    caption: (commander: string) =>
      `Ninety-nine slots, zero filled. Type a name below, or take the ninety-nine we’ve already picked out — ${commander} eats everything anyway.`,
    roleHint: 'Try filling your ramp, draw, removal, and wipe slots first.',
  },

  // ── Live region (the builder’s existing one — not a new region) ───────
  announce: {
    added: (name: string, built: number, role: string, have: number, target: number) =>
      `${name} added · ${built} of 99 · ${role} ${have} of ${target}`,
    addedNoRole: (name: string, built: number) => `${name} added · ${built} of 99`,
    results: (n: number, query: string) =>
      n === 0
        ? `No matches for ${query}`
        : `${n === 1 ? '1 match' : `${n} matches`} for ${query}`,
  },
} as const;
