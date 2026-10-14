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
    // The '+pts' token is split out because it renders in the accent colour
    // while the rest of the line stays locked-grey.
    legendToken: '+pts',
    legendRest:
      '= how much more often it appears here than in decks generally · % = decks running it · — = no figure',
    legendRestMobile: '= synergy vs. all decks · % = decks running it',

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
    synergyNegative: (pts: string) => (pts === '1' ? '−1 pt' : `−${pts} pts`),
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
    rowAria: (
      name: string,
      owned: string,
      synergy: string,
      inclusion: string,
      /** The slot's clause — a claim for an owned row, a price for an unowned
          one, and empty when the slot draws nothing. Lands LAST, so the three
          shipped clauses keep their order and a free owned card produces the
          string this has always produced. */
      slot = '',
    ) =>
      `${name}. ${owned}. Synergy ${synergy}. In ${inclusion} of decks.` +
      (slot ? ` ${slot}.` : ''),
    ariaOwned: 'Owned',
    ariaUnowned: 'Not in your collection',
    ariaSynergyPlus: (pts: string) => `plus ${pts} points`,
    ariaSynergyMinus: (pts: string) => `minus ${pts} points`,
    ariaSynergyNone: 'no EDHREC figure',
    ariaInclusionNone: 'an unknown share',

    // ── §4.7 · what the row's own label has to say about the slot ──────────
    //
    // The <li> carries an authored aria-label, which REPLACES everything beneath
    // it — so the slot's buy tag and its price are drawn and never spoken unless
    // they are composed in here. The readiness audit reopened this after the R1
    // handoff answered it with `markerAria` alone, which covers the three marker
    // readings and returns null for an unowned card, the one reading that draws
    // a price.
    //
    // Clauses, not sentences: `rowAria` joins them.
    ariaBuy: (figure: string) => `buy for ${figure}`,
    /** No figure to quote — never stocked, or the feed was silent. The tag draws
        a bare `buy`, and this is that, spoken. */
    ariaBuyNoPrice: 'available to buy',
    /** `BuyTag` draws `sold out` in the figure's slot; the label says the same.
        Distinct from the absent case: this card HAS a price history and no live
        printing, which is a different fact from never having been stocked. */
    ariaSoldOut: 'sold out',
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
    // The prose noun for the All facet. The pill reads "All", but the
    // disclosure copy puts the label in a sentence — "Show all {n} {facet}" —
    // where "All" would read as "Show all 258 All".
    allPlural: 'cards',
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
    add: 'Add to the deck',
    addAria: (name: string) => `Add ${name} to the deck`,
    remove: 'Remove from the deck',
    removeAria: (name: string) => `Remove ${name} from the deck`,
    // The promise line. NOT an edit to recommendationsCopy.build.stickyPromise
    // or .seedNote — those two are ruling 6's locked zero-selection copy and
    // stay exactly as they are. This is the branch taken when selection is
    // non-empty, which is why there are two keys and not two edits.
    promise: (filled: string, picked: string, total: string) =>
      `We'll fill ${filled}, plus your ${picked}: ${total} of the 99.`,
    promiseMobile: (filled: string, picked: string, total: string) =>
      `We'll fill ${filled}, plus your ${picked}: ${total} of the 99`,
    // Appended to either promise when some of the selection is unowned. Ruling
    // 5 requires buying to be explicit; this is where it is said.
    promiseUnowned: (n: string) => `${n} you don't own yet.`,
    // The clamp, and the only refusal on this surface.
    promiseFull: (picked: string) =>
      `Your ${picked} fill the 99 on their own. We'll leave the rest to you.`,
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

    // The one refusal on this surface. Two controls used to fail two ways and
    // needed two strings; one commit settles one way, so `fillFailed` went with
    // control A and `topOffCopy.commit.refused` points here.
    topUpFailed: 'We couldn’t add those. The deck is unchanged.',

    // §7.6 — printed when the candidate list is empty and slots remain (top-off
    // STATES §13), and nowhere else. It must never print because a player left
    // rows unticked: 'your collection ran out' would then be false, and blaming
    // the collection for the player's own restraint is the worst sentence this
    // surface could say. Stopping short is `topOffCopy.strip.doorNoteAgain`,
    // which is neutral.
    //
    // The clause after the separator is lifted verbatim from
    // recommendationsCopy.fill.provenanceShort, which already says this about
    // the 68-card fill. Expressive moment: it is the one line here that is
    // allowed a voice, and it earns it by being honest about a shortfall.
    short: (total: string, n: string) =>
      `${total} of 99. Your collection ran out ${n} short: there was nothing left in it that EDHREC ranks for this commander.`,
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

/**
 * Signs a synergy figure that has already been scaled to whole points. Both
 * surfaces that print one — the panel row and the Consider tile — go through
 * here, so a figure of 0 reads as '+0 pts' on both rather than '−0 pts' on
 * either.
 */
export function synergySignedDisplay(pts: number): string {
  return pts < 0
    ? synergyCopy.figure.synergyNegative(String(Math.abs(pts)))
    : synergyCopy.figure.synergy(String(pts));
}
