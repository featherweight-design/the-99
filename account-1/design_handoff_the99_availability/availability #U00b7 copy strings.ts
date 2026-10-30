// src/lib/copy/availability.ts — card availability block (#43).
// Shape follows src/lib/copy/decks-builder.ts: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted strings). Voice: Kitchen Table — utility copy stays straight;
// the two expressive moments are marked.
//
// VOCABULARY IS LOAD-BEARING. "free" and "in use" are the two nouns. If the
// product ever prefers "available", it is a swap of `free` → `available` in
// EVERY string below at once — never on one surface. "Deck tax" is banned
// (collides with commander tax). Nothing here may assert where a physical card
// is: we describe LISTS, never boxes, binders or sleeves.
//
// SELF-EXCLUSION (addendum 2 / R3). On a deck's own decklist the marker scores
// against every deck EXCEPT that one — both severities, no special case. A deck
// holding a card is not competition for itself, and "0 free — in Atraxa"
// rendered inside Atraxa names the deck the player is already inside. The soft
// copy already said "other brews" for this reason. Two consequences:
//   • inside a finished deck the HARD state is unreachable — a second finished
//     claim on one copy is over-commitment, so it presents as `overAlsoIn`.
//   • /collection and the commander surfaces have no current deck, so no
//     exclusion applies there; they compute against everything, as in #43.

export const availabilityCopy = {
  // ── The marker itself ─────────────────────────────────────────────────
  // Four states. `free` renders NOTHING — there is no string for it, on
  // purpose, so a future edit cannot accidentally give silence a label.
  marker: {
    // soft: free > 0, soft > 0
    soft: (softQty: number) =>
      softQty === 1 ? '1 in a brew' : `${softQty} in a brew`,
    softAria: (softQty: number) =>
      softQty === 1
        ? '1 copy is on an unfinished deck'
        : `${softQty} copies are on unfinished decks`,

    // hard: free = 0. Names the claiming deck ONLY when there is exactly one.
    hard: '0 free',
    hardIn: (deckName: string) => `0 free — in ${deckName}`,
    hardMulti: (deckCount: number) => `0 free — across ${deckCount} decks`,
    hardAria: (deckName: string) =>
      `no free copies; this one is on your ${deckName} list`,
    hardMultiAria: (deckCount: number) =>
      `no free copies; they are on ${deckCount} of your finished lists`,

    // over: free < 0. Never names decks — it is a count problem, not a location.
    over: (shortBy: number) => `short ${shortBy}`,
    overWithDemand: (shortBy: number, deckCount: number) =>
      `short ${shortBy} — ${deckCount} decks want it`,
    overAria: (shortBy: number, deckCount: number) =>
      `${deckCount} of your finished lists include this card and you own ${shortBy} too few`,

    // On a deck's OWN list the current deck is excluded from the marker, so
    // "N decks want it" would count the deck the player is standing in. Name the
    // other claimant instead. Decklist-of-the-holder only.
    overAlsoIn: (shortBy: number, otherDeck: string) =>
      `short ${shortBy} — also in ${otherDeck}`,
    overAlsoInAria: (otherDeck: string) =>
      `your ${otherDeck} list also includes this card and you don’t own enough for both`,

    // Tile caption line (sits under the type line, not on the art).
    tileInUse: (deckName: string) => `in use — ${deckName}`,
    tileOver: (deckCount: number) => `${deckCount} decks want it`,
  },

  // ── Surface 1 · commanders list ───────────────────────────────────────
  ranking: {
    // The label does the anti-collision work against `Owned only`: this names
    // ranking, not filtering. Do not shorten it to "Availability".
    label: 'Score against',
    all: 'Everything I own',
    free: 'What’s free',
    allAria: 'Rank commanders against everything you own',
    freeAria: 'Rank commanders against cards not already in a finished deck',
    // Shown only in the `free` state, under the control.
    freeNote: 'Cards sleeved into a finished deck don’t count toward these scores.',
    freeNoteLong:
      'Cards sleeved into a finished deck don’t count toward these scores. Unfinished brews still do.',
    subtitleAll: 'ranked by fit',
    subtitleFree: 'ranked by what’s free',
    // Announced on the list’s existing live region when the toggle flips.
    announce: (mode: 'all' | 'free', n: number) =>
      mode === 'free'
        ? `Re-ranked by what’s free · ${n} commanders`
        : `Re-ranked by everything you own · ${n} commanders`,
  },

  // ── The receipt line (surfaces 1 and 2) ───────────────────────────────
  // OPEN ITEM 7: the line ALWAYS renders; only the second clause is
  // conditional. Row height never changes between players.
  receipt: {
    fit: (n: number) => `${n} of your cards fit`,
    fitFree: (n: number) => `${n} of your cards are free`,
    // Appended when inUse > 0. Callers join with ' · '.
    inUse: (n: number) => `${n} already in use`,
    inUseShort: (n: number) => `${n} in use`,
    wantedByBrew: (n: number) =>
      n === 1 ? '1 wanted by a brew' : `${n} wanted by a brew`,
    // Score delta, `free` ranking only, only where the score moved.
    delta: (drop: number) => `↓${drop}`,
    deltaFrom: (drop: number, was: number) => `↓${drop} from ${was}`,
    deltaAria: (drop: number, was: number) =>
      `${drop} points lower than its score against everything you own, ${was}`,
    altScore: (score: number) => `${score} scoring what’s free`,
  },

  // ── Surface 2 · commander detail disclosure ───────────────────────────
  detail: {
    disclosureAria: (n: number) => `Show which ${n} cards are in use`,
    disclosureCollapseAria: 'Show all matching cards again',
    hint: 'Tap to see which — and where they went.',
    // Expressive-adjacent, but this is the sentence that must not overclaim.
    // It describes LISTS. Never "in a box", "on a shelf", "sleeved up right now".
    expanded:
      'These twelve are sleeved into decks you’ve finished. You can still build with them — you’d be taking them out of something.',
    expandedFor: (n: number) =>
      `These ${n} are sleeved into decks you’ve finished. You can still build with them — you’d be taking them out of something.`,
    sectionInUse: (n: number) => `In use — ${n}`,
    sectionFree: (n: number) => `Free to build with — ${n}`,
    filteredHeading: (n: number) => `Showing the ${n} in use`,
    showAll: (n: number) => `show all ${n}`,
    listHeading: 'Cards you own that fit',
    announceExpanded: (n: number) => `Showing the ${n} cards already in use`,
    announceCollapsed: (n: number) => `Showing all ${n} matching cards`,
  },

  // ── Surface 4 · decklist over-committed summary ───────────────────────
  // Renders ONLY when count > 0. Not an error: no dismiss, no retry, no icon.
  // Straight-with-a-shrug, per the voice split — this is a real-world problem
  // but not a data-loss or safety one.
  deckSummary: {
    heading: (n: number) =>
      n === 1 ? '1 card here is spoken for twice' : `${n} cards here are spoken for twice`,
    body: (cardName: string, deckCount: number, ownedQty: number) =>
      `${cardName} is on ${deckCount} finished lists and you own ${ownedQty === 1 ? 'one' : ownedQty}. Nothing’s broken here — it’s a shopping decision.`,
    bodyMany: (n: number) =>
      `${n} of these are on more finished lists than you have copies. Nothing’s broken here — it’s a shopping decision.`,
    ariaLabel: (n: number) => `${n} cards in this deck are over-committed`,
  },

  // ── Quantity strings (extends the shipped decks-builder block) ────────
  // `rowOwned` already ships at decks-builder.ts:197 as `×${qty} owned`. It is
  // UNCHANGED. These are the suffixes that join it, so the marker rides an
  // existing string rather than claiming a column.
  quantity: {
    joiner: ' · ',
  },

  // ── quickAdd.rowAria — EXTENDED, NOT REPLACED ─────────────────────
  // The shipped signature is rowAria(name, typeLine, owned: boolean). Keep all
  // three arguments and their order; add ONE optional trailing argument. R1 of
  // this handoff specified a 3-arg replacement that silently dropped typeLine
  // from every Consider row's accessible name — do not reintroduce it.
  //
  // `availability` is one of the marker.*Aria strings above, or null. It is
  // prose, not the visual label: the eye reads "0 free — in Atraxa", the ear
  // hears "no free copies; this one is on your Atraxa list". A free card passes
  // nothing and produces the exact shipped string — the accessible-name form of
  // "silence is the default".
  rowAria: (
    name: string,
    typeLine: string,
    owned: boolean,
    availability?: string | null,
  ) =>
    `${name}, ${typeLine}, ${owned ? 'owned' : 'not owned'}` +
    (availability ? `, ${availability}` : ''),

  // ── Degraded availability read ──────────────────────────────────
  // /commanders only: reuses the shipped DegradedBanner (amber left border,
  // "Retry now"). The builder surfaces fail QUIET — no banner, no message, the
  // marker is simply absent, which is the same thing a player with no
  // commitments sees. A banner is owed only where the failure changes what a
  // control means.
  degraded: {
    heading: 'We can’t see your decks right now',
    body:
      'Ranking and Fit are unaffected. We just can’t tell which cards are already in a deck, so What’s free is unavailable until this comes back.',
    retry: 'Retry now',
    segmentDisabledAria:
      'What’s free is unavailable — we can’t read your decks right now',
    // Both reads down: ONE banner, two sentences, one Retry. Never two banners.
    bodyWithSynergy:
      'Synergy data and deck contents are both unavailable. Ranking continues on pool and role coverage, and What’s free is unavailable until they come back.',
    // /collection has no ranking to mislead, so it fails QUIET — markers absent,
    // Availability trigger disabled with this reason. No banner there.
    collectionFilterDisabledAria:
      'Filtering by availability is unavailable — we can’t read your decks right now',
  },

  // ── /collection (addendum 2) ──────────────────────────────────
  // COUNT-ONLY on both views. Neither the fixed row grid nor the tile caption
  // has room for a proper noun, so collection reuses marker.soft / marker.hard
  // (never marker.hardIn or hardMulti) and the deck name appears in card detail
  // only. Do not "restore" the deck name here without widening a shipped grid.
  collection: {
    // Filter menu. Nothing defaults on; zero-count options render aria-disabled
    // rather than being removed — a menu that changes length between players is
    // worse than one with dim rows.
    filterLabel: 'Availability',
    filterFree: 'Free',
    filterSoft: 'Wanted by a brew',
    filterHard: 'In use',
    filterOver: 'Over-committed',
    filterOptionAria: (label: string, n: number) =>
      `${label}, ${n === 1 ? '1 card' : `${n} cards`}`,
    filterEmptyOptionAria: (label: string) => `${label}, no cards`,
    // Chips reuse the shipped chip row; glyph is the chip's leading dot.
    chipRemoveAria: (label: string) => `Remove filter: ${label.toLowerCase()}`,
    // Row label extends the shipped one — clause lands LAST, after set/rarity.
    // A free card produces today's string with no fourth argument.
    rowAria: (
      name: string,
      typeLine: string,
      qty: number,
      setAndRarity: string,
      availability?: string | null,
    ) =>
      `${name}, ${typeLine}, ${qty === 1 ? '1 copy' : `${qty} copies`}, ${setAndRarity}` +
      (availability ? `, ${availability}` : ''),
    // Card detail carries the FULL clause — the one place on this surface with
    // room for the deck name. Describes a list, never a location.
    detailHeading: 'In your collection',
    detailHardNote: 'You can still build with it — you’d be taking it out of something.',
    detailSoftNote: 'A copy is free — the other is on a list you haven’t finished.',
    detailOverNote:
      'More finished lists want it than you own. Nothing’s broken — it’s a shopping decision.',
  },

  // ── Deck detail roll-up (addendum 2) ─────────────────────────────
  // One region, max two lines, FIXED severity order (over-committed above soft,
  // never sorted by count). The counts are disjoint — a card is either
  // over-committed or softly claimed, never both — so when the soft line
  // follows the red one it says "more", which is the arithmetic done for the
  // player. Soft line is pre-99 only; at Playable/Complete the deck's own
  // claims go hard and any real conflict has already promoted itself.
  // Renders only when a count is above zero. A deck with neither has NO region.
  deckRollup: {
    // §3's over-committed line, unchanged — reproduced here as the ordering anchor.
    overHeading: (n: number) =>
      n === 1 ? '1 card here is spoken for twice' : `${n} cards here are spoken for twice`,

    softHeading: (n: number) =>
      n === 1 ? '1 card here is in another brew too' : `${n} cards here are in other brews too`,
    // Used when the over-committed line is ALSO showing. "more" is load-bearing.
    softHeadingAfterOver: (n: number) =>
      n === 1 ? '1 more is in another brew too' : `${n} more are in other brews too`,
    softBody:
      'Nothing to sort out yet — none of those lists is finished either. Whichever you sleeve first gets them.',
    softBodyShort: 'Nothing to sort out yet — none of those lists is finished either.',

    regionAria: 'Card commitments',
  },
} as const;
