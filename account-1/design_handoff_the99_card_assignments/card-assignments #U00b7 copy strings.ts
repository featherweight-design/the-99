/**
 * src/lib/copy/card-assignments.ts — NEW (R2)
 *
 * Assigning a contested copy. Gates PRs 3 and 4 of
 * docs/superpowers/specs/2026-09-14-card-assignments-design.md.
 *
 * Three surfaces, one row component: the post-import summary
 * (/collection/replace/summary/[uploadId]), the contested row on
 * /decks/[id]/changes, and the deck page's availability-marker disclosure.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ──────────────────────────────
 *
 * `Pull it` and giving a copy are DIFFERENT ACTS and must never share a word.
 *
 *   Pull it  — takes the card out of another deck's list and CUTS THAT DECK A
 *              NEW VERSION (pullCardFromDeck). Not reversible.
 *   Giving   — writes one card_assignments row. No list is edited, no version
 *              is cut, and per the spec the losing deck "still bills the
 *              purchase". One tap back.
 *
 * So: no verb-button for giving. The heading carries the verb and THE DECK
 * NAMES ARE THE CONTROL, each leading with the app's own round single-select
 * mark (filter-panel.tsx: "the shape is the affordance, and a square tick on a
 * one-of-many list promises you can have two"). The spec asks for exactly this
 * distinction and calls it a Design call.
 *
 * THE MARK STATES ALLOCATION; brass and the `your call` plate state AUTHORSHIP,
 * so the group carries a current value without seniority looking like a
 * preference the player expressed. `aria-checked` is therefore true for the
 * BRASS option only: two copies and three decks means two marks filled and one
 * radio checked, and each option's outcome carries its allocation into
 * a11yOption.
 *
 * ── FOUR VOCABULARY RULINGS ───────────────────────────────────────────────
 *
 * 1. THE WORD `claim` APPEARS IN NO STRING BELOW. It is engineering's word
 *    (revalidateClaims, senior_hard) and in a player's ear it is adversarial —
 *    it sounds like taking a card off somebody, which is what a pull does and
 *    this does not. Rejected with it: `Take it` (a pull, harder), `Reserve` /
 *    `Assign` (clerical), `Mine` (every card is yours — the app's premise).
 *
 * 2. NO SENTENCE SAYS WHERE A CARD PHYSICALLY IS. availability.ts: "we describe
 *    LISTS, never boxes, binders or sleeves." Hence `in your collection` and
 *    not `in the box`; nothing here is sleeved, cardboard, or in the shop.
 *    ⚠ FLAGGED: the shipped deckVersioningCopy.review.bucketFreeNote says "in
 *    the box already", so the rule is already broken once next door.
 *
 * 3. `spoken for` IS NOT USED. availability.ts's spokenForTwice ships on two
 *    surfaces meaning OVER-COMMITTED. The inert heading is `Nothing to choose
 *    here` instead.
 *
 * 4. `holds` / `wants` CONSIDERED AND REJECTED. detailClaimHolds /
 *    detailClaimWants carry the app's model in two verbs — finished lists hold,
 *    unfinished lists want. Borrowing them for allocation would make `wants it`
 *    mean "committed but lost the copy" here and "not committed at all" one row
 *    away. Allocation is a THIRD AXIS and gets a third pair: `gets it` and
 *    `buys it`.
 *
 * ONE WORD IS BORROWED DELIBERATELY: `still short`, from marker.over's
 * `short N`. A contested arrival IS the over state, so the section heading, the
 * new count chip and the marker all say the same thing about the same card.
 *
 * AND ONE REGISTER: detailOverNote's "Nothing's broken. It's a shopping
 * decision." The contested section closes on the same shrug, one clause on.
 */

export const cardAssignmentsCopy = {

  /* ───────────────────── The summary route ───────────────────── */
  summary: {
    eyebrow: 'Collection replaced',
    heading: (total: number) => `${fmt(total)} cards in your collection`,

    // The lede says what the page is FOR, not what the write did internally. An
    // earlier form reassured the player that "no deck's list was edited and no
    // version was cut" — true, and none of it is a fact a player needs: they did
    // not suspect their decks had been rewritten until we said so.
    lede: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Here's what your decks still need after ` +
      'the update — and, where one copy has to cover two decks, which one gets it.',
    ledeNoContention: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Every arrival a committed deck was ` +
      'waiting for had a copy to spare, so there is nothing to decide.',

    // Renders rather than redirecting: a typed REPLACE deserves a sentence, and
    // the alternative makes the most destructive action in the app the only one
    // with no receipt. The file delta keeps "nothing moved" from reading as a
    // failed import.
    //
    // NOTE FOR ENG: this is also the state a broken confirmUpload idempotency
    // lands on. The short-circuit must return the STORED summary; a recomputed
    // diff finds nothing and would show this screen after a real import.
    ledeNothingToReport:
      'Nothing your decks care about moved. No purchase cleared, nothing went back on the ' +
      'buy list, and no copy is contested. Your collection is the new file.',
    fileStamp: (date: string, filename: string) => `uploaded ${date} · ${filename}`,
    fileDelta: (n: number) => `${n} cards differ from the old list`,

    // ── THE SEAM WITH THE SHIPPED REPLACE FLOW ────────────────────────
    // ReviewScreen (step 2) reports problems with the FILE while the player can
    // still walk away; this page reports consequences for DECKS after they
    // cannot. So the summary names the counts and NEVER re-lists the issues —
    // IssueInspector is built for that reading and already did it at the moment
    // it could change the decision.
    //
    // "you saw them before you confirmed" is load-bearing: without it the line
    // implies the app has just discovered something, and a clean replace reads
    // as a failed one. Absent entirely when the upload was clean.
    issues: (unmatched: number, parseErrors: number) =>
      `${unmatched} ${unmatched === 1 ? 'name' : 'names'} didn't match and ${parseErrors} ` +
      `${parseErrors === 1 ? 'line wouldn\u2019t' : 'lines wouldn\u2019t'} parse. Those cards aren't in ` +
      'your collection now, so any deck that lists them is billing them again — you saw them ' +
      'before you confirmed.',
    issuesUnmatchedOnly: (n: number) =>
      `${n} ${n === 1 ? 'name' : 'names'} didn't match, so ${n === 1 ? 'that card' : 'those cards'} ` +
      "aren't in your collection now — you saw them before you confirmed.",
    issuesLink: 'Look at the file again',

    // ── Section 1 · gone (deficit cleared) ──
    sectionCleared: (n: number) => `No longer to buy · ${n}`,
    sectionClearedNote: 'These arrived, so the decks that were billing them stop.',

    // ── ONE SECTION FOR BOTH "STILL OWED" CLASSES ────────────────────────
    // The diff classifies three ways — gone, reduced, raised — but WITHOUT
    // PRICES the last two tell a player the same thing: this deck still has to
    // buy this card. So the UI groups by what the player must do and keeps the
    // classification as a reason clause on the row. Three headings for two
    // outcomes was the arithmetic showing through the interface.
    sectionStill: (n: number) => `Still to buy · ${n}`,
    sectionStillNote:
      "Some of these only partly arrived; the rest aren't in the new list at all. Either way " +
      "these decks still have to buy them. Prices live on each deck's Shopping list, where you " +
      'can actually act on them.',
    // The reason, and the only place the third class survives. Dropped on a
    // narrow card where name + deck + reason will not fit.
    reasonPartly: (arrived: number, wanted: number) => `${arrived} of ${wanted} arrived`,
    reasonGone: 'not in the new list',
    // THE THIRD REASON, AND THE ONLY ONE IN --warning. An unmatched name is a
    // card that did not arrive, so the deck keeps billing it — but `not in the
    // new list` would be true of the PARSED list and misleading about why, and
    // the two cases have different remedies. A card you do not own: buy it. A
    // card whose CSV line failed: FIX THE FILE — you already own it. Collapsing
    // them sends a player shopping for a card in their own box, which is this
    // ticket's silent consequence one step upstream.
    reasonUnmatched: "name didn't match",
    reasonParseError: (line: number) => `line ${line} wouldn't parse`,

    // ── NO PRICES AND NO TOTALS, ANYWHERE ON THIS PAGE ──────────────────
    // A cleared purchase has no honest figure: the app cannot know what the
    // player paid, or whether they paid — booster, trade and gift are all
    // arrivals. And a figure for what is STILL owed is real but not actionable
    // on a receipt; the place to act on a price is the deck's Shopping list,
    // which sectionStillNote points at.
    //
    // Dropping the totals also removed a defect rather than only simplifying: a
    // right-aligned figure on a heading rule, directly under the previous
    // section's last row, reads as THAT list's bottom total.
    //
    // DELIBERATELY ABSENT: every price key, every total key, every signed or
    // delta figure. (R2 shipped signed totals, then unsigned ones; both
    // withdrawn.)

    // ── Section 2 · reduced. NEW IN R2 — the diff classifies three ways and R1
    // had a home for only two. Its news is "still buying, just less", which is
    // neither other heading, and its figure is a DEFICIT MOVE rather than a
    // clearance, so it needs a column the cleared rows do not have.
    // ── Section 2 · reduced AND raised, together ──
    // See sectionStill above: without prices the two classes tell a player the
    // same thing, so one section carries both and the row's reason clause keeps
    // the distinction.
    //
    // DELIBERATELY ABSENT: sectionPartly, sectionOwing, deficitMove, and every
    // price, total, saving and delta key. (R2 shipped signed totals, then
    // unsigned ones, then none; all withdrawn.) The second clause of the old
    // owing note survives inside sectionStillNote, because it is the one that
    // stops a player thinking a deck was edited.

    // ── Section 4 · contented arrivals. Says `committed`, never `to buy`:
    // different question, different verb. See the header note above.
    sectionShort: (n: number) => `Still short · ${n}`,
    sectionShortDefault: 'first committed wins',
    // "a guess about your intent, not a rule you set" is the licence to change
    // it — without that clause the default reads as policy. The close borrows
    // detailOverNote's register.
    // THE DEFAULT RULE, STATED ONCE AND BRIEFLY, in the section that holds the
    // decision — the only place it is explained. "unless you say otherwise" is
    // the whole licence to change it; without that clause the rule reads as
    // policy.
    //
    // "committed the card first" and NOT "the oldest deck": the ordering is
    // deck_version_cards.since, PER CARD, so a newer deck can outrank an older
    // one on a card it sleeved earlier. "Oldest deck" is a different and wrong
    // rule.
    sectionShortNote:
      'More decks need these than copies arrived. The deck that committed the card first gets ' +
      'it, unless you say otherwise.',

    // The one cross-reference on the page, on a contested row whose card also
    // appears in the `Still to buy` section above. Silence there is what would
    // look like a bug; a sum across the two is what would BE one — one counts a
    // deck's draft demand, the other counts committed claims.
    alsoAbove: (section: string) => `Also above, under ${section} — these answer different questions.`,

    // ── ONE KIND OF FIGURE ────────────────────────────────────────────────
    // EVERY PRICE IS GONE. Superseded twice — R2 shipped signed totals, then
    // unsigned ones, then none — and the standing rule is the block above
    // `showAll`. Kept as a note so the removal reads as a decision rather than
    // an omission.
    //
    // And with one kind of figure left, nothing is signed: there is no second
    // direction to sign against. (R2 shipped signed totals in both directions;
    // ── NO MONEY ON THIS PAGE AT ALL ──────────────────────────────
    // A cleared purchase has no honest figure: the app cannot know what the
    // player paid, or whether they paid — booster, trade and gift are all
    // arrivals. And a figure for what is STILL owed is real but not actionable
    // on a receipt; the place to act on a price is the deck's Shopping list,
    // which sectionStillNote points at.
    //
    // Dropping the totals also removed a defect rather than only simplifying: a
    // right-aligned figure on a heading rule, directly under the previous
    // section's last row, reads as THAT list's bottom total.
    //
    // DELIBERATELY ABSENT: every price, total, saving and delta key. (R2
    // shipped signed totals, then unsigned ones, then none; all withdrawn.)

    showAll: (n: number) => `Show all ${n}`,

    // `Done` is a ROUTE, not a commit — said out loud, because a page of
    // consequences that looks like a form makes the player read the whole
    // replace as still pending.
    done: 'Done',
    doneNote: 'goes to your collection · nothing here needs saving',
    doneNoteEmpty: 'view your collection',
  },

  /* ───────────────────── The contested row ───────────────────── */
  contested: {
    // Supply first, demand second, every time: the shortage is the reason the
    // row exists. COUNTS COMMITTED DECKS ONLY — assignments are refused for
    // decks with no committed version, so a brew is not an option and must not
    // be counted as one; brewNote carries it instead.
    //
    // NO QUANTITY ARITHMETIC. An earlier form read "2 copies arrived · 3
    // committed decks want 4", which asked a player to hold a subtraction in
    // their head to learn a fact the options below already state. A deck
    // wanting three lands is one claimant taking one tick.
    supply: (copies: number, decks: number) =>
      `${copies === 1 ? '1 new copy' : `${copies} new copies`} · ` +
      `${decks === 1 ? '1 deck needs it' : `${decks} decks need it`}`,

    // The cap, stated beside the heading whenever it is above one. True in both
    // states: seniority has already given both copies away before any pick.
    cap: (given: number, copies: number) => `${given} of ${copies} given`,
    // The brew is named and excluded in one line. Omitting it silently would
    // make the count above quietly wrong; listing it would invite a certain
    // refusal.
    brewNote: (deck: string) =>
      `${deck} wants it too, but it has no committed version — only committed decks can be ` +
      'given a copy.',
    brewNoteMany: (n: number) =>
      `${n} brews want it too, but only committed decks can be given a copy.`,

    // THE VERB. Never rendered as a button.
    heading: (copies: number) =>
      copies === 1 ? 'Give the new copy to' : `Give the ${copies} new copies to`,
    // The folded-claim case: a commander's copy is protected and the rest are
    // in play, so the heading names what is actually choosable.
    headingSpare: 'Give the spare copy to',
    // No option can be chosen at all — and ONLY then. `spoken for` is not
    // available (ruling 3).
    headingInert: 'Nothing to choose here',

    // ---- Outcomes. A WORD before a hue, always. Three forms and no more. ----
    // No quantities and no prices: the chooser allocates copies ACROSS decks,
    // never within one, so there is no `n of m` to state and no money on this
    // surface to state it in.
    gets: 'gets it',
    buys: 'buys it',
    // The fixed holder. `keeps it` and not `gets it`: it had the card before
    // the import and the arrival changed nothing for it.
    keeps: 'keeps it',

    // Borrowed verbatim from review.commanderGuardTag. R2 introduces no new
    // guard vocabulary, and this is the one place the two features are allowed
    // to look alike — because here they agree.
    commanderTag: 'commander',
    commanderNote: (deck: string) =>
      `A commander's copy can't be moved, so there is nothing to choose — the row is here ` +
      `because the shortage is real and ${deck} is paying for it.`,
    commanderNoteFolded: (deck: string) =>
      `${deck}'s first copy is its commander and can't be moved. The second one can.`,

    // Per-option context. The date is deck_version_cards.since — PER CARD, not
    // the version's own date — because it is the fact `first committed wins`
    // derives from and the default has to be checkable.
    stamp: (version: number, date: string) => `v${version} · ${date}`,
    wants: (n: number) => `wants ${n}`,
    // In commit order, NEVER promoted: the order IS the explanation of the
    // default, and promoting your own deck hides why it lost.
    thisDeck: 'this deck',

    // ---- A live pick ----
    // NO `your call` PLATE. Withdrawn in review: a picked row already carried
    // five signals for one bit of state (accent border, accent mark fill, the
    // plate, this sentence, and `clear`), and the plate was the weakest. Its
    // stated job was "words, never colour alone" — but THIS SENTENCE already is
    // that word carrier, and a better one, because it NAMES THE DECK. The plate
    // said "something here was chosen"; the sentence says "you chose Kinnan
    // Ramp".
    //
    // SO undoHint IS REQUIRED WHEREVER THE CHOOSER APPEARS — summary,
    // /decks/[id]/changes and the deck-page marker panel alike, and at 390px on
    // its own line above `clear` rather than sharing a row. It is the feature's
    // only non-colour carrier of authorship, and in Canopy and Low Sun (where
    // --accent sits in --success's and --warning's hue families) it is the only
    // thing separating a pick from an outcome.
    //
    // ONE EXCEPTION: a refusal note SUPERSEDES it. refusedNoSupply already names
    // the holding deck and the way back in one sentence ("Take it off X
    // first"), so authorship stays carried in words — the rule's actual
    // requirement — and a second instruction under a refusal would put two
    // competing ones on one row.
    undoHint: (deck: string) => `Tap ${deck} again to undo this.`,
    clear: 'Back to first committed',

    // /changes and the deck page: the one place on those surfaces where the
    // distinction from a pull is spelt out. A CAPTION, not a warning — giving
    // is the safe action of the two.
    seamCaption: 'no list changes',

    // ---- Refusals. Four causes in the spec; three are drawable. ----
    // Every sentence does four things in order: name the deck and card · the
    // cause · NOTHING MOVED · what is true now. The spec's reason for the third
    // clause is the row's own: "the row's default allocation is still the truth
    // and the player needs to know their pick did not take."
    //
    // The row REDRAWS from the refusal's own fresh state — the write already
    // re-reads ownership, the committed claim and the supply in one
    // transaction, so the response carries all three. One round trip.
    refusedNotWanted: (deck: string, card: string, holder: string) =>
      `${deck}'s newest version doesn't list ${card} any more. Nothing moved: ${holder} still ` +
      "has the copy. This card isn't contested now, so it will be gone from here next time " +
      'you load it.',
    // NAMES A WAY FORWARD AND IT IS NOT A RETRY. Reservations resolve on
    // (created_at, deck_id), so the earlier one wins and tapping again cannot
    // change that.
    refusedNoSupply: (holder: string, have: number, deck: string) =>
      `There's no copy left to give. ${holder} was already given the one that arrived, and your ` +
      `collection has ${have === 1 ? 'one' : String(have)}. Nothing moved, and the decks above ` +
      `are what you actually have. Take it off ${holder} first if you want ${deck} to have it.`,
    // R1 ruled this unreachable and it is not: the payload is a record of one
    // import, so a deck can promote the card to commander between the render
    // and the tap. The row redraws as the inert state AND says why.
    refusedIsCommander: (card: string, deck: string) =>
      `${card} is ${deck}'s commander now. A commander's copy can't be given away. Nothing ` +
      'moved, and there is nothing left to choose on this card.',
    // DELIBERATELY ABSENT: a string for "the deck is not this user's". A player
    // cannot reach it from their own decks, and drawing a state for a request
    // they cannot make would be drawing an attack. It falls back to the shipped
    // transport treatment, which is the right home for "this should not have
    // happened".

    // ---- Announcements. One per settle, one per refusal, no more. ----
    // Names BOTH sides, because the trade is the news.
    announcedPick: (deck: string, card: string, displaced: string) =>
      `${deck} gets ${card}. ${displaced} buys it.`,
    announcedCleared: (card: string, holder: string) =>
      `Back to first committed. ${holder} has ${card}.`,
    // A refusal announces the on-screen sentence VERBATIM — never a summary.

    // ---- Accessible names (never rendered) ----
    a11yGroup: (card: string, copies: number) =>
      `Which decks get ${card} — ${copies === 1 ? '1 new copy' : `${copies} new copies`}`,
    a11yOption: (deck: string, outcome: string) => `${deck}, ${outcome}`,
    // The brass option is the only one carrying aria-checked; its name says who
    // authored the allocation, because the plate does on screen.
    a11ySelected: (deck: string) =>
      `${deck}, your choice. Choose again to go back to first committed.`,
    a11yCommander: (deck: string, card: string) =>
      `${deck} keeps ${card} as its commander. It cannot be moved.`,
    // The deck page disclosure. See README decision 10 — the marker becoming a
    // tap target contradicts availability-marker.tsx's own ruling and needs
    // ratifying.
    a11yDisclosure: (card: string, copies: number) =>
      copies === 1
        ? `Choose which deck gets the new copy of ${card}`
        : `Choose which decks get the ${copies} new copies of ${card}`,
  },
} as const;

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * ── ADDITION TO SHIPPED COPY — deckVersioningCopy.review ───────────────────
 *
 * One new chip on the /changes count strip, beside `can be pulled`. The word is
 * marker.over's own (`short N`) and the summary's section heading, so a player
 * meets one vocabulary across all three surfaces.
 */
export const REVIEW_CHIP_STILL_SHORT = 'still short';

/**
 * ── FLAGGED, NOT EDITED ────────────────────────────────────────────────────
 *
 * 1. deckVersioningCopy.review.lede — "Nothing here is a decision except the
 *    pulls." Wrong by one after #390 (the puts-back) and by two now. A
 *    ratification question, not a Design call. The smallest honest edit names
 *    all three: "except the pulls, the puts-back and who gets the new copies."
 *
 * 2. deckVersioningCopy.review.bucketFreeNote — "in the box already" asserts a
 *    physical location, which availability.ts bans outright. This file obeys
 *    the ban; the conflict is one of two open questions in READINESS.
 *
 * ── DELIBERATELY ABSENT ────────────────────────────────────────────────────
 *
 * No explainer string for the two verbs, no first-run coach mark, no tooltip on
 * either control, no confirm on a pick, and no in-flight string. The mitigation
 * is shape and wording; if testing shows a player pulling when they meant to
 * give, the fix is `seamCaption`, not a modal.
 */
