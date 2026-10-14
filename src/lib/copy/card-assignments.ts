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
 *   Pull it — takes the card out of another deck's list, leaving that deck a draft with the
 *             card going out (`pullCardFromDeck`; Hugh, 2026-09-27). Undone in that
 *             deck: by discarding its draft, or by putting the card back into it.
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
 * 4. `holds` / `wants` CONSIDERED AND REJECTED. Those two carry the app's model — committed
 *    decks hold, drafts want — so borrowing them would make `wants it` mean
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
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Here’s what your decks still need after ` +
      "the update, and where one copy has to cover two decks, which one gets it.",
    /**
     * Arrivals, no contention, but some deck is still short. NOT `ledeNoContention`, which says
     * every arrival had a copy to spare — that is false here: a single committed deck asking for
     * three copies of a card one of which arrived is short, and is deliberately not drawn as a
     * contested row because there is nobody to choose between. It still did not have a copy to
     * spare.
     */
    ledeOwing: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Here’s what your decks still need after ` +
      "the update.",
    ledeNoContention: (was: number, arrived: number, left: number) =>
      `Was ${fmt(was)}. ${arrived} arrived, ${left} left. Every arrival a committed deck was ` +
      "waiting for had a copy to spare, so there is nothing to decide.",
    /**
     * Rendered rather than redirecting: a collection replace deserves a sentence, and the
     * alternative makes the most destructive action in the app the only one with no receipt.
     *
     * This is also the state a lost receipt lands on — `summary_payload` is written after the
     * replace commits, so a failure in between leaves a confirmed upload with no payload. The
     * design anticipated that and it needs no second screen.
     */
    ledeNothingToReport:
      "Nothing your decks care about moved. No purchase cleared, nothing went back on the " +
      "buy list, and no copy is contested. Your collection is the new file.",
    /**
     * Appended to whichever lede is drawn when this upload left committed decks short. The same
     * decks, by the same rule, the warning before the confirm named, so the receipt says
     * afterwards what the player agreed to beforehand. Three names at most; the rest are counted.
     */
    nowShort: (names: string[]) => {
      if (names.length === 1) return `Replacing left a deck short: ${names[0]}.`;
      const shown = names.slice(0, 3);
      const rest = names.length - shown.length;
      const list = rest > 0
        ? `${shown.join(", ")} and ${fmt(rest)} more`
        : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
      return `Replacing left ${fmt(names.length)} decks short: ${list}.`;
    },
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
      `${unmatched} ${unmatched === 1 ? "name" : "names"} didn’t match and ${parseErrors} ` +
      `${parseErrors === 1 ? "line wouldn’t" : "lines wouldn’t"} parse. Any deck still counting ` +
      "one of those as a card to buy is marked below. You saw them before you confirmed.",
    issuesUnmatchedOnly: (n: number) =>
      `${n} ${n === 1 ? "name" : "names"} didn’t match. Any deck still counting ` +
      `${n === 1 ? "that card" : "one of those"} as a card to buy is marked below. You saw them before you confirmed.`,
    issuesLink: "Look at the file again",

    sectionCleared: (n: number) => `No longer to buy · ${n}`,
    sectionClearedNote: "These arrived, so the decks that counted them as cards to buy stop counting them.",

    /**
     * ONE SECTION FOR BOTH "STILL OWED" CLASSES. The diff classifies three ways — gone,
     * reduced, raised — but WITHOUT PRICES the last two tell a player the same thing: this deck
     * still has to buy this card. So the UI groups by what the player must do and keeps the
     * classification as a reason clause on the row. Three headings for two outcomes was the
     * arithmetic showing through the interface.
     */
    sectionStill: (n: number) => `Still to buy · ${n}`,
    sectionStillNote:
      "Some of these only partly arrived; the rest aren’t in the new list at all. Either way " +
      "these decks still have to buy them. Prices live on each deck’s Shopping list, where you " +
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
    reasonUnmatched: "name didn’t match",

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


    showAll: (n: number) => `Show all ${n}`,

    /**
     * A ROUTE, not a commit, and the label says where it goes rather than that it is finished.
     * `Done` needed a note beside it to say nothing was being saved; a button that names its
     * destination needs no gloss at all, so the note is gone with it.
     */
    done: "View your collection",
  },

  contested: {
    /**
     * Supply first, demand second, every time: the shortage is the reason the row exists.
     * COUNTS EVERY DECK THAT CAN BE GIVEN A COPY, brews included since 2026-10-11 (all-decks
     * cart): every one of them is an option below.
     *
     * No quantity arithmetic. An earlier form read "2 copies arrived · 3 committed decks want
     * 4", which asks a player to hold a subtraction in their head to learn a fact the options
     * below already state.
     */
    supply: (copies: number, decks: number) =>
      `${copies === 1 ? "1 new copy" : `${copies} new copies`} · ` +
      `${decks === 1 ? "1 deck needs it" : `${decks} decks need it`}`,
    /**
     * The same two lines on a surface with NO IMPORT behind it — the deck's own review page,
     * where the copies in question are simply the ones the player owns.
     *
     * `1 new copy` is a fact about an arrival, and on `/decks/[id]/changes` nothing arrived: the
     * reader is looking at a draft they are editing. Saying it there tells them their own
     * collection turned up this morning.
     */
    supplyOwned: (copies: number, decks: number) =>
      `${copies === 1 ? "1 copy" : `${copies} copies`} · ` +
      `${decks === 1 ? "1 deck needs it" : `${decks} decks need it`}`,
    headingOwned: (copies: number) =>
      copies === 1 ? "Give the copy to" : `Give the ${copies} copies to`,

    /** The cap, stated beside the heading whenever it is above one. */
    cap: (given: number, copies: number) => `${given} of ${copies} given`,
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
      "A commander’s copy can’t be moved, so there is nothing to choose. The row is here " +
      `because the shortage is real and ${deck} is paying for it.`,
    commanderNoteFolded: (deck: string) =>
      `${deck}’s first copy is its commander and can’t be moved. The second one can.`,

    /**
     * Per-option context. The date is `deck_version_cards.since` — PER CARD, not the version's
     * own date — because it is the fact `first committed wins` derives from, and the default
     * has to be checkable.
     */
    stamp: (version: number, date: string) => `v${version} · ${date}`,
    wants: (n: number) => `wants ${n}`,
    /** In commit order, NEVER promoted: the order IS the explanation of the default. */
    thisDeck: "this deck",

    // `seamCaption` ("no list changes") was retired 2026-10-04 with its only caller — the
    // per-row panel's caption on /decks/[id]/changes, removed from review-changes.tsx (Hugh, no
    // Design round, a removal). See about.ts's note where the `reservations` About entry used
    // to be for the fuller context.

    /**
     * Refusals. Every sentence does four things in order: names the deck and card, gives the
     * cause, says NOTHING MOVED, and states what is true now. That third clause is the row's
     * own reason — the default allocation is still the truth, and the player has to know their
     * pick did not take.
     */
    refusedNotWanted: (deck: string, card: string, holder: string) =>
      `${deck}’s newest version doesn’t list ${card} any more. Nothing moved: ${holder} still ` +
      "has the copy. This card isn’t contested now, so it will be gone from here next time " +
      "you load it.",
    /**
     * Names a way forward, and it is NOT a retry: reservations resolve on
     * `(created_at, deck_id)`, so pressing again cannot win.
     */
    refusedNoSupply: (holder: string, have: number, deck: string) =>
      `There’s no copy left to give. ${holder} was already given the one that arrived, and your ` +
      `collection has ${have === 1 ? "one" : String(have)}. Nothing moved, and the decks above ` +
      `are what you actually have. Take it off ${holder} first if you want ${deck} to have it.`,
    /**
     * The same refusal on a surface with no import behind it. `refusedNoSupply` says the holder
     * was given "the one that arrived", which is false on the deck's own review page — nothing
     * arrived there, and the copy in question is one the player already owned.
     */
    refusedNoSupplyOwned: (holder: string, have: number, deck: string) =>
      `There’s no copy left to give. ${holder} already has ` +
      `${have === 1 ? "the only one" : "one"}, and your collection has ` +
      `${have === 1 ? "one" : String(have)}. Nothing moved, and the decks above are what you ` +
      `actually have. Take it off ${holder} first if you want ${deck} to have it.`,
    /** Reachable: the payload records one import, so a deck can promote the card between renders. */
    refusedIsCommander: (card: string, deck: string) =>
      `${card} is ${deck}’s commander now. A commander’s copy can’t be given away. Nothing ` +
      "moved, and there is nothing left to choose on this card.",
    /**
     * DELIBERATELY ABSENT: a sentence for "the deck is not this player's". They cannot reach it
     * from their own decks, and drawing a state for a request they cannot make would be drawing
     * an attack. It falls back to the shipped transport treatment.
     */

    /** One announcement per settled pick, one per refusal, and no more. */
    announcedPick: (deck: string, card: string, displaced: string) =>
      `${deck} gets ${card}. ${displaced} buys it.`,
    announcedCleared: (card: string, holder: string) =>
      `Back to first committed. ${holder} has ${card}.`,

    /** Accessible names. Never rendered. */
    a11yGroup: (card: string, copies: number) =>
      `Which decks get ${card}: ${copies === 1 ? "1 new copy" : `${copies} new copies`}`,
    /**
     * The same group, named on a surface with no import behind it. A screen reader takes the
     * group's name in place of the supply line it sits under, so leaving the arrival wording
     * here would tell that reader the one thing the visible branch exists to stop saying.
     */
    a11yGroupOwned: (card: string, copies: number) =>
      `Which decks get ${card}: ${copies === 1 ? "1 copy" : `${copies} copies`}`,
    a11yOption: (deck: string, outcome: string) => `${deck}, ${outcome}`,
    a11ySelected: (deck: string) =>
      `${deck}, your choice. Choose again to go back to first committed.`,
    a11yCommander: (deck: string, card: string) =>
      `${deck} keeps ${card} as its commander. It can’t be moved.`,
  },
} as const;
