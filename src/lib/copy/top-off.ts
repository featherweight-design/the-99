/**
 * src/lib/copy/top-off.ts — #360, folding #359 and #361.
 *
 * ADDS and REPLACES inside synergyCopy.lastSlots. The heading is untouched;
 * three strings are deleted with the controls they named (see the REPLACES
 * block at the foot of this file). recommendations.ts loses its six
 * fill.provenance* sentences to the ledger, and fill.fillingRows moves here as
 * commit.inFlight.
 *
 * Every count in here carries its denominator in the same string. No
 * percentage is used for a count; the inclusion figure is a percentage because
 * it is a percentage of decks, and it is the shipped synergy row's own atom.
 */

import { synergyCopy } from "./synergy-discovery";
// TYPE-ONLY, so this copy module still imports no runtime code but the noun table's
// completeness is the type system's claim rather than a comment's.
import type { CompositionTargets } from "../profile/types";

// Counts arrive already stringified from the callers, so the singular test is
// against "1" rather than a number. Applied by eng where the handoff pluralised
// unconditionally, and flagged to Design for ratification — the same call, and
// the same helper shape, as `plural` in decks-builder.ts. A deck one card short
// of full otherwise reads "Add 1 cards" and "1 slots stay open".
const plural = (n: string, one: string, many: string) =>
  `${n} ${n === '1' ? one : many}`;

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st. */
function ordinal(i: string): string {
  const n = Number(i);
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${i}${suffix}`;
}

export const topOffCopy = {
  // ── The strip, closed ─────────────────────────────────────────────────
  strip: {
    /** UNCHANGED — synergyCopy.lastSlots.heading. Named for the open slots,
     *  never for 31, because a partly filled deck has a different number. */
    heading: (n: string) => `The last ${n}`,

    /** Gains the candidate count. The player is about to be shown a list, and
     *  its length is the first thing they are owed about it. */
    caption: (n: string, cand: string) =>
      `${plural(n, 'slot', 'slots')} open · ${plural(cand, 'candidate', 'candidates')} ranked by synergy for this commander`,
    captionMobile: (n: string, cand: string) =>
      `${plural(n, 'slot', 'slots')} open · ${plural(cand, 'candidate', 'candidates')} ranked`,
    /** ENG-ADDED, from the canvas's open phone strip. Once the list is open the
     *  open-slot figure is stated by the commit bar's ticked count, which
     *  carries it as its denominator; this line drops it and picks up the
     *  ordering instead, which is the one thing desktop says that phone has
     *  nowhere else to put. */
    captionMobileOpen: (cand: string) =>
      `${plural(cand, 'candidate', 'candidates')} · ranked by synergy`,

    /** The door. A verb that opens something, not a verb that does something —
     *  the whole of #360 scope 1 is in the difference. `Choose` also names the
     *  player as the one choosing, which the two shipped CTAs did not. */
    open: (n: string) => `Choose the last ${n}`,
    openAria: (n: string) =>
      `Choose the cards for the last ${plural(n, 'slot', 'slots')}`,
    close: 'Close the list',
    /** ENG-ADDED. The canvas truncates the label to one word at 390px, where
     *  the strip head has a single line to give. A visual truncation, not a
     *  second control: strip.close is still the spoken name. */
    closeShort: 'Close',

    /** REPLACES lastSlots.ownedNote. That string existed to explain a number on
     *  a button face; there is no such number now. This one explains a default
     *  and makes the safety promise the review step is for.
     *
     *  The figure is the SEEDED TICK COUNT, which is the owned candidates WITH A
     *  FREE COPY, clamped to the open slots — so the sentence says what arrives
     *  ticked and claims nothing about how many the player owns in total. A deck
     *  with 58 owned candidates for 31 slots seeds 31, and 'you own 31' would be
     *  false.
     *
     *  The ZERO branch is the one place that distinction bites, which is why
     *  `doorNoteNoneFree` exists beside it: a seed of 0 used to mean the player
     *  owned none of the candidates, and now it also happens when they own every
     *  one and every copy is sleeved in another deck. Those are opposite facts,
     *  and the caller picks between them on the owned count, never on the seed.
     *
     *  IT NAMES THE POOL, NEVER THE TICKS. It used to promise `3 candidates arrive
     *  ticked`, which was true while the seed WAS the first N of this list. The seed
     *  asks the real fill now, and a fill spends slots on cards the player does not
     *  own, so the door promised three and the list opened with two. What is still
     *  true when the door is drawn is how many of these they can sleeve; the
     *  pre-tick is something the list does rather than something the door promises.
     *  `top-off-list.tsx` made the same concession for the button: offering is not
     *  promising. */
    doorNote: (seeded: string) =>
      seeded === '0'
        ? 'You own none of these, so the list arrives untouched. Nothing is added until you say so.'
        : seeded === '1'
        ? '1 you can sleeve. Nothing is added until you say so.'
        : `${seeded} you can sleeve. Nothing is added until you say so.`,
    /** Reopening after a partial accept. Says what is left and that the
     *  selection survived, so closing the list is never a loss. */
    doorNoteAgain: (cand: string) =>
      `You own none of the ${cand} left. The list reopens where you left it, declines and all.`,
    /** The variant when some of what is left is owned. Two strings rather than
     *  one interpolation, because 'you own none of' and 'you own N of' are
     *  different sentences and the first is the common one. */
    doorNoteAgainOwned: (owned: string, cand: string) =>
      `You own ${owned} of the ${cand} left. The list reopens where you left it, declines and all.`,

    /** The 390px forms. The desktop sentence runs three mono lines there, and a
     *  shorter one that is still two lines buys nothing, so the test is which
     *  clause survives alone. The promise does: it is the reason the review step
     *  exists and is carried nowhere else on the surface. The provenance does
     *  not, because 31 filled dots, the head and every buy tag carry it the
     *  moment the list opens. */
    doorNoteMobile: (seeded: string) =>
      seeded === '0'
        ? 'You own none of these. Nothing is added until you say so.'
        // ONE SENTENCE AT BOTH WIDTHS for the seeded case. The desktop form existed
        // because it ran three mono lines at 390px; it named the tick count and the
        // provenance, and naming neither leaves a sentence short enough for the phone.
        // The zero branch keeps its own form, which still differs.
        : topOffCopy.strip.doorNote(seeded),
    /** The pool is empty because every ranked card ARGUES AGAINST itself.
     *
     *  `synergyCopy.lastSlots.short` says the collection ran out and that there
     *  was nothing left that EDHREC ranks for this commander. That is one reason
     *  a pool can be empty, and since the negative tail is cut it is no longer
     *  the only one: a deck holding every positively-ranked card leaves a
     *  ranking that is entirely negative, which is reachable late in a build and
     *  not rare. Printing `nothing EDHREC ranks` there is false — EDHREC ranked
     *  them, and what it said was that they belong in this deck less than in
     *  decks generally.
     *
     *  No figure, and no offer to show them: the rows are cut because the
     *  evidence is against them, and a control that reinstated them would spend
     *  a decision on the cards with the weakest case in the list. */
    exhaustedAllNegative:
      'Everything left that EDHREC ranks for this commander is played less here than in decks generally, so there is nothing worth suggesting.',
    /** A seed of zero that is NOT a statement about ownership.
     *
     *  The player owns candidates; every copy of every one of them is sleeved in
     *  another deck. Saying `You own none of these` there is false, and false to
     *  the player best placed to notice. The list still offers the cards, since a
     *  copy can be reclaimed, so the sentence says where the copies ARE rather
     *  than that there is nothing to do.
     *
     *  No figure. The count of owned-but-spoken-for candidates is a number the
     *  player cannot act on from this door, and the caption above it already
     *  carries the one they can. */
    doorNoteNoneFree:
      'Every copy you own is in another deck, so the list arrives untouched. Nothing is added until you say so.',
    /** The phone form, dropping the provenance exactly as `doorNoteMobile` does. */
    doorNoteNoneFreeMobile:
      'Every copy you own is in another deck. Nothing is added until you say so.',
    /** One string for both reopen cases. The two desktop variants differ only in
     *  an ownership figure, and the closed caption directly above already states
     *  the candidate count, so phone keeps only the clause that matters. */
    doorNoteAgainMobile: 'Reopens where you left it, declines and all.',
  },

  // ── The list, open ────────────────────────────────────────────────────
  list: {
    /** Accessible name for the checkbox group. Carries both counts, because a
     *  reader cannot see the head. */
    groupAria: (cand: string, n: string) =>
      `${plural(cand, 'candidate', 'candidates')} for the last ${plural(n, 'slot', 'slots')}`,

    head: (ticked: string, n: string, cand: string, untouched: string) =>
      `${ticked} of ${plural(n, 'slot', 'slots')} ticked · ${plural(cand, 'candidate', 'candidates')}, ${untouched} untouched`,
    headMobile: (ticked: string, n: string) => `${ticked} of ${n} ticked`,

    clearTicks: 'Clear all ticks',

    /** Column headers. The two figures sit under them at both widths on
     *  desktop; at phone they are labelled by the aria name instead. */
    colCard: 'Card',
    /** ENG-ADDED. The canvas draws this header over the cost track, but the
     *  handoff's own copy file omitted the key; the word is Design's. */
    colCost: 'Cost',
    colSynergy: 'Synergy',
    colDecks: 'Decks',
    ordering: 'ranked · synergy, then inclusion, then name',

    /** The cap. Says what to do rather than only what is forbidden, and is the
     *  aria-describedby target of every inert tick box, so a reader who tabs
     *  into one hears why.
     *
     *  The count is deliberately absent, against the file's own
     *  denominator-in-every-string rule. It led this line as "31 of 31 slots
     *  ticked", which is `head` word for word at desktop and `headMobile` word
     *  for word in the bar directly under it, so the one thing the line was for
     *  arrived third, behind a figure already on screen twice. */
    cap: 'Untick one to swap another in',

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
    /** The price is dropped rather than placeholdered when the feed has never
     *  stocked the card or the read failed. src/lib/copy/price.ts owns that
     *  rule: silence is the state, and there is no string for "—" or "$0.00".
     *  Design's wording is untouched; only the figure leaves. */
    unownedClause: (price: string | null) =>
      price === null ? 'Not in your collection.' : `Not in your collection, ${price}.`,

    /** The cost is spoken from CostPips' own sr-only alternative — the SHIPPED
     *  string, reused, and read before the ownership clause. It is never
     *  capped: the +N pip truncates the drawing, not the sentence, and a reader
     *  who cannot see the track is the one reader for whom truncation is not a
     *  density trade. No string is added here; manaCopy.costAria is the source. */

    /** A tick that stops being legal while the list is open. It unticks
     *  itself, keeps its slot, and says which rule caught it. */
    illegalInDeck: 'already in the deck',
    illegalColour: 'not in these colors',
    illegalUntickable: 'untickable',

    /** A decline. Lifted from the tuning card's dismissed row, deliberately:
     *  same act, same shape, same words, and no question asked. */
    declined: 'not this one',
    restore: 'Show it again',
    restoreAria: (name: string) => `Put ${name} back on the list`,
    /** Ratified by Design in the R1 addendum, verbatim: the trigger it names is
     *  now drawn, and the string it was invented as is the one that ships. */
    declineAria: (name: string) => `Set ${name} aside`,

    /** The visible face of that trigger. A word rather than a glyph, because a
     *  bare × one column from the deck row's own remove × reads as the same
     *  destructive act at 13px, and this one removes nothing. */
    decline: 'Set aside',

    /** The way back out of every decline at once. No server call and no new
     *  action: it empties the declined set. A restored row returns unticked,
     *  which is the honest state — the tick was dropped when it was declined.
     *
     *  The control renders from one decline, so both strings carry a singular
     *  form: 'all 1' is not English, and 'Show it again' is already the declined
     *  row's own label a few rows down. */
    restoreAll: (declined: string) =>
      declined === '1' ? 'Show the one again' : `Show all ${declined} again`,
    restoreAllAria: (declined: string) =>
      declined === '1'
        ? 'Put the declined candidate back on the list'
        : `Put all ${plural(declined, 'declined candidate', 'declined candidates')} back on the list`,
  },

  // ── The bulk pair ─────────────────────────────────────────────────────
  //
  // Transcribed verbatim from `design_handoff_the99_bulk_controls/bulk-controls - copy
  // strings.ts` (§5.1 / §5.2). Two controls that SELECT and never commit — nothing is added
  // to the deck until `Add N cards`, exactly as for a hand-made selection.
  //
  // The rules this block is written to, all inherited rather than invented:
  //   · every count carries its denominator or its noun in the same string;
  //   · a missing price drops the FIGURE and keeps the COUNT (`src/lib/copy/price.ts`);
  //   · a nil concession is a sentence, never an empty slot;
  //   · nothing is claimed from absent data — an unmeasurable mix says so;
  //   · the accessible name carries the concession, because a sibling note is read after the
  //     choice on a linear pass.
  bulk: {
    /**
     * The pool is named; the concession is not — the note does that, so the two notes can be
     * compared as a column.
     *
     * THE COUNTS ARE NOT ALWAYS THE SAME, and the handoff's own comment said they were:
     * "both labels state the same count — the open slots — because both fills take every one
     * of them". True wherever the collection holds at least as many candidates as the deck
     * has slots, which is b1's own figures, and false exactly where it does not — four
     * sleevable candidates for twelve slots cannot take twelve, and `Select 12 from my
     * collection` would promise eight cards that do not exist. The collection control takes
     * `tickable`; the best control takes the open slots. Errata 4 on the handoff.
     */
    collection: (n: string) => `Select ${n} from my collection`,
    best: (n: string) => `Select the ${n} this deck needs`,

    /** Label AND concession. The visible note is `aria-hidden`, so this is the only place the
     *  figure is spoken, and it is spoken before the press. */
    collectionAria: (n: string, concession: string) =>
      `Select ${n} cards from your collection — ${concession}`,
    bestAria: (n: string, concession: string) =>
      `Select the ${n} cards this deck needs — ${concession}`,

    /** Nil, and still a sentence. The player came to find out whether the cheap option costs
     *  anything; 'no' is the answer, not the absence of one. */
    gapNone: 'matches every recommendation',
    gapOne: (n: string, type: string) => `${n} ${type} short of recommendations`,
    gapTwo: (n: string, type: string, m: string, other: string) =>
      `${n} ${type} and ${m} ${other} short of recommendations`,
    /** Three or more axes. A line naming five types is a table with no headings, and the worst
     *  gap is what decides whether the concession is acceptable. */
    gapMany: (types: string, worst: string, worstType: string) =>
      `short on ${types} types · ${worstType} worst at ${worst}`,
    /** `SkeletonFit.basis === 'none'`, or no composition at all. '0 short' would be the
     *  strongest possible claim made from no data. */
    gapUnmeasured: 'no recommendation for this commander',

    /** b3: the two pools produced the same rows, so the buy control is absent and this clause
     *  says why. Appended to whichever gap string applies. */
    andNothingToBuy: (gap: string) => `${gap} · nothing to buy`,

    /** Identical in shape to the shipped `commit.toBuy`, deliberately: the bar restates this
     *  pair of figures against the selected set a moment later, and two spellings of one fact
     *  would read as two facts. */
    buy: (n: string, money: string | null) =>
      money === null ? `${n} to buy` : `${n} to buy · ${money}`,

    /** b11. While a hand-made selection fills the slots, replacing it is the whole of what a
     *  press does, and that outranks the figure. Both notes take it. */
    replaces: (selected: string) => `replaces your ${selected} selections`,
    replacesOne: 'replaces your 1 selection',
  },

  // ── The commit row ────────────────────────────────────────────────────
  commit: {
    /** States what it will place. At zero it loses the count rather than
     *  printing 'Add 0 cards', and goes disabled with no error. */
    add: (ticked: string) => `Add ${plural(ticked, 'card', 'cards')}`,
    addEmpty: 'Add cards',
    addAria: (ticked: string, total: string, bodySize: number) =>
      `Add ${plural(ticked, 'card', 'cards')} to the deck, ${total} of ${bodySize}`,
    cancel: 'Cancel',

    /** The consequence, before the tap. */
    consequence: (total: string, bodySize: number) => `${total} of ${bodySize} when added`,
    /** The money, said once, in --warning, beside the count it belongs to.
     *  This is the only figure on the surface that is about spending.
     *
     *  The figure leaves when nothing in the pass has a price, for the same
     *  reason it leaves the ownership clause: a total of zero priced copies is
     *  not a total of $0.00. The count still stands, because how many there are
     *  to buy is known either way. */
    toBuy: (b: string, money: string | null) =>
      money === null ? `${b} to buy` : `${b} to buy · ${money}`,
    /** Printed when the selection leaves slots open. Not a warning and not a
     *  nudge — an assurance that stopping short is a choice with a way back. */
    slotsStayOpen: (n: string) =>
      n === '1'
        ? '1 slot stays open: you can come back to it'
        : `${n} slots stay open: you can come back to them`,

    /** Zero ticks, and the zero-owned case, which is the same state. */
    nothingTicked: 'nothing ticked: the list arrives with what you own already ticked',
    nothingTickedUnowned: (cand: string) =>
      `nothing ticked: you own none of these ${cand}, so every tick is one to buy`,
    /** Zero ticks because every candidate was declined. The other two variants
     *  both explain a list that is there to be ticked; this one is the only
     *  state where the rows are gone, so it names the way back instead. */
    nothingTickedAllDeclined: (cand: string) =>
      `you've set all ${cand} aside: show any of them again to pick it up`,

    /** ADOPTED from recommendationsCopy.fill.fillingRows, which this key
     *  replaces: a 27-row write is exactly what that sentence was written for,
     *  and a second in-flight vocabulary for the same act would be two voices.
     *  The one edit is the plural helper, so a single-card pass no longer
     *  reads 'Sleeving 1 cards…'. The old key had no other reader and is gone. */
    inFlight: (ticked: string) => `Sleeving ${plural(ticked, 'card', 'cards')}…`,
    /** UNCHANGED — synergyCopy.lastSlots.topUpFailed, referenced rather than
     *  transcribed so the two can never drift apart. */
    refused: synergyCopy.lastSlots.topUpFailed,
    /** The plate's eyebrow, naming the state the sentence beside it explains. */
    refusedLabel: 'refused',
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
  // number: 'the seed' and '2nd top-off' are labels, '68 cards' is the figure.
  ledger: {
    header: (total: string) =>
      total === '1'
        ? 'Where this 1 card came from'
        : `Where these ${total} cards came from`,
    headerMeta: (passes: string, buy: string) =>
      `${passes} passes · ${buy} to buy`,
    /** One pass, so 'passes' would be wrong and the count is not worth saying. */
    headerMetaOne: (buy: string) => `one pass · ${buy} to buy`,

    /** Pass labels. Ordinals are STABLE and never renumber when a pass is
     *  undone — '3rd top-off' can exist with no '1st top-off' above it.
     *
     *  An ordinal WORD, not a bare numeral after the noun: 'top-off 1' sat beside
     *  '50 cards you chose…' and read as a count of one (Hugh, 2026-09-28). */
    seedLabel: 'the seed',
    passLabel: (i: string) => `${ordinal(i)} top-off`,

    /** The seed's sentence — the shipped provenance wording, recast as a line. */
    seedLine: (n: string, buy: string) =>
      `${plural(n, 'card', 'cards')}: the roles and the mana base, ${buy} to buy.`,
    seedLineNoBuy: (n: string) =>
      `${plural(n, 'card', 'cards')}: the roles and the mana base.`,
    /** The seed NAMES its reversal rather than growing a button for it: that
     *  control is a rule and a row away in the toolbar, and duplicating it here
     *  would put two destructive controls in one box.
     *
     *  It is named by the label it actually wears there. This said "the sweep
     *  reverses it", and "sweep" is an internal word that appears nowhere on
     *  the surface, so the one row that cannot be undone from here pointed at a
     *  control the reader could not go and find. */
    seedReversal: 'Clear all auto reverses it',

    passLine: (n: string, slots: string, buy: string) =>
      `${plural(n, 'card', 'cards')} you chose from the last ${slots}, ${buy} of them to buy.`,
    passLineNoBuy: (n: string, slots: string) =>
      `${plural(n, 'card', 'cards')} you chose from the last ${slots}.`,
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
      `${plural(placed, 'card', 'cards')} · ${removed} removed since`,
    passRecountedKept: (placed: string, kept: string) =>
      `${plural(placed, 'card', 'cards')} · ${kept} now yours`,
    passRecountedBoth: (placed: string, kept: string, removed: string) =>
      `${plural(placed, 'card', 'cards')} · ${kept} now yours, ${removed} removed since`,
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
    /** ENG-ADDED, mirroring Design's own `undoOne` one line down: the same
     *  demonstrative has to agree at a count of one, and the toggle beside the
     *  undo would otherwise read 'Show these 1'. */
    markOne: 'Show this 1',
    markAria: (n: string, pass: string) =>
      `Mark the ${plural(n, 'card', 'cards')} from ${pass} in the deck below`,
    unmarkAria: (pass: string) => `Clear the mark on ${pass}`,
    /** ENG-ADDED. §14 says a marked row's accessible name gains 'from 1st top-off',
     *  and the row has no aria-label to extend — its name is the card's own
     *  button. So this ships as visually-hidden text inside the row, additive to
     *  that button's name rather than a replacement for it. */
    markedRow: (pass: string) => `from ${pass}`,

    /** 'these' because the line is the antecedent; the aria name says which
     *  pass, because three ledger lines mean three of these buttons. */
    undo: (n: string) => `Undo these ${n}`,
    undoOne: 'Undo this 1',
    undoAria: (n: string, pass: string) =>
      `Undo the ${plural(n, 'card', 'cards')} from ${pass}, and put back what they cost`,
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
    /** Currently rendered nowhere. The R1 addendum gave the bar's one status
     *  line a priority order and put this last, behind two rungs that between
     *  them cover every state, so it yields always rather than sometimes. Kept
     *  because the fact it states is still true and the slot is still its own;
     *  `retiredAnnounce` carries the same fact to a screen reader on open. */
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
      `${plural(cand, 'candidate', 'candidates')} for ${plural(n, 'slot', 'slots')}. ${ticked} already ticked.`,
    ticked: (ticked: string, n: string, buy: string) =>
      `${ticked} of ${n} ticked, ${buy} to buy.`,
    tickedNoBuy: (ticked: string, n: string) => `${ticked} of ${n} ticked.`,
    capped: (n: string) => `${n} of ${plural(n, 'slot', 'slots')} ticked.`,
    added: (added: string, total: string, buy: string, bodySize: number) =>
      `${plural(added, 'card', 'cards')} added. ${total} of ${bodySize}, ${buy} to buy.`,
    addedNoBuy: (added: string, total: string, bodySize: number) =>
      `${plural(added, 'card', 'cards')} added. ${total} of ${bodySize}.`,
    declined: (name: string, ticked: string, n: string) =>
      `${name} set aside. ${ticked} of ${n} ticked.`,
    /** The bulk restore. It states the tick count after the restore as well as
     *  the number of rows returned, because a restored row comes back unticked
     *  and a reader who is told only 'back on the list' would expect otherwise. */
    restoredAll: (declined: string, ticked: string, n: string) =>
      `${plural(declined, 'candidate', 'candidates')} back on the list. ${ticked} of ${n} ticked.`,
    undone: (added: string, total: string, bodySize: number) =>
      `${plural(added, 'card', 'cards')} put back. ${total} of ${bodySize}.`,
    /** The mark is a visual grouping, so it is the one thing on this surface a
     *  reader would otherwise get nothing from. */
    marked: (n: string, pass: string) =>
      `${plural(n, 'card', 'cards')} from ${pass} marked in the deck.`,
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
// 8. recommendationsCopy.fill.provenance / .provenanceMobile /
//    .provenanceAllOwned / .provenanceShort / .provenanceFull /
//    .provenanceFullAllOwned — DELETED. All six stated one deck-wide total for
//    the whole fill, which is the thing the ledger stops doing. The full-fill
//    pair was added to stop a 99/99 deck reading "The other 0 are yours"; the
//    ledger cannot say that at all, because it counts each pass and never hands
//    back a remainder. `provenanceShort`'s wording survives twice over: as ledger.seedLine
//    (the seed is a line in the ledger, and its sentence is the one the strip
//    already said) and, as the exhausted-list sentence in STATES §13, where
//    the shipped key is synergyCopy.lastSlots.short rather than this one.
//
// R1 strings that did not survive R2:
//   provenance.clause / .clauseNoBuy / .undo / .undoAria — the single
//   last-batch clause. It answered the reload with client memory, which is to
//   say it did not, and it could not say 'independently of the seed' or 'which
//   cards came from which pass'. The ledger says all three.
//
// UNTOUCHED, and reused verbatim:
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

/**
 * `CompositionTargets`' ten keys, pluralised for a count — the nouns the gap strings take.
 *
 * Keyed on `CompositionTargets` rather than on `string`, so the claim above is the TYPE's and
 * not just this comment's: adding an axis to the composition fails to compile here until it
 * has a noun, which is the one place a missing one would show up as a sentence with a hole in
 * it rather than as an error.
 *
 * `basic` and `nonbasic` are WITHIN land in `fit.ts`, so a note must never print `land`
 * beside either or it double-counts in front of the player. Nothing here enforces that;
 * `planFill` excludes all three land axes from its type shortfalls, which is where the rule
 * is kept.
 */
export const MIX_TYPE_NOUN: Record<keyof CompositionTargets, [one: string, many: string]> = {
  land: ['land', 'lands'],
  basic: ['basic', 'basics'],
  nonbasic: ['nonbasic land', 'nonbasic lands'],
  creature: ['creature', 'creatures'],
  instant: ['instant', 'instants'],
  sorcery: ['sorcery', 'sorceries'],
  artifact: ['artifact', 'artifacts'],
  enchantment: ['enchantment', 'enchantments'],
  planeswalker: ['planeswalker', 'planeswalkers'],
  battle: ['battle', 'battles'],
};
