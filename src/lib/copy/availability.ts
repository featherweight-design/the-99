// src/lib/copy/availability.ts — card availability block (#43).
// Shape follows src/lib/copy/decks-builder.ts: flat const object, functions for
// interpolated strings, no JSX. Counts are taken as raw numbers and both
// interpolated and branched on for singular/plural here; what this module does
// NOT do is locale-format them, unlike issue-inspector.ts's toLocaleString
// calls. Every count it renders is a deck or card tally in the low hundreds, so
// there is no separator to get wrong. Voice: Kitchen Table — utility copy stays
// straight; the two expressive moments are marked.
//
// VOCABULARY IS LOAD-BEARING. "free" and "in use" are the two nouns. If the
// product ever prefers "available", it is a swap of `free` → `available` in
// EVERY string below at once — never on one surface. "Deck tax" is banned
// (collides with commander tax). Nothing here may assert where a physical card
// is: we describe LISTS, never boxes, binders or sleeves.
//
// EVERY STATE THAT NAMES A DECK SHIPS A SIBLING THAT DOESN'T (R5 §8). Three
// states name a deck — hard, hard-multi and over — and a degraded read can
// strip the name from any of them, so the count-only variant is part of the
// state rather than a fallback bolted on later. Both siblings take the same
// `CountOnly` suffix, so the next state's author copies a pattern instead of
// inventing one. Silence is the default for a FREE card, never for a degraded
// one.
//
// SELF-EXCLUSION (addendum 2 / R3). On a deck's own decklist the marker scores
// against every deck EXCEPT that one — both severities, no special case. A deck
// holding a card is not competition for itself, and "none free — in Atraxa"
// rendered inside Atraxa names the deck the player is already inside. The soft
// copy already said "other brews" for this reason. Two consequences:
//   • inside a finished deck the HARD state is unreachable — a second finished
//     claim on one copy is over-commitment, so it presents as `overAlsoIn`.
//   • /collection and the commander surfaces have no current deck, so no
//     exclusion applies there; they compute against everything, as in #43.

// §3's over-committed line has two homes: the decklist summary and the deck
// roll-up, where it is the ordering anchor above the soft line. One function so
// the two cannot drift into different sentences.
const spokenForTwice = (n: number) =>
  n === 1
    ? "1 card here is spoken for twice"
    : `${n} cards here are spoken for twice`;

export const availabilityCopy = {
  // ── The marker itself ─────────────────────────────────────────────────
  // Four states. `free` renders NOTHING — there is no string for it, on
  // purpose, so a future edit cannot accidentally give silence a label.
  marker: {
    // soft: free > 0, soft > 0
    soft: (softQty: number) =>
      softQty === 1 ? "1 in a brew" : `${softQty} in a brew`,
    softAria: (softQty: number) =>
      softQty === 1
        ? "1 copy is on an unfinished deck"
        : `${softQty} copies are on unfinished decks`,

    // hard: free = 0. Names the claiming deck ONLY when there is exactly one.
    // "none" rather than "0": every neighbouring number on these surfaces is a
    // quantity you can act on (`54 owned · 8 to buy`, `×3`), and a leading 0
    // beside them reads as one more tally rather than as an absence.
    hard: "none free",
    hardIn: (deckName: string) => `none free, in ${deckName}`,
    hardMulti: (deckCount: number) =>
      deckCount === 1 ? "none free, in 1 deck" : `none free, across ${deckCount} decks`,
    hardAria: (deckName: string) =>
      `no free copies; this one is on your ${deckName} list`,
    hardMultiAria: (deckCount: number) =>
      deckCount === 1
        ? "no free copies; they are on 1 of your finished lists"
        : `no free copies; they are on ${deckCount} of your finished lists`,
    hardAriaCountOnly: "no free copies",

    // over: free < 0. Never names decks — it is a count problem, not a location.
    // One deck CAN be the whole demand: "any number" cards (Relentless Rats,
    // Nazgûl) let a single list claim nine copies of something you own four of.
    // "also in" throughout, matching overAlsoIn below: one grammar for the
    // over clause, whether the second claimant is named or counted.
    over: (shortBy: number) => `short ${shortBy}`,
    overWithDemand: (shortBy: number, deckCount: number) =>
      deckCount === 1
        ? `short ${shortBy}, also in 1 deck`
        : `short ${shortBy}, also in ${deckCount} decks`,
    overAria: (shortBy: number, deckCount: number) =>
      deckCount === 1
        ? `1 of your finished lists includes this card and you own ${shortBy} too few`
        : `${deckCount} of your finished lists include this card and you own ${shortBy} too few`,
    overAriaCountOnly: (shortBy: number) =>
      `you own ${shortBy} too few for the finished lists that include it`,

    // On a deck's OWN list the current deck is excluded from the marker, so
    // "also in N decks" would count the deck the player is standing in. Name the
    // other claimant instead. Decklist-of-the-holder only.
    overAlsoIn: (shortBy: number, otherDeck: string) =>
      `short ${shortBy}, also in ${otherDeck}`,
    overAlsoInAria: (otherDeck: string) =>
      `your ${otherDeck} list also includes this card and you don’t own enough for both`,

    // Tile caption line (sits under the type line, not on the art).
    tileInUse: (deckName: string) => `in use: ${deckName}`,
    tileOver: (deckCount: number) =>
      deckCount === 1 ? "also in 1 deck" : `also in ${deckCount} decks`,
  },

  // ── Surface 1 · commanders list ───────────────────────────────────────
  ranking: {
    // The label does the anti-collision work against `Owned only`: this names
    // ranking, not filtering. Do not shorten it to "Availability".
    label: "Score against",
    all: "Everything I own",
    free: "What’s free",
    allAria: "Rank commanders against everything you own",
    freeAria: "Rank commanders against cards not already in a finished deck",
    // Shown only in the `free` state, under the control.
    freeNote:
      "Cards sleeved into a finished deck don’t count toward these scores.",
    // The long form's second sentence repeats the first's subject and verb, so
    // the contrast lands on the one word that changed. The drawn version
    // ("Unfinished brews still do.") made the reader go back for its subject.
    freeNoteLong:
      "Cards sleeved into a finished deck don’t count toward these scores. Cards in an unfinished brew still do.",
    subtitleAll: "ranked by fit",
    subtitleFree: "ranked by what’s free",
    // Announced on the list’s existing live region when the toggle flips.
    announce: (mode: "all" | "free", n: number) =>
      `${
        mode === "free"
          ? "Re-ranked by what’s free"
          : "Re-ranked by everything you own"
      } · ${n === 1 ? "1 commander" : `${n} commanders`}`,
  },

  // ── The receipt line (surfaces 1 and 2) ───────────────────────────────
  // OPEN ITEM 7: the line ALWAYS renders; only the second clause is
  // conditional. Row height never changes between players.
  receipt: {
    fit: (n: number) =>
      n === 1 ? "1 of your cards fits" : `${n} of your cards fit`,
    fitFree: (n: number) =>
      n === 1 ? "1 of your cards is free" : `${n} of your cards are free`,
    // Appended when inUse > 0. Callers join with ' · '.
    inUse: (n: number) => `${n} already in use`,
    inUseShort: (n: number) => `${n} in use`,
    wantedByBrew: (n: number) =>
      n === 1 ? "1 wanted by a brew" : `${n} wanted by a brew`,
    // Score delta, `free` ranking only, only where the score moved.
    delta: (drop: number) => `↓${drop}`,
    deltaFrom: (drop: number, was: number) => `↓${drop} from ${was}`,
    deltaAria: (drop: number, was: number) =>
      `${drop} points lower than its score against everything you own, ${was}`,
    altScore: (score: number) => `${score} scoring what’s free`,
  },

  // ── Surface 2 · commander detail disclosure ───────────────────────────
  detail: {
    disclosureAria: (n: number) =>
      n === 1 ? "Show which 1 card is in use" : `Show which ${n} cards are in use`,
    disclosureCollapseAria: "Show all matching cards again",
    hint: "Tap to see which, and where they went.",
    // Expressive-adjacent, but this is the sentence that must not overclaim.
    // It describes LISTS. Never "in a box", "on a shelf", "sleeved up right now".
    expandedFor: (n: number) =>
      n === 1
        ? "This one is sleeved into a deck you’ve finished. You can still build with it. You’d be taking it out of something."
        : `These ${n} are sleeved into decks you’ve finished. You can still build with them. You’d be taking them out of something.`,
    sectionInUse: (n: number) => `In use: ${n}`,
    sectionFree: (n: number) => `Free to build with: ${n}`,
    filteredHeading: (n: number) => `Showing the ${n} in use`,
    showAll: (n: number) => `show all ${n}`,
    listHeading: "Cards you own that fit",
    announceExpanded: (n: number) =>
      n === 1
        ? "Showing the 1 card already in use"
        : `Showing the ${n} cards already in use`,
    announceCollapsed: (n: number) =>
      n === 1 ? "Showing the 1 matching card" : `Showing all ${n} matching cards`,
  },

  // ── Surface 4 · decklist over-committed summary ───────────────────────
  // Renders ONLY when count > 0. Not an error: no dismiss, no retry, no icon.
  // Straight-with-a-shrug, per the voice split — this is a real-world problem
  // but not a data-loss or safety one.
  deckSummary: {
    heading: spokenForTwice,
    body: (cardName: string, deckCount: number, ownedQty: number) =>
      `${cardName} is on ${deckCount === 1 ? "1 finished list" : `${deckCount} finished lists`} and you own ${ownedQty === 1 ? "one" : ownedQty}. Nothing’s broken here. It’s a shopping decision.`,
    bodyMany: (n: number) =>
      `${n} of these are on more finished lists than you have copies. Nothing’s broken here. It’s a shopping decision.`,
    ariaLabel: (n: number) =>
      n === 1
        ? "1 card in this deck is over-committed"
        : `${n} cards in this deck are over-committed`,
  },

  // The quick-add row's accessible name lives on the shipped signature in
  // decks-builder.ts, not here — one rowAria, extended in place, so the two
  // cannot drift. `rowOwned` there is UNCHANGED; the marker rides it, joined
  // with ' · ' by the caller, rather than claiming a column of its own.

  // ── Degraded availability read ──────────────────────────────────
  // /commanders only: reuses the shipped DegradedBanner (amber left border,
  // "Retry now"). The builder surfaces fail QUIET — no banner, no message, the
  // marker is simply absent, which is the same thing a player with no
  // commitments sees. A banner is owed only where the failure changes what a
  // control means.
  degraded: {
    heading: "We can’t see your decks right now",
    body: "Ranking and Fit are unaffected. We just can’t tell which cards are already in a deck, so What’s free is unavailable until this comes back.",
    retry: "Retry now",
    segmentDisabledAria:
      "What’s free is unavailable. We can’t read your decks right now",
    // Both reads down: ONE banner, two sentences, one Retry. Never two banners.
    bodyWithSynergy:
      "Synergy data and deck contents are both unavailable. Ranking continues on pool and role coverage, and What’s free is unavailable until they come back.",
    // /collection has no ranking to mislead, so it fails QUIET — markers absent,
    // Availability trigger disabled with this reason. No banner there.
    collectionFilterDisabledAria:
      "Filtering by availability is unavailable. We can’t read your decks right now",
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
    filterLabel: "Availability",
    filterFree: "Free",
    filterSoft: "Wanted by a brew",
    filterHard: "In use",
    filterOver: "Over-committed",
    filterOptionAria: (label: string, n: number) =>
      `${label}, ${n === 1 ? "1 card" : `${n} cards`}`,
    filterEmptyOptionAria: (label: string) => `${label}, no cards`,
    // Chips reuse the shipped chip row; glyph is the chip's leading dot.
    chipRemoveAria: (label: string) => `Remove filter: ${label.toLowerCase()}`,
    // Row label extends the shipped one — clause lands LAST, after set/rarity.
    // A free card passes no `availability` and produces today's string
    // byte-for-byte. Note this signature takes it fifth, after `setAndRarity`;
    // the quick-add rowAria in decks-builder.ts takes it fourth. The clause
    // lands last in both, which is the part that has to match.
    rowAria: (
      name: string,
      typeLine: string,
      qty: number,
      setAndRarity: string,
      availability?: string | null,
    ) =>
      `${name}, ${typeLine}, ${qty === 1 ? "1 copy" : `${qty} copies`}, ${setAndRarity}` +
      (availability ? `, ${availability}` : ""),
    // Heads the allocation receipt. Describes a list, never a location. Deck
    // names are NOT in this block's copy: the marker inside it is `nameless` and
    // the naming happens in the claim rows below, so there is no deck-name
    // interpolation to look for in these keys.
    detailHeading: "In your collection",
    // The named deck is a link here, and only here. Its visible text is a bare
    // proper noun that truncates, so the link's own name has to say what it
    // opens.
    detailDeckLinkAria: (deckName: string) => `Open the ${deckName} deck`,
    // The allocation receipt (#353). The old block gave a total and a state and
    // nothing between them: "×17 · 1 in a brew" left a reader to guess whether
    // the other sixteen were spoken for. These keys are one sentence in three
    // parts — the total above, where the copies went, and what that leaves —
    // and the parts have to add up on screen, so every count below comes
    // straight from the query rather than being derived here.
    //
    // FINISHED LISTS HOLD, UNFINISHED LISTS WANT. That is the whole model in two
    // verbs, and it is the same distinction `receipt.wantedByBrew` draws. A
    // finished list has the card; an unfinished one has asked for it and holds
    // nothing yet. Do not level these to one verb: the difference between them
    // is exactly what `free` counts.
    detailClaimsHeading: "On your lists",
    detailClaimHolds: (n: number) => `holds ${n}`,
    detailClaimWants: (n: number) => `wants ${n}`,
    // Reads under the deck rows and must reconcile with the ×N above it:
    // `inUse + free === owned` off-decklist, which is the only place this
    // renders. Both halves always print, zeroes included — the line is an
    // accounting, and a dropped term makes the reader do the subtraction.
    detailSplit: (inUse: number, free: number) => `${inUse} in use · ${free} free`,
    // Over-committed: the split above would have to print a negative, so the
    // arithmetic is stated as the comparison it actually is.
    detailSplitOver: (wanted: number, owned: number) =>
      `${wanted} wanted by finished lists · you own ${owned}`,
    // THE NOTES DO NO ARITHMETIC (#355). The split line above them already
    // accounts for every copy, and the note's job is the consequence. The soft
    // note used to read "A copy is free — the other is on a list you haven't
    // finished", which asserts a collection of exactly two and was drawn under a
    // ×17. Nothing here may imply a count the block has not printed.
    detailHardNote:
      "You can still build with it. You’d be taking it out of something.",
    // Count-aware for the same reason `deckRollup.softHeading` is: the number of
    // brewing claimants is the one figure this sentence turns on, and a single
    // form has to lie about one of the two cases.
    //
    // Scoped to the lists that WANT it, not to the rows above. The soft state is
    // `free > 0 && soft > 0`, which permits a finished list holding copies at the
    // same time, so the design's "none of those lists is finished" would read as
    // a claim about every row on screen and contradict the ones marked `holds`.
    // `wants` is the same verb `detailClaimWants` prints, so the sentence points
    // at its rows rather than describing them.
    //
    // Both branches close on "gets it", singular. `brewCount` counts LISTS, not
    // copies, so "gets them" would imply a number of copies the block has not
    // printed — the same rule the note's own header states.
    detailSoftNote: (brewCount: number) =>
      brewCount === 1
        ? "Nothing to sort out yet. The list that wants it isn’t finished. Whichever you sleeve first gets it."
        : "Nothing to sort out yet. The lists that want it aren’t finished. Whichever you sleeve first gets it.",
    detailOverNote:
      "More finished lists want it than you own. Nothing’s broken. It’s a shopping decision.",
  },

  // ── Deck detail roll-up (addendum 2) ─────────────────────────────
  // One region, max two lines, FIXED severity order (over-committed above soft,
  // never sorted by count). The counts are disjoint — a card is either
  // over-committed or softly claimed, never both — so when the soft line
  // follows the red one it says "more", which is the arithmetic done for the
  // player. Soft line is pre-99 only; at 99 and above the deck's own
  // claims go hard and any real conflict has already promoted itself.
  // Renders only when a count is above zero. A deck with neither has NO region.
  deckRollup: {
    // §3's over-committed line, unchanged — the ordering anchor above the soft
    // line, and the same function deckSummary.heading uses.
    overHeading: spokenForTwice,

    softHeading: (n: number) =>
      n === 1
        ? "1 card here is in another brew too"
        : `${n} cards here are in other brews too`,
    // Used when the over-committed line is ALSO showing. "more" is load-bearing.
    softHeadingAfterOver: (n: number) =>
      n === 1
        ? "1 more is in another brew too"
        : `${n} more are in other brews too`,
    softBody:
      "Nothing to sort out yet. None of those lists is finished either. Whichever you sleeve first gets them.",
    softBodyShort:
      "Nothing to sort out yet. None of those lists is finished either.",

    regionAria: "Card commitments",
  },
} as const;
