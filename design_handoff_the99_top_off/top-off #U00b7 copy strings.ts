/**
 * src/lib/copy/top-off.ts — #360, folding #359 and #361.
 *
 * ADDS and REPLACES inside synergyCopy.lastSlots. The heading is untouched;
 * three strings are deleted with the controls they named (see the REPLACES
 * block at the foot of this file). Nothing in recommendations.ts is edited —
 * fill.provenanceShort and fill.fillingRows are both REUSED VERBATIM, which is
 * the point of them.
 *
 * Every count in here carries its denominator in the same string. No
 * percentage is used for a count; the inclusion figure is a percentage because
 * it is a percentage of decks, and it is the shipped synergy row's own atom.
 */

export const topOffCopy = {
  // ── The strip, closed ─────────────────────────────────────────────────
  strip: {
    /** UNCHANGED — synergyCopy.lastSlots.heading. Named for the open slots,
     *  never for 31, because a partly filled deck has a different number. */
    heading: (n: string) => `The last ${n}`,

    /** Gains the candidate count. The player is about to be shown a list, and
     *  its length is the first thing they are owed about it. */
    caption: (n: string, cand: string) =>
      `${n} slots open · ${cand} candidates ranked by synergy for this commander`,
    captionMobile: (n: string, cand: string) =>
      `${n} slots open · ${cand} candidates ranked`,

    /** The door. A verb that opens something, not a verb that does something —
     *  the whole of #360 scope 1 is in the difference. `Choose` also names the
     *  player as the one choosing, which the two shipped CTAs did not. */
    open: (n: string) => `Choose the last ${n}`,
    openAria: (n: string) => `Choose the cards for the last ${n} slots`,
    close: 'Close the list',

    /** REPLACES lastSlots.ownedNote. That string existed to explain a number on
     *  a button face; there is no such number now. This one explains a default
     *  and makes the safety promise the review step is for. */
    doorNote: (owned: string) =>
      `${owned} of them are in your collection and arrive ticked. Nothing is added until you say so.`,
    /** Reopening after a partial accept. Says what is left and that the
     *  selection survived, so closing the list is never a loss. */
    doorNoteAgain: (cand: string) =>
      `You own none of the ${cand} left. The list reopens where you left it, declines and all.`,
    /** The variant when some of what is left is owned. Two strings rather than
     *  one interpolation, because 'you own none of' and 'you own N of' are
     *  different sentences and the first is the common one. */
    doorNoteAgainOwned: (owned: string, cand: string) =>
      `You own ${owned} of the ${cand} left. The list reopens where you left it, declines and all.`,
  },

  // ── The list, open ────────────────────────────────────────────────────
  list: {
    /** Accessible name for the checkbox group. Carries both counts, because a
     *  reader cannot see the head. */
    groupAria: (cand: string, n: string) =>
      `${cand} candidates for the last ${n} slots`,

    head: (ticked: string, n: string, cand: string, untouched: string) =>
      `${ticked} of ${n} slots ticked · ${cand} candidates, ${untouched} untouched`,
    headMobile: (ticked: string, n: string) => `${ticked} of ${n} ticked`,

    tickOwned: (owned: string) => `Tick the ${owned} I own`,
    tickOwnedAria: (owned: string) =>
      `Tick all ${owned} candidates you already own`,
    clearTicks: 'Clear all ticks',

    /** Column headers. The two figures sit under them at both widths on
     *  desktop; at phone they are labelled by the aria name instead. */
    colCard: 'Card',
    colSynergy: 'Synergy',
    colDecks: 'Decks',
    ordering: 'ranked · synergy, then inclusion, then name',

    /** The cap. Stated as a count with its denominator, and it says what to do
     *  rather than only what is forbidden. Also the aria-describedby target of
     *  every inert tick box, so a reader who tabs into one hears why. */
    cap: (n: string) => `${n} of ${n} slots ticked — untick one to swap another in`,

    /** The row's accessible name. All four visual atoms are aria-hidden, so
     *  this is the only place the marks are spoken. */
    rowAria: (
      name: string,
      ownership: string,
      syn: string,
      inc: string,
    ) => `${name}. ${ownership} Synergy plus ${syn} points. In ${inc} of decks.`,
    /** Three ownership clauses for the above, matching the three occupancies of
     *  the availability slot. The price is spoken; the collapsed-glyph problem
     *  does not exist here because the tag never collapses on this surface. */
    ownedClause: (qty: string) => `×${qty} in your collection.`,
    /** Own it, every copy sleeved elsewhere — the marker's count-only state.
     *  Spoken as a fact, never as a warning: it does not gate the tick. */
    committedClause: (qty: string) => `×${qty} in your collection, none free.`,
    unownedClause: (price: string) => `Not in your collection, ${price}.`,

    /** The cost is spoken from CostPips' own sr-only alternative — the SHIPPED
     *  string, reused, and read before the ownership clause. It is never
     *  capped: the +N pip truncates the drawing, not the sentence, and a reader
     *  who cannot see the track is the one reader for whom truncation is not a
     *  density trade. No string is added here; manaCopy.costAria is the source. */

    /** A tick that stops being legal while the list is open. It unticks
     *  itself, keeps its slot, and says which rule caught it. */
    illegalInDeck: 'already in the deck',
    illegalColour: 'not in these colours',
    illegalUntickable: 'untickable',

    /** A decline. Lifted from the tuning card's dismissed row, deliberately:
     *  same act, same shape, same words, and no question asked. */
    declined: 'not this one',
    restore: 'Show it again',
    restoreAria: (name: string) => `Put ${name} back on the list`,
  },

  // ── The commit row ────────────────────────────────────────────────────
  commit: {
    /** States what it will place. At zero it loses the count rather than
     *  printing 'Add 0 cards', and goes disabled with no error. */
    add: (ticked: string) => `Add ${ticked} cards`,
    addEmpty: 'Add cards',
    addAria: (ticked: string, total: string) =>
      `Add ${ticked} cards to the deck, ${total} of 99`,
    cancel: 'Cancel',

    /** The consequence, before the tap. */
    consequence: (total: string) => `${total} of 99 when added`,
    /** The money, said once, in --warning, beside the count it belongs to.
     *  This is the only figure on the surface that is about spending. */
    toBuy: (b: string, money: string) => `${b} to buy · ${money}`,
    /** Printed when the selection leaves slots open. Not a warning and not a
     *  nudge — an assurance that stopping short is a choice with a way back. */
    slotsStayOpen: (n: string) =>
      `${n} slots stay open — you can come back to them`,

    /** Zero ticks, and the zero-owned case, which is the same state. */
    nothingTicked: 'nothing ticked — the list arrives with what you own already ticked',
    nothingTickedUnowned: (cand: string) =>
      `nothing ticked — you own none of these ${cand}, so every tick is one to buy`,

    /** UNCHANGED — recommendationsCopy.fill.fillingRows. A 27-row write is
     *  exactly what that string was written for; a second in-flight
     *  vocabulary for the same act would be two voices. */
    inFlight: (ticked: string) => `Sleeving ${ticked} cards…`,
    /** UNCHANGED — synergyCopy.lastSlots.topUpFailed. */
    refused: 'We couldn’t add those. The deck is unchanged.',
  },

  // ── The provenance ledger (#359, in full) ─────────────────────────────
  //
  // R2. The container is the SHIPPED fill provenance strip; it now holds ONE
  // LINE PER PASS, oldest first, never reordered. The seed is a line in it.
  //
  // No string carries a timestamp or an age. R1's 'just now' is gone with the
  // single clause: a pass is reversible at any age, so a time word would invite
  // the player to work out whether the undo has expired. It has not, ever.
  //
  // Every line states a COUNT OF CARDS, never a percentage and never a bare
  // number: 'the seed' and 'top-off 2' are labels, '68 cards' is the figure.
  ledger: {
    header: (total: string) => `Where these ${total} cards came from`,
    headerMeta: (passes: string, buy: string) =>
      `${passes} passes · ${buy} to buy`,
    /** One pass, so 'passes' would be wrong and the count is not worth saying. */
    headerMetaOne: (buy: string) => `one pass · ${buy} to buy`,

    /** Pass labels. Ordinals are STABLE and never renumber when a pass is
     *  undone — 'top-off 3' can exist with no 'top-off 1' above it. */
    seedLabel: 'the seed',
    passLabel: (i: string) => `top-off ${i}`,

    /** The seed's sentence — the shipped provenance wording, recast as a line. */
    seedLine: (n: string, buy: string) =>
      `${n} cards — the roles and the mana base, ${buy} to buy.`,
    seedLineNoBuy: (n: string) =>
      `${n} cards — the roles and the mana base.`,
    /** The seed NAMES its reversal rather than growing a button for it: the
     *  sweep is a rule and a row away in the toolbar, and duplicating it here
     *  would put two destructive controls in one box. */
    seedReversal: 'the sweep reverses it',

    passLine: (n: string, slots: string, buy: string) =>
      `${n} cards you chose from the last ${slots}, ${buy} of them to buy.`,
    passLineNoBuy: (n: string, slots: string) =>
      `${n} cards you chose from the last ${slots}.`,
    /** A pass is a SET OF ROWS, not a transaction. A row leaves it two ways and
     *  the line NAMES WHICH, because they mean opposite things: 'removed' is a
     *  rejection, 'now yours' is an endorsement — the shipped keep control
     *  cleared the auto flag, so the card is the player's and this ledger stops
     *  claiming it. Blurring the two into one 'gone' count would be worse than
     *  counting nothing. At zero survivors the whole line goes, either way.
     *
     *  'now yours' rather than 'kept': the ledger's voice is the app accounting
     *  for what it did, so the clause that hands a card over should sound like
     *  handing it over. 'kept' is the CONTROL's word and stays its own. */
    passRecounted: (placed: string, removed: string) =>
      `${placed} cards · ${removed} removed since`,
    passRecountedKept: (placed: string, kept: string) =>
      `${placed} cards · ${kept} now yours`,
    passRecountedBoth: (placed: string, kept: string, removed: string) =>
      `${placed} cards · ${kept} now yours, ${removed} removed since`,
    /** Every card kept, none removed — its own string because 'all' is the
     *  sentence a player wants confirmed just before the line disappears. */
    passRecountedAllKept: (placed: string) => `all ${placed} now yours`,

    /** A deck that predates the ledger. NO seed line is synthesised: keeping has
     *  already eaten some of its auto rows, and decks.filled stays true forever,
     *  so a count inferred from either would be a lie in a table whose whole job
     *  is provenance. This line enumerates nothing, so it carries neither
     *  'Show these' nor an undo, and it goes for good when the first pass lands. */
    legacy:
      'This deck was built before we started keeping this record. ' +
      'Anything we place from here on is listed below.',

    /** #359's 'before deciding'. A toggle, not a filter — it MARKS the pass's
     *  rows and hides nothing, so the word is 'show', not 'only'. */
    mark: (n: string) => `Show these ${n}`,
    markAria: (n: string, pass: string) =>
      `Mark the ${n} cards from ${pass} in the deck below`,
    unmarkAria: (pass: string) => `Clear the mark on ${pass}`,

    /** 'these' because the line is the antecedent; the aria name says which
     *  pass, because three ledger lines mean three of these buttons. */
    undo: (n: string) => `Undo these ${n}`,
    undoOne: 'Undo this 1',
    undoAria: (n: string, pass: string) =>
      `Undo the ${n} cards from ${pass}, and put back what they cost`,
    undoInFlight: (n: string) => `Putting ${n} back…`,
    undoFailed: 'We couldn’t put those back. The deck is unchanged.',
  },

  // ── The bottom slot, at 390px ─────────────────────────────────────────
  //
  // The commit bar takes the quick-add dock's slot; the dock collapses to this
  // one line rather than vanishing, so the affordance is accounted for. It is
  // a statement about what will happen, not an instruction: the player did not
  // ask for quick-add to go away, so it does not read as their doing.
  dock: {
    retired: 'Quick-add is back when you close the list',
    retiredAnnounce: 'Quick-add hidden while the list is open.',
  },

  // ── Announcements ─────────────────────────────────────────────────────
  //
  // One per settle, on the existing region. Ticking is DEBOUNCED: thirty-one
  // fast taps is one announcement, which is the shipped rule from the
  // selection surface.
  announce: {
    opened: (cand: string, n: string, ticked: string) =>
      `${cand} candidates for ${n} slots. ${ticked} already ticked.`,
    ticked: (ticked: string, n: string, buy: string) =>
      `${ticked} of ${n} ticked, ${buy} to buy.`,
    tickedNoBuy: (ticked: string, n: string) => `${ticked} of ${n} ticked.`,
    capped: (n: string) => `${n} of ${n} slots ticked.`,
    added: (added: string, total: string, buy: string) =>
      `${added} cards added. ${total} of 99, ${buy} to buy.`,
    addedNoBuy: (added: string, total: string) =>
      `${added} cards added. ${total} of 99.`,
    declined: (name: string, ticked: string, n: string) =>
      `${name} set aside. ${ticked} of ${n} ticked.`,
    undone: (added: string, total: string) =>
      `${added} cards put back. ${total} of 99.`,
    /** The mark is a visual grouping, so it is the one thing on this surface a
     *  reader would otherwise get nothing from. */
    marked: (n: string, pass: string) =>
      `${n} cards from ${pass} marked in the deck.`,
    markCleared: 'Mark cleared.',
  },
} as const;

// ── REPLACES — edits inside synergyCopy.lastSlots ───────────────────────────
//
// 1. lastSlots.fillOwned / .fillOwnedAria — DELETED with control A.
//    'Fill {n} from my collection' named a one-tap commit. There is no such
//    control; its behaviour survives as the list's PRESELECTION, which is why
//    strip.doorNote states the same number in the same place.
//
// 2. lastSlots.topUp / .topUpAria — DELETED with control B (#361).
//    'Top up with cards to buy' named the same act as A with the ownership
//    filter lifted. Ticking an unowned row is that act now, and it needs no
//    name because the row's own buy tag already says what it is.
//
// 3. lastSlots.fillFailed — DELETED. Two refusal strings for two controls
//    collapse to one: commit.refused, which is .topUpFailed unchanged. A
//    mixed commit could not have chosen between them anyway.
//
// 4. lastSlots.ownedNote — REPLACED by strip.doorNote. It existed to explain
//    why the number on A's face was smaller than the gap. There is no number
//    on a face now, and the sentence's new job is to state the default and
//    promise that nothing has happened yet.
//
// 5. lastSlots.short — KEPT VERBATIM, and NARROWED. It now prints in exactly
//    one state: the candidate list is empty (STATES §13). It must never print
//    when a player simply left rows unticked — 'your collection ran out' would
//    be false, and blaming the collection for the player's own restraint is
//    the worst sentence this surface could say. The stopping-short case is
//    strip.captionMobile + strip.doorNoteAgain, which are neutral.
//
// 6. lastSlots.caption / .captionMobile — REPLACED, gaining the candidate
//    count. Same shape, one more figure, still one line at 390px.
//
// 7. lastSlots.filledAnnounce / .shortAnnounce / .boughtAnnounce — REPLACED by
//    announce.added / .addedNoBuy. Three announcements existed because two
//    controls could settle three ways. One commit settles two ways: with money
//    or without.
//
// 8. recommendationsCopy.fill.provenanceShort — RECAST, not deleted. Its
//    wording survives as ledger.seedLine (the seed is a line in the ledger,
//    and its sentence is the one the strip already said) and, unchanged, as
//    the exhausted-list sentence in STATES §13.
//
// R1 strings that did not survive R2:
//   provenance.clause / .clauseNoBuy / .undo / .undoAria — the single
//   last-batch clause. It answered the reload with client memory, which is to
//   say it did not, and it could not say 'independently of the seed' or 'which
//   cards came from which pass'. The ledger says all three.
//
// UNTOUCHED, and reused verbatim:
//   recommendationsCopy.fill.fillingRows ....... commit.inFlight
//   recommendationsCopy.fill.provenanceShort ... the exhausted-list sentence
//   autoCopy.clearAll / .clearAllMobile / ...... the sweep, unmoved
//     .swept / .sweptUndo
//   autoCopy.keptNote .......................... THE DECK's kept total, and the
//     only one on the surface. The ledger reports per PASS and never sums it,
//     which is why these are not one fact printed twice. Also the reason the
//     note must STAY in the toolbar: at 0 auto the sweep is absent and so is
//     the ledger, and the note still has something true to say.
//   autoCopy.keep / .keepAll / .keptAnnounce ... the graduation acts, unmoved.
//     R3 makes them load-bearing for this surface — keeping is how a player
//     protects a card from a pass undo — without changing a word of them.
//   addPanelCopy.tile.* and every buy tag ...... the row's atoms
//   manaCopy.costAria .......................... the cost, spoken uncapped
//   the count-only availability strings ........ the marker in the slot
//   synergyCopy.lastSlots.heading .............. the heading
