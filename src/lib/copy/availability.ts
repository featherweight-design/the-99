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
//   • inside a committed deck the HARD state is unreachable — a second committed
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

/**
 * `short N`, the figure always drawn (Hugh, 2026-09-28). `bareOne` is the deck page's own list alone:
 * a card there is nearly always one copy short, and `short` says it. Everywhere else the reader is
 * looking across decks or at candidates, and how many copies to find is what they need.
 */
function shortWord(shortBy: number, bareOne = false): string {
  return bareOne && shortBy === 1 ? "short" : `short ${shortBy}`;
}

export const availabilityCopy = {
  // ── The marker itself ─────────────────────────────────────────────────
  // Four states. `free` renders NOTHING — there is no string for it, on
  // purpose, so a future edit cannot accidentally give silence a label.
  marker: {
    // soft: free > 0, soft > 0
    soft: (softQty: number) =>
      softQty === 1 ? "1 in a draft" : `${softQty} in a draft`,
    softAria: (softQty: number) =>
      softQty === 1
        ? "1 copy is on a draft"
        : `${softQty} copies are on drafts`,

    // hard: free = 0. Names the claiming deck ONLY when there is exactly one.
    // "none" rather than "0": every neighbouring number on these surfaces is a
    // quantity you can act on (`54 owned · 8 to buy`, `×3`), and a leading 0
    // beside them reads as one more tally rather than as an absence.
    hard: "none free",
    hardIn: (deckName: string) => `none free, in ${deckName}`,
    hardMulti: (deckCount: number) =>
      deckCount === 1 ? "none free, in 1 deck" : `none free, across ${deckCount} decks`,
    hardAria: (deckName: string) =>
      `no free copies; this one is in your ${deckName} deck`,
    hardMultiAria: (deckCount: number) =>
      deckCount === 1
        ? "no free copies; they are on 1 of your committed decks"
        : `no free copies; they are on ${deckCount} of your committed decks`,
    hardAriaCountOnly: "no free copies",

    // over: free < 0. Never names decks — it is a count problem, not a location.
    // One deck CAN be the whole demand: "any number" cards (Relentless Rats,
    // Nazgûl) let a single list claim nine copies of something you own four of.
    // "also in" throughout, matching overAlsoIn below: one grammar for the
    // over clause, whether the second claimant is named or counted.
    //
    // The count is always drawn (Hugh, 2026-09-28), which reverses 2026-09-26's "only above one"
    // everywhere but the deck page's own list: see `shortWord`. The aria strings below keep the
    // count whatever the label does.
    over: (shortBy: number, bareOne = false) => shortWord(shortBy, bareOne),
    overWithDemand: (shortBy: number, deckCount: number, bareOne = false) =>
      deckCount === 1
        ? `${shortWord(shortBy, bareOne)}, also in 1 deck`
        : `${shortWord(shortBy, bareOne)}, also in ${deckCount} decks`,
    overAria: (shortBy: number, deckCount: number) =>
      deckCount === 1
        ? `1 of your committed decks includes this card and you own ${shortBy} too few`
        : `${deckCount} of your committed decks include this card and you own ${shortBy} too few`,
    overAriaCountOnly: (shortBy: number) =>
      `you own ${shortBy} too few for the committed decks that include it`,

    // On a deck's OWN list the current deck is excluded from the marker, so
    // "also in N decks" would count the deck the player is standing in. Name the
    // other claimant instead. Decklist-of-the-holder only.
    overAlsoIn: (shortBy: number, otherDeck: string, bareOne = false) =>
      `${shortWord(shortBy, bareOne)}, also in ${otherDeck}`,
    overAlsoInAria: (otherDeck: string) =>
      `your ${otherDeck} deck also includes this card and you don’t own enough for both`,

    // Tile caption line (sits under the type line, not on the art).
    tileInUse: (deckName: string) => `in use: ${deckName}`,
    tileOver: (deckCount: number) =>
      deckCount === 1 ? "also in 1 deck" : `also in ${deckCount} decks`,
  },

  // ── Surface 1 · commanders list ───────────────────────────────────────
  ranking: {
    // The control's own label, segments and aria live in `lanes.ts` under
    // `commandersCopy.availability`, which is what `availability-control.tsx`
    // renders. A second set here said "Score against · Everything I own ·
    // What’s free" and reached no screen, so it read as the shipped name for a
    // control that has never carried it. Removed with the rename rather than
    // left to contradict it.
    //
    // Only those five. `freeNoteLong`, `subtitleAll` and `subtitleFree` below
    // are dead too — the two-lane split retired the subtitle they fed — but
    // they do not NAME this control, so they belong to the dead-key cleanup
    // this change deliberately leaves alone rather than to the rename.
    //
    // Shown only in the `free` state, under the control.
    freeNote:
      "Cards sleeved into a committed deck don’t count toward these scores.",
    // The long form's second sentence repeats the first's subject and verb, so
    // the contrast lands on the one word that changed. The drawn version
    // ("Unfinished brews still do.") made the reader go back for its subject.
    freeNoteLong:
      "Cards sleeved into a committed deck don’t count toward these scores. Cards in a draft still do.",
    subtitleAll: "ranked by fit",
    subtitleFree: "ranked by what’s free",
    // Announced on the list’s existing live region when the toggle flips.
    //
    // Names the mode with the words the control itself uses, which it did not:
    // it said "what’s free" and "everything you own" while the segments on
    // screen read `Free cards only` and `All my cards`, so a screen-reader user
    // was given a second name for one control. "Ranked from" rather than
    // "Re-ranked", because free mode also decides which commanders the list
    // holds, and the count beside it is what moved.
    announce: (mode: "all" | "free", n: number) =>
      `${
        mode === "free" ? "Ranked from free cards only" : "Ranked from all my cards"
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
    wantedByDraft: (n: number) =>
      n === 1 ? "1 wanted by a draft" : `${n} wanted by a draft`,
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
        ? "This one is sleeved into a deck you’ve committed. You can still build with it. You’d be taking it out of something."
        : `These ${n} are sleeved into decks you’ve committed. You can still build with them. You’d be taking them out of something.`,
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
      `${cardName} is on ${deckCount === 1 ? "1 committed deck" : `${deckCount} committed decks`} and you own ${ownedQty === 1 ? "one" : ownedQty}. Nothing’s broken here. It’s a shopping decision.`,
    bodyMany: (n: number) =>
      `${n} of these are on more committed decks than you have copies. Nothing’s broken here. It’s a shopping decision.`,
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
    body: "Ranking and Fit are unaffected. We just can’t tell which cards are already in a deck, so Free cards only is unavailable until this comes back.",
    retry: "Retry now",
    segmentDisabledAria:
      "Free cards only is unavailable. We can’t read your decks right now",
    // Both reads down: ONE banner, two sentences, one Retry. Never two banners.
    bodyWithSynergy:
      "Synergy data and deck contents are both unavailable. Ranking continues on pool and role coverage, and Free cards only is unavailable until they come back.",
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
    filterSoft: "Wanted by a draft",
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
      /**
       * The card's standing bracket facts, already joined. Placed straight after the
       * NAME rather than at the end, because it describes the card and everything
       * following it describes this player's copies — and the drawn glyph is
       * aria-hidden precisely so this clause can sit where the reading order wants it.
       */
      facts?: string | null,
      /**
       * Combo awareness state 1, and it lands LAST for the same reason the availability
       * clause does: it is about this player's copies — two halves owned and unassembled —
       * rather than about the card.
       *
       * It is also the only voicing. The drawn clause REPLACES the visible type line, and its
       * glyph is aria-hidden, so a row without this would lose the sentence entirely while
       * still reading the type line this clause is standing in for.
       */
      combo?: string | null,
    ) =>
      `${name}${facts ? `, ${facts}` : ""}, ${typeLine}, ` +
      `${qty === 1 ? "1 copy" : `${qty} copies`}, ${setAndRarity}` +
      (availability ? `, ${availability}` : "") +
      (combo ? `, ${combo}` : ""),
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
    // COMMITTED DECKS HOLD, DRAFTS WANT. That is the whole model in two
    // verbs, and it is the same distinction `receipt.wantedByDraft` draws. A
    // committed deck has the card; a draft has asked for it and holds
    // nothing yet. Do not level these to one verb: the difference between them
    // is exactly what `free` counts.
    detailClaimsHeading: "In your decks",
    detailClaimHolds: (n: number) => `holds ${n}`,
    detailClaimWants: (n: number) => `wants ${n}`,
    // ALLOCATION IS A THIRD AXIS AND TAKES A THIRD PAIR — the card assignments
    // handoff's vocabulary ruling 4, verbatim: keying `holds` / `wants` on who
    // got the copy would make `wants 1` mean "committed but lost the copy" on one
    // row and "not committed at all" on the next. These two words are the ones
    // `/decks/[id]/changes` already draws for this question, borrowed rather than
    // re-coined so one axis has one vocabulary.
    //
    // Drawn only while the card is contested: with copies enough for everyone,
    // `gets it` on every row is a word per row saying nothing.
    detailClaimGets: "gets it",
    detailClaimBuys: "buys it",
    // The folded case: some of the ask covered, the rest bought. A bare `gets it`
    // would claim the whole ask was covered, and `buys it` that none of it was.
    detailClaimGetsPartial: (allocated: number, wanted: number) =>
      `gets ${allocated} of ${wanted}`,
    // Reads under the deck rows and must reconcile with the ×N above it:
    // `inUse + free === owned` off-decklist, which is the only place this
    // renders. Both halves always print, zeroes included — the line is an
    // accounting, and a dropped term makes the reader do the subtraction.
    detailSplit: (inUse: number, free: number) => `${inUse} in use · ${free} free`,
    // Over-committed: the split above would have to print a negative, so the
    // arithmetic is stated as the comparison it actually is.
    //
    // `by finished lists` was cut on 2026-09-16. It qualified the figure against
    // the brews in the rows above, and `detailDraftsUncounted` now says exactly
    // that one line below in a sentence, so the qualifier restated the next
    // line. With no brew in the list there is nothing for it to disambiguate.
    detailSplitOver: (wanted: number, owned: number) =>
      `${wanted} wanted · you own ${owned}`,
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
    // `free > 0 && soft > 0`, which permits a committed deck holding copies at the
    // same time, so the design's "none of those lists is finished" would read as
    // a claim about every row on screen and contradict the ones marked `holds`.
    // `wants` is the same verb `detailClaimWants` prints, so the sentence points
    // at its rows rather than describing them.
    //
    // Both branches close on "gets it", singular. `draftCount` counts LISTS, not
    // copies, so "gets them" would imply a number of copies the block has not
    // printed — the same rule the note's own header states.
    detailSoftNote: (draftCount: number) =>
      draftCount === 1
        ? "Nothing to sort out yet. The deck that wants it is still a draft. Whichever you sleeve first gets it."
        : "Nothing to sort out yet. The decks that want it are still drafts. Whichever you sleeve first gets it.",
    detailOverNote:
      "More committed decks want it than you own. Nothing’s broken. It’s a shopping decision.",
    // Why the shortfall above is smaller than the rows suggest. `short N` counts
    // committed decks only, deliberately — nothing is sleeved in a brew, so no copy
    // has gone anywhere — and a reader looking at five lists wanting one card has
    // no way to tell that from a miscount. This says which lists were left out and
    // why, and prints no figure of its own beyond the count of them.
    //
    // Drawn only where a committed deck is already involved. In the soft state
    // every claimant is a brew and `detailSoftNote` is the whole story, so this
    // would repeat it.
    detailDraftsUncounted: (draftCount: number) =>
      draftCount === 1
        ? "The draft isn’t counted: nothing is sleeved in it yet."
        : `The ${draftCount} drafts aren’t counted: nothing is sleeved in them yet.`,
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
        ? "1 card here is in another draft too"
        : `${n} cards here are in other drafts too`,
    // Used when the over-committed line is ALSO showing. "more" is load-bearing.
    softHeadingAfterOver: (n: number) =>
      n === 1
        ? "1 more is in another draft too"
        : `${n} more are in other drafts too`,
    softBody:
      "Nothing to sort out yet. None of those is past a draft either. Whichever you sleeve first gets them.",
    softBodyShort:
      "Nothing to sort out yet. None of those is past a draft either.",

    regionAria: "Card commitments",
  },
} as const;
