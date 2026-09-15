/**
 * Assigning a contested copy — the post-import summary, and the contested row.
 *
 * Transcribed from `design/design_handoff_the99_card_assignments/card-assignments · copy
 * strings.ts` (R2), minus the deck-page marker panel: that door was ruled out on 2026-09-14
 * and the chooser appears on the summary and `/decks/[id]/changes` only.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ──────────────────────────────────
 *
 * `Pull it` and giving a copy are DIFFERENT ACTS and must never share a word.
 *
 *   Pull it — takes the card out of another deck's list and CUTS THAT DECK A NEW VERSION
 *             (`pullCardFromDeck`). Not reversible.
 *   Giving  — writes one `card_assignments` row. No list is edited, no version is cut, and the
 *             losing deck still bills the purchase. One tap back.
 *
 * So there is no verb-button for giving: the heading carries the verb and the deck names are
 * the control.
 *
 * ── FOUR VOCABULARY RULINGS ───────────────────────────────────────────────────
 *
 * 1. THE WORD `claim` APPEARS IN NO STRING HERE. It is engineering's word
 *    (`revalidateClaims`, `senior_hard`) and in a player's ear it is adversarial — it sounds
 *    like taking a card off somebody, which is what a pull does and this does not. Rejected
 *    with it: `Take it` (a pull, harder), `Reserve` / `Assign` (clerical), `Mine` (every card
 *    is yours — the app's premise).
 * 2. NO SENTENCE SAYS WHERE A CARD PHYSICALLY IS. `availability.ts`: we describe LISTS, never
 *    boxes, binders or sleeves. Hence `in your collection` and never `in the box`.
 * 3. `spoken for` IS NOT USED. `spokenForTwice` ships elsewhere meaning OVER-COMMITTED; the
 *    inert heading is `Nothing to choose here` instead.
 * 4. `holds` / `wants` CONSIDERED AND REJECTED. Those two carry the app's model — finished
 *    lists hold, unfinished lists want — so borrowing them would make `wants it` mean
 *    "committed but lost the copy" here and "not committed at all" one row away. Allocation is
 *    a third axis and gets a third pair: `gets it` and `buys it`.
 *
 * One word is borrowed deliberately: `still short`, from `marker.over`'s `short N`. A contested
 * arrival IS the over state, so the section heading and the marker say the same thing about the
 * same card.
 */

const fmt = (n: number) => n.toLocaleString("en-US");

export const cardAssignmentsCopy = {
  summary: {
    eyebrow: "Collection replaced",
    heading: (total: number) => `${fmt(total)} cards in your collection`,
    /**
     * The heading when the receipt itself did not survive its write. It states no figure,
     * because the only figure available would be a nought — and telling a player with a full
     * collection that they have none is worse than telling them nothing.
     */
    headingNoReceipt: "Your collection was replaced",

    /**
     * Says what the page is FOR, not what the write did internally. An earlier form reassured
     * the player that "no deck's list was edited and no version was cut" — true, and not a fact
     * a player needs: nobody suspected their decks had been rewritten until we said so.
     */
    lede: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Here's what your decks still need after ` +
      "the update — and, where one copy has to cover two decks, which one gets it.",
    /**
     * Arrivals, no contention, but some deck is still short. NOT `ledeNoContention`, which says
     * every arrival had a copy to spare — that is false here: a single committed deck asking for
     * three copies of a card one of which arrived is short, and is deliberately not drawn as a
     * contested row because there is nobody to choose between. It still did not have a copy to
     * spare.
     */
    ledeOwing: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Here's what your decks still need after ` +
      "the update.",
    ledeNoContention: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Every arrival a committed deck was ` +
      "waiting for had a copy to spare, so there is nothing to decide.",
    /**
     * Rendered rather than redirecting: a typed REPLACE deserves a sentence, and the
     * alternative makes the most destructive action in the app the only one with no receipt.
     *
     * This is also the state a lost receipt lands on — `summary_payload` is written after the
     * replace commits, so a failure in between leaves a confirmed upload with no payload. The
     * design anticipated that and it needs no second screen.
     */
    ledeNothingToReport:
      "Nothing your decks care about moved. No purchase cleared, nothing went back on the " +
      "buy list, and no copy is contested. Your collection is the new file.",
    fileStamp: (date: string, filename: string) => `uploaded ${date} · ${filename}`,
    fileDelta: (n: number) => `${n} cards differ from the old list`,

    /**
     * The seam with the shipped replace flow. `ReviewScreen` reports problems with the FILE
     * while the player can still walk away; this page reports consequences for DECKS after they
     * cannot. So it names the counts and never re-lists the issues — `IssueInspector` is built
     * for that reading and already did it at the moment it could change the decision.
     *
     * "you saw them before you confirmed" is load-bearing: without it the line implies the app
     * has just discovered something, and a clean replace reads as a failed one.
     */
    /**
     * COUNTS, AND NO CLAIM ABOUT WHICH CARDS ARE MISSING. An earlier form ended "those cards
     * aren't in your collection now", which is false in both reachable cases: an upload can
     * carry a good line for a card AND a duplicate line that failed to match it, so the card is
     * there; and a parse error has no card identity at all, so nothing can be said about what
     * it was. The per-row `name didn't match` clause is where absence IS asserted, because
     * there it is asserted about one row the diff proved is still owed.
     */
    issues: (unmatched: number, parseErrors: number) =>
      `${unmatched} ${unmatched === 1 ? "name" : "names"} didn't match and ${parseErrors} ` +
      `${parseErrors === 1 ? "line wouldn't" : "lines wouldn't"} parse. Any deck still billing ` +
      "one of those is marked below — you saw them before you confirmed.",
    issuesUnmatchedOnly: (n: number) =>
      `${n} ${n === 1 ? "name" : "names"} didn't match. Any deck still billing ` +
      `${n === 1 ? "that card" : "one of those"} is marked below — you saw them before you confirmed.`,
    issuesLink: "Look at the file again",

    sectionCleared: (n: number) => `No longer to buy · ${n}`,
    sectionClearedNote: "These arrived, so the decks that were billing them stop.",

    /**
     * ONE SECTION FOR BOTH "STILL OWED" CLASSES. The diff classifies three ways — gone,
     * reduced, raised — but WITHOUT PRICES the last two tell a player the same thing: this deck
     * still has to buy this card. So the UI groups by what the player must do and keeps the
     * classification as a reason clause on the row. Three headings for two outcomes was the
     * arithmetic showing through the interface.
     */
    sectionStill: (n: number) => `Still to buy · ${n}`,
    sectionStillNote:
      "Some of these only partly arrived; the rest aren't in the new list at all. Either way " +
      "these decks still have to buy them. Prices live on each deck's Shopping list, where you " +
      "can actually act on them.",
    reasonPartly: (arrived: number, wanted: number) => `${arrived} of ${wanted} arrived`,
    reasonGone: "not in the new list",
    /**
     * THE THIRD REASON, AND THE ONLY ONE IN `--warning`. An unmatched name is a card that did
     * not arrive, so the deck keeps billing it — but `not in the new list` would be true of the
     * PARSED list and misleading about why, and the two cases have different remedies. A card
     * you do not own: buy it. A card whose CSV line failed: FIX THE FILE — you already own it.
     * Collapsing them sends a player shopping for a card they have.
     */
    reasonUnmatched: "name didn't match",

    /** No prices and no totals anywhere on this page. See the section note above. */
    sectionShort: (n: number) => `Still short · ${n}`,
    /**
     * The default rule, stated once and briefly, in the section that holds the decision.
     * "unless you say otherwise" is the whole licence to change it; without that clause the
     * rule reads as policy.
     *
     * "committed the card first" and NOT "the oldest deck": the ordering is
     * `deck_version_cards.since`, PER CARD, so a newer deck can outrank an older one on a card
     * it sleeved earlier. "Oldest deck" is a different and wrong rule.
     */
    sectionShortNote:
      "More decks need these than copies arrived. The deck that committed the card first gets " +
      "it, unless you say otherwise.",

    /**
     * The one cross-reference on the page, on a contested row whose card also appears in the
     * `Still to buy` section above. Silence there is what would look like a bug; a sum across
     * the two is what would BE one — one counts a deck's draft demand, the other counts
     * committed claims.
     */
    alsoAbove: (section: string) => `Also above, under ${section} — these answer different questions.`,

    showAll: (n: number) => `Show all ${n}`,

    /** `Done` is a ROUTE, not a commit, and says so: a page of consequences must not look like a form. */
    done: "Done",
    doneNote: "goes to your collection · nothing here needs saving",
    doneNoteEmpty: "view your collection",
  },

  contested: {
    /**
     * Supply first, demand second, every time: the shortage is the reason the row exists.
     * COUNTS COMMITTED DECKS ONLY — a brew cannot be given a copy, so counting one here would
     * make the figure quietly wrong. `brewNote` carries it instead.
     *
     * No quantity arithmetic. An earlier form read "2 copies arrived · 3 committed decks want
     * 4", which asks a player to hold a subtraction in their head to learn a fact the options
     * below already state.
     */
    supply: (copies: number, decks: number) =>
      `${copies === 1 ? "1 new copy" : `${copies} new copies`} · ` +
      `${decks === 1 ? "1 deck needs it" : `${decks} decks need it`}`,
    /** The cap, stated beside the heading whenever it is above one. */
    cap: (given: number, copies: number) => `${given} of ${copies} given`,
    brewNote: (deck: string) =>
      `${deck} wants it too, but it has no committed version — only committed decks can be ` +
      "given a copy.",
    brewNoteMany: (n: number) =>
      `${n} brews want it too, but only committed decks can be given a copy.`,

    /** THE VERB. Never rendered as a button. */
    heading: (copies: number) =>
      copies === 1 ? "Give the new copy to" : `Give the ${copies} new copies to`,
    /** The folded-claim case: a commander's copy is protected and the rest are in play. */
    headingSpare: "Give the spare copy to",
    /** No option can be chosen at all — and only then. */
    headingInert: "Nothing to choose here",

    /** Outcomes: a WORD before a hue, always. Three forms and no more, and no quantities. */
    gets: "gets it",
    buys: "buys it",
    /** The fixed holder. It had the card before the import, so the arrival changed nothing for it. */
    keeps: "keeps it",
    /**
     * The folded claim's outcome: one copy protected as a commander, and a spare it has also
     * been allocated. `keeps it` alone would hide the second copy and contradict the row's own
     * heading, which has just said there is a spare to give.
     */
    keepsAndGets: (kept: number, extra: number) => `keeps ${kept} · gets ${extra} more`,

    /** Borrowed verbatim from the review page's own commander guard. */
    commanderTag: "commander",
    commanderNote: (deck: string) =>
      "A commander's copy can't be moved, so there is nothing to choose — the row is here " +
      `because the shortage is real and ${deck} is paying for it.`,
    commanderNoteFolded: (deck: string) =>
      `${deck}'s first copy is its commander and can't be moved. The second one can.`,

    /**
     * Per-option context. The date is `deck_version_cards.since` — PER CARD, not the version's
     * own date — because it is the fact `first committed wins` derives from, and the default
     * has to be checkable.
     */
    stamp: (version: number, date: string) => `v${version} · ${date}`,
    wants: (n: number) => `wants ${n}`,
    /** In commit order, NEVER promoted: the order IS the explanation of the default. */
    thisDeck: "this deck",
  },
} as const;
