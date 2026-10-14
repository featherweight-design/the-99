/**
 * #389 — deck versioning. Production-final copy for the five §Surfaces plus the
 * Discard confirm, transcribed from the handoff's copy file.
 *
 * Vocabulary is fixed by §Modules: version · draft · commit a version.
 * Never "committed cards" — src/lib/decks/committed.ts owns that phrase and means
 * something else ("which deck is this card already in").
 *
 * Seven strings the handoff carries are deliberately absent, each because a
 * surface that would have said it does not exist:
 *
 * - `review.recounted`. Callers pass `String(n)` to the shipped
 *   `deckImportCopy.update.diff.recountedItem`. A second phrasing of one fact is
 *   how the two surfaces come to disagree.
 * - `review.bucketFree` / `bucketSleeved` / `bucketUnowned` and their two notes.
 *   R2 ruled availability a per-row treatment rather than a grouping, so there
 *   are no bucket headings to carry them. The buckets survive as COUNTS, which
 *   `chipBuy`, `chipPullable` and `groupInBreakdown` carry.
 * - `stamp.columnHeader`. The game log has no mono column-header row for `ver`
 *   to join, and inventing one is a change to a shipped surface this feature was
 *   not given.
 *
 * Numeric parameters are numbers rather than the repo's usual pre-formatted
 * strings wherever the string computes a plural or a sign from the figure
 * itself — `history.heading`, `history.gamesHeld` and `changed.delta`.
 */

/** The banner names the changes up to this many, and states counts beyond it. */
export const INLINE_CHANGE_MAX = 6;

/**
 * `1 card` / `2 cards`. Every figure in this module is a row or a copy count, so
 * one is an ordinary value for all of them and not an edge case: a draft with a
 * single add is the commonest draft there is.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const deckVersioningCopy = {
  /* ---- §Surfaces 1 · pending state on the deck page ---- */
  pending: {
    label: "Pending changes: not yet a version",
    counts: (adds: number, removes: number) =>
      [adds > 0 ? `+${adds}` : null, removes > 0 ? `−${removes}` : null]
        .filter(Boolean)
        .join(" / "),
    since: (n: number, version: number) => `${plural(n, "change")} since v${version}`,

    // The one figure that decides whether the review page is worth opening.
    //
    // `unfree` counts ROWS and `buy` counts COPIES, and they are not the same
    // number: one card wanted three times with no free copy is one row and three
    // copies. The sentence says both, so it takes both.
    //
    // "short of spare copies", never "has no free copy": a row wanting five with
    // one spare in the collection is unfree and is not uncovered, and the
    // narrower sentence would tell that player their own copy does not exist.
    money: (unfree: number, adds: number, buy: number, total: string) =>
      `${unfree} of the ${adds} ${unfree === 1 ? "is" : "are"} short of spare copies, ` +
      `so this commit will ask for ${buy} to buy · ${total}.`,
    moneyPulls: (n: number) =>
      n === 1
        ? "1 of those is sleeved in another deck and can be pulled instead."
        : `${n} of those are sleeved in other decks and can be pulled instead.`,
    // The positive counterpart of `money`, in the same words: covered means
    // enough spare copies for what the row asks, not one copy owned.
    moneyNone: "Every card coming in has enough spare copies, so this commit asks for nothing.",
    // A PRINTED card is not a spare copy, so `moneyNone` would be a lie about
    // where those cards are — the one thing this vocabulary may never say. The
    // commit still asks for nothing, which is the half worth keeping.
    moneyProxiedOnly: (n: number) =>
      n === 1
        ? "1 card coming in is a proxy, so this commit asks for nothing."
        : `${n} cards coming in are proxies, so this commit asks for nothing.`,
    // The MIXED list: some adds have a spare copy, some are printed. Stated as
    // one sentence rather than `moneyNone` plus a clause, because `moneyNone`
    // claims EVERY card coming in has a spare copy — which is exactly false of
    // the printed ones, and two sentences that disagree are worse than either.
    // "the rest are covered", never "the rest have spare copies": an added BASIC
    // is bucketed free because basics are unlimited, not because the collection
    // holds a spare — so the narrower sentence would describe a Swamp as a copy
    // the player owns. `covered` is legal in prose beside what did not happen,
    // which is exactly this sentence's shape.
    moneyProxiedMixed: (proxied: number, adds: number) =>
      `${proxied} of the ${adds} coming in ${proxied === 1 ? "is a proxy" : "are proxies"}`
      + ", the rest are covered, and this commit asks for nothing.",

    reviewCta: (n: number) => `Review ${plural(n, "change")}`,
    reviewLink: "review changes",
    commitCta: (version: number) => `Commit as v${version}`,
    discardCta: "Discard",

    // Inline name lines, at or below INLINE_CHANGE_MAX.
    addPullHint: (deck: string) => `or pull from ${deck}`,
    removeHint: "back in the pool on commit",

    // The decklist mark is a 2px --accent left rule on the row — the Component
    // notes table's width, which overrides §Surfaces' 3px prose — not a chip: the
    // card-rows floor makes horizontal room the binding constraint, and a chip would
    // take ~86px of name width on each of nineteen rows. The rule is absorbed by the
    // row's own padding. This string is the row's ACCESSIBLE NAME only — it is never
    // rendered visually.
    addMarkA11y: "pending add",
    /**
     * The card view's ONE drawn figure, which the list has no use for.
     *
     * A tile's count has a line of its own, so a recount's pair takes that
     * position rather than the name's — where the row must put it, because the
     * row's count lives beside the name. The pair is therefore bare here: the
     * name is already on the line below, and `deckImportCopy.update.diff
     * .recountedItem` would repeat it.
     *
     * There is no `tileAdded`. It existed, printing `+N` for a card the draft
     * added, and was RETIRED on 2026-09-15 (readiness erratum 11): it restated
     * the count beside it, and in a singleton format nearly every add is `+1`.
     * An add falls through to the ordinary count instead, which is what the row
     * already does — `decklist-row.tsx` prints its glyph on
     * `quantity > 1 && !recounted`, so an added singleton is a bare name there
     * too. A pair is different and stays: `6 → 8` is a move, and no count says
     * that.
     */
    tilePair: (from: number, to: number) => `${from} → ${to}`,
    // A recounted row prints `Sol Ring 1 → 2` beside the name, but the name's
    // accessible label is the card's whole printed name and carries no count, so
    // the pair would never be spoken. It rides the same description as the word.
    addMarkRecountedA11y: (from: number, to: number) =>
      `pending add, was ${from}, now ${to}`,
    // The same rule on a row whose count came DOWN — state 11 is `+1 / −1`, so a
    // cut of two copies out of three is as much a ruled row as an add is. It
    // cannot borrow the word above: the card is in v2, and calling the row a
    // pending add would say the opposite of what happened to it.
    cutMarkRecountedA11y: (from: number, to: number) =>
      `pending cut, was ${from}, now ${to}`,
    // Said once above the list instead of once per row. `changed`, not `added`:
    // the same rule marks a row the draft cut copies from.
    changeListCaption: (n: number) =>
      `the brass rule marks the ${plural(n, "row")} you have changed`,
    // On the group heading, so grouping by type also maps where the draft happened.
    groupChangeNote: (n: number) => `${n} changed, not yet committed`,
    // The list toolbar's right slot, replacing "n cards are yours now" while a draft exists.
    // `differ from`, not `not in yet`: a row that held three copies and now holds
    // one is in the version, at a count the version does not have.
    toolbarNote: (n: number, version: number) =>
      `${n} of these ${n === 1 ? "differs" : "differ"} from v${version}`,
    // The mix strip's header, beside the EDHREC source line: which list the five
    // figures below were counted from. Drawn only while a draft exists — on a
    // clean deck there is one list, and naming it would raise a question the
    // reader does not have.
    mixStripDraftNote: "· reading pending changes",
    // The mix cell's bottom-left slot takes the previous figure instead of the
    // recommendation while a draft exists — but ONLY when the figure actually moved.
    mixCellWas: (n: number) => `was ${n}`,
    // The caption above is not part of the cell's accessible name — a figure's and
    // a button's name come from `aria-label` — so the move is appended to it.
    mixCellWasA11y: (base: string, n: number) => `${base}, was ${n}`,

    // Committed and clean: the whole of versioning's permanent footprint.
    versionLine: (version: number, date: string) => `v${version} · committed ${date}`,

    // A versionless deck at a full body. Design's call, not the spec's — see READINESS.
    firstCommitCta: "Commit as v1",
    // `firstCommitNote` is RETIRED. It stated that committing "locks this list
    // as v1: nothing about the deck changes" — two mono lines answering a
    // question the control's own words raise and the review page behind it
    // answers in full, and on the desktop spine those lines were the widest
    // thing in the band's narrowest row.
  },

  /* ---- §Surfaces 2 · review changes ---- */
  review: {
    heading: (n: number, version: number) => `${plural(n, "change")} since v${version}`,
    /**
     * "Except the pulls" was true when a pull was the only decision on this page. It is not:
     * Put back (#390) restores a cut, and the contested rows give a copy to a deck. Naming them
     * all would make the sentence a list, so it names none and says what the page IS.
     *
     * AND IT PROMISES NOTHING ABOUT UNDOING. A first draft closed with "anything you change here
     * is yours to change back", which is true of a pick and of a put-back and not of a pull —
     * that one edits ANOTHER deck's draft, and is taken back there, by discarding that draft,
     * rather than here. A sentence that covers two of three decisions is worse than one that
     * covers none.
     */
    lede: (version: number) =>
      "The deck page already shows this list: this is what it costs to lock in as " +
      `v${version}.`,

    // A versionless deck reaches this page to cut v1, and neither line above can
    // describe it: there is no predecessor to count changes against, so the pair
    // would read "0 changes since v1" over a sentence about what a draft costs.
    // Nothing is coming in or going out either — the whole list is v1 — so the
    // page is the commit surface and these two say so.
    firstHeading: (n: number) => `${plural(n, "card")}, ready for v1`,
    firstLede:
      "This deck has no version yet, so there is nothing to compare it against. Committing " +
      "freezes the list exactly as it stands and starts using copies from your collection. " +
      "When two decks want one copy, the deck that has held it longest keeps it.",

    chipIn: "in",
    chipOut: "out",
    chipBuy: "to buy",
    chipPullable: "can be pulled",
    /**
     * The fifth chip, and it borrows `marker.over`'s own word: a contested arrival IS the over
     * state, so the strip, the marker and the receipt's section heading all say the same thing
     * about the same card. Counts CARDS, not copies — it is the number of decisions waiting on
     * this page, and each row is one.
     */
    chipShort: "still short",

    groupIn: (n: number) => `Coming in · ${n}`,
    groupOut: (n: number) => `Going out · ${n}`,
    // The fourth term is absent at zero, which is every deck that prints
    // nothing — so this line is byte-for-byte what it was until a proxy exists.
    // Ruling 9: a breakdown that does not account for every row in its group
    // reads as a rendering fault, and the word is the row chip's own.
    groupInBreakdown: (free: number, sleeved: number, buy: number, proxied = 0) =>
      `${free} free · ${sleeved} sleeved · ${buy} to buy`
      + (proxied > 0 ? ` · ${proxied} proxied` : ""),

    heldBy: (deck: string) => `in ${deck}`,
    // 2+ sources that can be chosen (addendum R1, "Pull it picks its source deck") — replaces
    // `heldBy(deck)` only in that case. The count is the picker's own candidate count, never
    // `claims.length`, which also counts guarded rows the control cannot act on.
    heldByMany: (n: number) => `in ${n} decks`,
    // After the pull, in the same held-by slot — linked to the source deck (`update-diff-row.tsx`).
    pulledFrom: (deck: string) => `pulled from ${deck}`,
    pull: "Pull it",
    pulling: "Pulling…",
    // The visible label stays "Pull it" when 2+ sources exist too — the caret beside it is a
    // glyph, `aria-hidden`, and this is what a reader tabbing to it hears instead.
    pullManyA11y: (card: string, n: number) => `Pull ${card}: choose from ${n} decks.`,
    // Never rendered — the button's accessible name, for the same reason the two
    // guards carry one. "Pull it" is two words repeated down a column of changed
    // rows, and a reader tabbing through them cannot tell which card leaves which
    // deck. The visible text stays two words because the row prints both names
    // beside it; only the name spoken out of context has to carry them.
    pullA11y: (card: string, deck: string) => `Pull ${card} from ${deck}.`,
    // The commander guard: commander claims are in the availability model, so `Pull it` would
    // otherwise be offered on a row where it can only ever fail. Same tag shape, and
    // the same silence — no route releases it, so there is nothing to offer.
    commanderGuardTag: "commander",
    commanderGuardA11y: (deck: string, card: string) =>
      `${card} is ${deck}’s commander. It can’t be pulled.`,

    // The source picker's own list (addendum R1) — the popover at ≥ md, the sheet below it.
    source: {
      title: (card: string) => `Pull ${card} from`,
      // What a card opened from this list calls it on the phone (stacked sheets R1, s5): the title
      // reads unfinished on a pill, and "Pull it" reads as an action.
      backLabel: "Which deck to pull from",
      order: "In the order they committed it",
      leaves: (n: number) => `→ ${n} cards`,
      newDraft: "new draft",
      joinsDraft: "joins its draft",
      lockedReason: "locked there, so Pull it passes it by",
      commanderReason: "its commander",
      // `count` is null when the figure read failed — the same degrade the visible text makes
      // (round-2 finding: a prior version filled a missing figure with the card's own `quantity`,
      // which is not a card count at all, and announced it as one).
      optionA11y: (deck: string, stamp: string, count: number | null, joins: boolean) =>
        `${deck}, ${stamp}.` +
        (count === null ? "" : ` Leaves it ${count} cards${joins ? ", in its draft" : ", in a new draft"}.`),
      consequenceNew: (deck: string, card: string) =>
        `${deck} goes into a draft with ${card} going out. Discard that draft and the card goes back.`,
      consequenceJoins: (deck: string, card: string) =>
        `${card} goes out in ${deck}’s draft, beside its other changes. Discard that draft and the ` +
        "card goes back.",
      confirm: (deck: string) => `Pull from ${deck}`,
      cancel: "Cancel",
    },

    // #587 cut the old second sentence for two reasons: it explained a per-row
    // toggle that did not exist, and it was long enough to crush the GOING OUT
    // heading beside it into three stacked lines. The toggle exists now, so the
    // first reason is spent; the second is why the replacement is six words and
    // not twenty-two, and why the heading keeps the `flex-none` that sweep gave
    // it. The handoff writes this in its plural head only — the singular arm is
    // kept, because "all 1 go back in the pool" is not a sentence.
    outNote: (n: number) =>
      `${n === 1 ? "it goes" : `all ${n} go`} back in the pool when you commit. ` +
      "Put one back and it never left.",

    // The breakdown and the footer each carry a purchase figure, and a failed
    // claim read leaves every add's bucket null — so all three terms of the
    // breakdown and the footer's `buy` come back at nought for a question nobody
    // answered. Printed as themselves they read as "nothing to buy", which is the
    // one thing the page must not say on a read it could not make. Same call the
    // pending banner makes when `claimsKnown` is false.
    groupInUnknown: "we couldn’t read what your other decks hold",
    footerUnknown: (cards: number, released: number) =>
      `${plural(cards, "card")} · ${released} back in the pool`,

    footer: (cards: number, buy: number, released: number) =>
      `${plural(cards, "card")} · ${buy} to buy · ${released} back in the pool`,
  },

  /* ---- Putting a cut card back (the `Going out` row) ----
   *
   * Derived from `draftDiff.removes`, which already enumerates every cut, so
   * this lives until the draft is committed and is stored nowhere. Nothing
   * expires — only #185's shortcut does — so there is no "restorable until"
   * string, no timer and no countdown.
   *
   * THERE ARE NO REFUSAL STRINGS, and that is a ruling rather than an omission.
   * A restore is an ADD, and adds in this app never refuse on claims — they
   * price them. `DeckAddRejection` is three values and all three are closed for
   * a row in this column: the card was in the deck's committed list, so
   * legality and colour identity already passed, and a commander is not a
   * `deck_cards` row so it never appears here. Refusing would make a restore
   * stricter than adding the same card from the deck page one route away.
   */
  restore: {
    cta: "Put back",
    ctaA11y: (card: string) => `Put ${card} back in the deck`,

    // Which of the three fires depends on what is left behind it, and no count
    // of nought is ever drawn — including in an announcement.
    announced: (card: string, cards: number, out: number) =>
      `${card} is back in the deck. ${plural(cards, "card")}, ${out} going out.`,
    announcedLastOut: (card: string, cards: number) =>
      `${card} is back in the deck. ${plural(cards, "card")}, nothing going out.`,
    // A restore can dissolve the draft entirely, which deletes the banner and
    // redirects the route. The absence IS the news, so this is the only notice.
    announcedLastChange: (card: string, version: number) =>
      `${card} is back in the deck. This deck matches v${version} again.`,

    // Not `DECK_REMOVE_FALLBACK_MESSAGE`, which says the card is still in the
    // deck: here the card is OUT, and the restore is what did not happen.
    failed: "We couldn’t put that card back. It’s still going out.",
  },

  /* ---- §Surfaces 3 · commit ---- */
  commit: {
    heading: (version: number) => `Commit this list as v${version}`,
    lede: (version: number, unfree: number, removed: number) => {
      const head = `v${version} becomes the deck’s list immediately.`;
      // A first commit, an all-free draft and a basics-only draft each leave one of
      // these figures at zero, and "The 0 cards short of spare copies" explains a
      // consequence nobody is facing. Only the halves that moved are named, and a
      // draft with neither says nothing further — the lede alone is the whole fact.
      //
      // "short of spare copies" is the banner's own wording, for the banner's own
      // reason: `unfree` counts a row a player holds one copy of and wants five,
      // and that row is not a card they own none of.
      const clauses = [
        unfree === 1
          ? "the one card short of spare copies keeps its buy tag until you actually buy it"
          : unfree > 1
            ? `the ${unfree} cards short of spare copies keep their buy tags until you ` +
              "actually buy them"
            : null,
        removed > 0
          ? `the ${removed} you cut ${removed === 1 ? "is" : "are"} back in the pool the moment ` +
            "you commit"
          : null,
      ].filter(Boolean);
      if (clauses.length === 0) return head;
      const rest = clauses.join(", and ");
      return `${head} ${rest.charAt(0).toUpperCase()}${rest.slice(1)}.`;
    },

    noteLabel: "Why this version exists: optional",
    // Offered at commit time precisely because it is unrecoverable afterwards (§Surfaces 3).
    noteWarning: "you can’t add this later: the version is not editable once committed",

    // The sheet carries the TOTAL, not the rows: the review page is directly above it
    // and already lists them. A confirmation that re-lists what you just read is a
    // second copy, not a confirmation.
    buyHeading: "To buy",
    // "still" is doing work: five pulls are on the table and you have not taken them.
    buyBreakdown: (unowned: number, sleeved: number) =>
      [unowned > 0 ? `${unowned} not owned` : null,
       sleeved > 0 ? `${sleeved} still sleeved elsewhere` : null]
        .filter(Boolean).join(" · "),
    buyBackLink: (n: number) =>
      `the ${plural(n, "row")} ${n === 1 ? "is" : "are"} on the review page ↑`,
    // The only link-out in this feature. See OVERLAPS.md, call 1.
    linkOut: "Open in Mana Pool",

    pullHeading: (n: number) => `Back in the pool · ${n}`,
    // The same label without its count, for the width that draws the figure
    // beneath it at 24px rather than inside the label (§Surfaces 3, desktop).
    pullHeadingPlain: "Back in the pool",
    pullNote:
      "No action required: committing is what releases them. Take them out of the box " +
      "whenever you next open it.",

    cta: (version: number) => `Commit v${version}`,
    ctaPending: "Committing…",
    cancel: "Cancel",
    footer: (cards: number, buy: number, released: number) =>
      `${plural(cards, "card")} · ${buy} to buy · ${released} released`,
    // The same line with the purchase term taken out, for the draft whose claim
    // read came back null. A failed read buckets every add as `null` with no
    // shortfall, so `buyCount` is 0 by absence rather than by fact, and "0 to
    // buy" would state the opposite of what is known.
    footerUnknown: (cards: number, released: number) =>
      `${plural(cards, "card")} · ${released} released`,

    refused: "We couldn’t commit that. The draft is unchanged.",
    // A transport failure, which is not a refusal: the write may have landed and
    // the reply may have been what was lost. `refused` promises the draft is
    // intact, and this is the one path that cannot promise it, so it says what is
    // true and names the re-read that will settle it.
    unresolved: "We lost the answer to that commit. Re-reading the deck to see whether it landed.",
    announced: (version: number, cards: number, buy: number) =>
      `Committed v${version}. ${plural(cards, "card")}, ${buy} to buy.`,
    // The same line with the purchase clause taken out, for the commit whose claim
    // read failed. The version was written and its size is known; what nobody can
    // say is what it costs, and "0 to buy" over a failed read tells the player
    // their shopping is finished. Same rule as `footerUnknown` and
    // `pullAnnouncedBuyUnknown`.
    announcedBuyUnknown: (version: number, cards: number) =>
      `Committed v${version}. ${plural(cards, "card")}.`,
    // Nullable total, because `DraftState.total` is: a purchase where no
    // requested copy carried a price is a real purchase with no figure, and the
    // pull that produced it still has to be announced. The clause is dropped
    // rather than filled with a fabricated zero.
    pullAnnounced: (card: string, deck: string, buy: number, total: string | null) =>
      `${card} pulled from ${deck}. ${buy} to buy${total === null ? "" : `, ${total}`}.`,
    // The same announcement with every word about buying taken out, for the pull
    // whose post-write read of the asking deck came back null. The copy moved and
    // the player asked for it, so the pull is still announced; what nobody can say
    // is what is left to buy. A 0 there would tell them their shopping is finished
    // over a read that failed, and "unknown" is a figure nobody offered.
    pullAnnouncedBuyUnknown: (card: string, deck: string) => `${card} pulled from ${deck}.`,
  },

  /* ---- Discard · unrecoverable, so it confirms (the #476 bar) ---- */
  discard: {
    // The number is in the question AND on the button: two changes and thirty-six
    // are different acts behind one word.
    //
    // No zero branch on any of the four below. There used to be one, for the
    // draft that moved only basic lands and so named no card; those lands are
    // rows now, and `hasChanges` is `changeCount > 0`, so a sheet that is up has
    // at least one change to count.
    question: (n: number) => `Discard ${plural(n, "change")}?`,
    consequence: (version: number, date: string, cards: number, adds: number, removes: number) => {
      const back = `The deck goes back to v${version} as committed on ${date}: ` +
        `${plural(cards, "card")}. `;
      // A draft can be adds-only or cuts-only, and "the 0 you cut" is a figure
      // nobody moved. Only the halves that exist are named, and the verb follows
      // what is left: two clauses are always plural, one is plural unless it
      // counts a single card.
      const lost = [
        adds > 0 ? `the ${adds} you added` : null,
        removes > 0 ? `the ${removes} you cut` : null,
      ].filter(Boolean).join(" and ");
      const single = adds > 0 && removes > 0 ? null : adds || removes;
      return `${back}${lost.charAt(0).toUpperCase()}${lost.slice(1)} ` +
        `${single === 1 ? "is" : "are"} not stored anywhere, so this can’t be undone.`;
    },
    confirm: (n: number) => `Discard ${plural(n, "change")}`,
    cancel: "Keep editing",
    pending: "Discarding…",
    announced: (n: number, version: number) =>
      `${plural(n, "change")} discarded. Back to v${version}.`,
    refused: "We couldn’t discard those. The draft is unchanged.",
    // The same distinction the commit sheet draws, and it matters more here: the
    // restore may have committed before the reply was lost, so "nothing has
    // changed" could be the opposite of the truth about a list that is gone.
    unresolved: "We lost the answer to that discard. Re-reading the deck to see whether it landed.",
  },

  /* ---- §Surfaces 4 · versions (the fourth tab) and the diff ---- */
  history: {
    // The tab. Count absent at zero — and at zero the TAB is absent too, because a
    // deck with no version has no history (§Decisions 4).
    tab: "Versions",
    // The count beside the label is aria-hidden, so the cell's whole accessible
    // name is composed here. There is no zero branch: at zero the cell is absent.
    tabAria: (n: number) => `Versions, ${plural(n, "version")} committed`,
    heading: (n: number) => plural(n, "version"),
    manaValue: (mv: string) => `mv ${mv}`,
    current: "current",
    committed: (date: string, cards: number) =>
      `committed ${date} · ${plural(cards, "card")}`,
    // The v1 panel's header block states the size of the list without the date
    // beside it — the title directly to its left already carries the date, and
    // `committed` would say it twice on one line.
    cardCount: (cards: number) => plural(cards, "card"),
    delta: (adds: number, removes: number) => `+${adds} / −${removes}`,
    // A v1 has no predecessor. Never "+99" — the migration stamped a list that
    // was already there; ninety-nine decisions were not taken that day.
    initial: "initial",
    noNote: "no note",
    gamesHeld: (n: number) => `held ${plural(n, "game")}`,
    // The opened panel's second stat box, which the canvas labels `Held` and
    // fills with `3 games`. `gamesHeld` cannot serve it: a box labelled `Held`
    // holding `held 3 games` says the verb twice. The label sits beside the
    // figure rather than inside it, exactly as `Mana value` does.
    heldLabel: "Held",
    heldValue: (n: number) => plural(n, "game"),

    diffIn: (n: number) => `In · ${n}`,
    diffOut: (n: number) => `Out · ${n}`,
    // H31: the rows draw today's ownership and price, so the line above them says the figures
    // are today's. Drawn only when the In column has rows.
    todayNote: (version: number) => `ownership and prices are today’s, not v${version}’s`,
    // After the name on an In row the deck holds some, not all, of: the copies this deck can
    // call on under Shopping's claim model (a copy a senior deck holds is not this deck's).
    partialOwned: (held: number, asked: number) => `has ${held} of ${asked}`,
    // Every tagged row's accessible description, in place of the decklist's `Owned` / `Not owned`.
    partialA11y: (held: number, asked: number) => `This deck has ${held} of the ${asked} this version runs`,
    owned: "Owned",
    notOwned: "Not owned",
    // A version with a predecessor and no card movement: the note, the commander
    // or the basics moved instead. Without this the panel opens on nothing at all,
    // which reads as a failed read rather than as an answer. No count in it — a
    // zero delta is an absence, not a figure.
    noChange: "no cards moved in or out of this version",
    // A read that was refused or failed. Never `noChange`: saying no cards moved
    // when the answer never arrived is a claim about the version, and the app does
    // not know it. Closing the row and opening it again is the retry.
    diffUnavailable: "we couldn’t read what this version changed. Open the row again to retry",

    initialHeading: "Initial",
    initialBody: "the first list, with nothing before it to compare against.",

    commanderChange: (from: string, to: string) => `${from} → ${to}`,
    /** One side of that arrow when the version was piloted by a pair. A partner
     *  swap changes who is at the helm as much as a commander swap does, and
     *  naming only the primary would render `Korvold → Korvold`. */
    commanderPair: (primary: string, partner: string) => `${primary} & ${partner}`,
  },

  /* ---- §Surfaces 2 · the what-changed strip ----
   * SIX cells: mana value plus the shipped five roles from ROLE_ORDER
   * (ramp, draw, removal, wipes, land). "body" is NOT a role in computeRoleCounts,
   * and a creature count already sits in the type-distribution block beside this.
   * Derived from draft-diff's two card sets plus the version's cards. No new column
   * and no new query — and it MUST be the same fold the deck page's mix strip uses,
   * or the two disagree on the same screen, one scroll apart. */
  changed: {
    manaValue: "Mana value",
    manaValueDown: "the curve comes down",
    manaValueUp: "the curve goes up",
    clears: (rec: number) => `clears rec ${rec}`,
    under: (rec: number) => `still under rec ${rec}`,
    body: "Body",
    bodyOver: (n: number) => `${n} over, not blocked`,
    shapeHeading: "How the deck’s shape moves",
    delta: (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0"),
  },

  /* ---- §Surfaces 5 · the game log stamp ---- */
  stamp: {
    value: (version: number) => `v${version}`,
    // Games played before this shipped were played by a list nobody recorded.
    // Null is the accurate value; a backfill would be a fabricated claim.
    absent: "—",
  },
} as const;

/**
 * v0 in Versions (precons R3 §5, `precons-link · copy strings.ts`): a linked deck's precon, drawn
 * last in the rail, its panel, and v1's line against it. One phrase for the box's list, `as the box
 * lists it` (R3 audit finding 8), and a brew form of the panel's body, which has no version to name.
 * The card count is the precon's own (finding 6).
 */
export const historyOriginCopy = {
  originDivider: "from the precon · before your first commit",
  originNote: (precon: string) => `${precon}, as the box lists it`,
  originMeta: (set: string, released: string, cards: number) =>
    `the precon · ${set} · released ${released} · ${plural(cards, "card")}`,
  originDelta: "the box",
  originHeading: "Before your first commit.",
  /** `current` is the newest committed version, `v3`; null on a linked brew (K14). */
  originBody: (precon: string, current: string | null) =>
    current === null
      ? `v0 is ${precon}’s list as the box lists it. It’s history only.`
      : `v0 is ${precon}’s list as the box lists it. It’s history only: this deck is sleeved as ${current}.`,
  originOpen: (precon: string) => `Open ${precon} ›`,
  againstOrigin: (precon: string) => `against v0 · ${precon}, as the box lists it`,
  kept: (kept: number, of: number) => `${kept} of the precon’s ${of} cards kept`,
  brewLine: "Not committed yet. Your first commit is v1, and it diffs against v0.",
  /** The tab's name with v0 in the rail: v0 is not a committed version, so it is named apart. */
  tabAria: (committed: number) =>
    committed === 0 ? "Versions, v0 only, nothing committed yet" : `Versions, v0 and ${plural(committed, "version")} committed`,
} as const;
