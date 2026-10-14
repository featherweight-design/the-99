// src/lib/copy/synergy-discovery.ts — Track 2, stage 1.
// Shape follows src/lib/copy/recommendations.ts and decks-builder.ts: flat const
// object, functions for interpolated strings, no JSX, no number formatting
// (callers pass pre-formatted strings). Voice: Kitchen Table — utility copy
// stays straight; the one expressive moment is marked.
//
// Existing strings this block does NOT touch, and must not duplicate:
//   recommendationsCopy.build.stickyPromise   'We'll fill {n} of the 99'
//   recommendationsCopy.build.seedNote        — both LOCKED by brief ruling 6
//   recommendationsCopy.auto.*                the tag, the sweep, the receipt
//   recommendationsCopy.fill.provenance*      the arrival lines
//   recommendationsCopy.shopping.*            the to-buy list
//   addPanelCopy.tile.*                       the suggestion tile
//   addPanelCopy.shelf.*                      shelf headings and counts
//   detail.tsx  'No synergy data' / 'Synergy data unavailable'  — FitHero's
//               absent-vs-degraded pair, reused as-is on this panel

export const synergyCopy = {
  // ── Surface A · the panel ─────────────────────────────────────────────
  panel: {
    // Replaces the shipped sub-caption 'Top {n} synergy cards for this
    // commander', which described a top-N list the panel no longer is. See
    // REPLACES at the bottom.
    subcaption: (n: string) =>
      `${n} cards EDHREC associates with this commander, ranked by synergy`,
    subcaptionMobile: (n: string) => `${n} cards, ranked by synergy`,

    // The percentage headline is LOCKED by ruling 1 and keeps its shipped
    // strings ('{n} of top {m}', '{p}% owned'). No key here.

    // Said once, above the column header. Both units named, both null states
    // named, in one line — because two figures in two columns is the one thing
    // a player has to be taught on this panel.
    legend:
      '+pts = how much more often it appears here than in decks generally · % = decks running it · — = no figure',
    legendMobile: '+pts = synergy vs. all decks · % = decks running it',

    // Column header row, desktop only. Three words, so they are strings and not
    // a formatter.
    colCard: 'card',
    colType: 'type',
    colSynergy: 'synergy',
    colDecks: 'decks',
  },

  // ── Surface A · the two figures ───────────────────────────────────────
  figure: {
    // Signed, always — an unsigned synergy reads as a second percentage. The
    // singular is a real case: +1 pt is the Sol Ring shape and the panel prints
    // it more often than it prints +47.
    synergy: (pts: string) => `${pts === '1' ? '+1 pt' : `+${pts} pts`}`,
    // U+2212 minus, not a hyphen: at mono 11.5px a hyphen beside tabular digits
    // reads as a dash, which is this panel's absence glyph.
    synergyNegative: (pts: string) => `\u2212${pts} pts`,
    // Absence, never 0 and never +0 (suggest.ts:31-33). Independent of the
    // inclusion figure: one null never suppresses the other.
    synergyNone: '—',
    inclusion: (pct: string) => `${pct}%`,
    // Phone prefixes it, desktop does not — the shipped shopping.rowFigure
    // convention: on a meta line detached from the name, '31%' alone is
    // ambiguous.
    inclusionMobile: (pct: string) => `edhrec ${pct}%`,
    inclusionNone: '—',
    // The row's accessible name carries both figures and the ownership, because
    // all three are aria-hidden visual marks. Four branches, because a null in
    // either figure has to say 'no figure' rather than fall silent.
    rowAria: (name: string, owned: string, synergy: string, inclusion: string) =>
      `${name}. ${owned}. Synergy ${synergy}. In ${inclusion} of decks.`,
    ariaOwned: 'Owned',
    ariaUnowned: 'Not in your collection',
    ariaSynergyPlus: (pts: string) => `plus ${pts} points`,
    ariaSynergyMinus: (pts: string) => `minus ${pts} points`,
    ariaSynergyNone: 'no EDHREC figure',
    ariaInclusionNone: 'an unknown share',
  },

  // ── Surface A · facets ────────────────────────────────────────────────
  facet: {
    creatures: 'Creatures',
    spells: 'Instants & sorceries',
    spellsShort: 'Instants',
    artifacts: 'Artifacts',
    enchantments: 'Enchantments',
    lands: 'Lands',
    all: 'All',
    // A radiogroup, not tabs: it filters one list rather than swapping panels.
    groupAria: 'Filter the synergy list by card type',
    itemAria: (facet: string, n: string) => `${facet}, ${n} cards`,
    // Every facet count is post-exclusion, so an empty facet is a real state:
    // a commander whose enchantments are all owned role cards has none left.
    empty: (facet: string) => `No ${facet} cards for this commander`,
  },

  // ── Surface A · disclosure ────────────────────────────────────────────
  // Expansion has no item cap here, unlike the coverage panel — ruling 1
  // requires the full list be reachable, so 'Show all N' is a promise the
  // control can actually keep and the aria label says the same number.
  disclosure: {
    showAll: (n: string, facet: string) => `Show all ${n} ${facet}`,
    showAllAria: (n: string, facet: string) => `Show all ${n} ${facet} cards`,
    showFewer: 'Show fewer',
    showFewerAria: (facet: string) => `Show fewer ${facet} cards`,
  },

  // ── Surface A · selection into the build ──────────────────────────────
  select: {
    add: 'Add to the build',
    addAria: (name: string) => `Add ${name} to the build`,
    remove: 'Remove from the build',
    removeAria: (name: string) => `Remove ${name} from the build`,
    // The promise line. NOT an edit to recommendationsCopy.build.stickyPromise
    // or .seedNote — those two are ruling 6's locked zero-selection copy and
    // stay exactly as they are. This is the branch taken when selection is
    // non-empty, which is why there are two keys and not two edits.
    promise: (filled: string, picked: string, total: string) =>
      `We'll fill ${filled}, plus your ${picked} — ${total} of the 99.`,
    promiseMobile: (filled: string, picked: string, total: string) =>
      `We'll fill ${filled}, plus your ${picked} — ${total} of the 99`,
    // Appended to either promise when some of the selection is unowned. Ruling
    // 5 requires buying to be explicit; this is where it is said.
    promiseUnowned: (n: string) => `${n} you don't own yet.`,
    // The clamp, and the only refusal on this surface.
    promiseFull: (picked: string) =>
      `Your ${picked} fill the 99 on their own — we'll leave the rest to you.`,
    clear: (n: string) => `Clear selection · ${n}`,
    clearAria: (n: string) => `Clear all ${n} selected cards`,
    // One message per settle, debounced. Twelve fast taps is one announcement.
    announce: (picked: string, total: string) =>
      `${picked} selected. ${total} of 99 when built.`,
  },

  // ── Surface B · the last-31 strip ─────────────────────────────────────
  lastSlots: {
    // Named for the open slots, not for the number 31 — a partly built deck has
    // a different number and the heading has to survive it.
    heading: (n: string) => `The last ${n}`,
    caption: (n: string) => `${n} slots open · ranked by synergy for this commander`,
    captionMobile: (n: string) => `${n} slots open · ranked by synergy`,

    // A · owned-only. States what it can place, never the gap: 'fill the rest'
    // is a promise the pool usually cannot keep.
    fillOwned: (n: string) => `Fill ${n} from my collection`,
    fillOwnedAria: (n: string) =>
      `Fill ${n} slots with cards from your collection`,
    // Reuses recommendationsCopy.fill.fillingRows rather than adding a second
    // in-flight vocabulary for the same act.
    fillFailed: 'We couldn’t fill those. The deck is unchanged.',
    // Explains the number when it is smaller than the gap, which is most of the
    // time. Sits beside the two controls, mono, --fg-locked.
    ownedNote: (n: string, commander: string) =>
      `Your collection has ${n} in-colour cards left that EDHREC ranks for ${commander}.`,

    // B · the buying top-up. 'to buy' is the shipped vocabulary (buy tag,
    // Shopping footer), so the control names itself with it rather than with a
    // new noun.
    topUp: 'Top up with cards to buy',
    topUpAria: (n: string) =>
      `Top up ${n} slots with cards you do not own`,
    topUpFailed: 'We couldn’t add those. The deck is unchanged.',

    // §7.6 — settled below 99. The clause after the dash is lifted verbatim
    // from recommendationsCopy.fill.provenanceShort, which already says this
    // about the 68-card fill. Expressive moment: it is the one line here that
    // is allowed a voice, and it earns it by being honest about a shortfall.
    short: (total: string, n: string) =>
      `${total} of 99. Your collection ran out ${n} short — you own what you own, EDHREC knows what it knows, and that is everything we have.`,

    filledAnnounce: (added: string, total: string) =>
      `${added} cards added. ${total} of 99.`,
    shortAnnounce: (added: string, total: string, short: string) =>
      `${added} cards added. ${total} of 99, ${short} short.`,
    boughtAnnounce: (added: string, total: string, buy: string) =>
      `${added} cards added. ${total} of 99, ${buy} to buy.`,
  },

  // ── Surface B · the Consider shelf ────────────────────────────────────
  shelf: {
    // One new label beside addPanelCopy.shelf.labels. Not 'Threats & synergy'
    // — that is the shipped targetless shelf and this is a different list.
    label: (commander: string) => `Synergy · ${commander}`,
    meta: (n: string) => `ranked by synergy · ${n} to consider`,
    // The tile's lift line loses its ownership gate (see README decision 10)
    // and keeps its shipped string, addPanelCopy.tile.lift. A null synergy
    // drops to a sentence, exactly as noInclusion does:
    noSynergy: 'no synergy figure',
  },
} as const;

// ── REPLACES — edits inside files this block does not own ───────────────────
//
// 1. detail.tsx (both widths) — the EDHREC Synergy sub-caption
//    WAS:  'Top {n} synergy cards for this commander'
//    NOW:  synergyCopy.panel.subcaption(n) / .subcaptionMobile(n)
//    Reason: it described a top-N list. The panel is now the commander's whole
//    associated set, ranked — 'top 258' is not a top anything.
//    Note: the *headline* inside the panel keeps 'of top {m}' verbatim. Ruling 1
//    locks the percentage headline, and that string is part of it. The caption
//    above the panel and the headline inside it now use different words for the
//    same number on purpose — flagged here so it is not "fixed" later.
//
// 2. detail.tsx:21-47 — MissingChip, and role-card-list.tsx:3-24 — OwnedChip
//    Both are DELETED as components. Neither carries a string of its own, so no
//    copy is lost; their dots survive in the new row.
//
// 3. 'Not in your collection — {n} · the gap to close' (detail.tsx:~342)
//    DELETED with the two-list split. Ruling 1 removed the audit this described,
//    and 'the gap to close' was the audit's thesis in five words.
//
// 4. 'None of the top synergy cards are in your collection' (detail.tsx:~309)
//    DELETED. It was the owned-list empty state; a merged list ordered by
//    synergy is never empty when the commander is indexed, and when it is not
//    indexed FitHero's absent note already says so.
//
// NOTHING in recommendations.ts is edited or deleted by this pass. In
// particular build.stickyPromise and build.seedNote are untouched, per brief
// ruling 6 — synergyCopy.select.promise is a branch beside them, not a
// replacement for them.
