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
    label: "Pending changes — not yet a version",
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
      `the brass rule marks the ${plural(n, "row")} this draft changed`,
    // On the group heading, so grouping by type also maps where the draft happened.
    groupChangeNote: (n: number) => `${n} changed in this draft`,
    // The list toolbar's right slot, replacing "n cards are yours now" while a draft exists.
    // `differ from`, not `not in yet`: a row that held three copies and now holds
    // one is in the version, at a count the version does not have.
    toolbarNote: (n: number, version: number) =>
      `${n} of these ${n === 1 ? "differs" : "differ"} from v${version}`,
    // The mix strip's header, beside the EDHREC source line: which list the five
    // figures below were counted from. Drawn only while a draft exists — on a
    // clean deck there is one list, and naming it would raise a question the
    // reader does not have.
    mixStripDraftNote: "· reading the draft",
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
    firstCommitNote: "locks this list as v1 — nothing about the deck changes",
  },

  /* ---- §Surfaces 2 · review changes ---- */
  review: {
    heading: (n: number, version: number) => `${plural(n, "change")} since v${version}`,
    lede: (version: number) =>
      "Nothing here is a decision except the pulls. The list on the deck page is already " +
      `this list — this page exists to show you what it costs before you lock it in as v${version}.`,

    chipIn: "in",
    chipOut: "out",
    chipBuy: "to buy",
    chipPullable: "can be pulled",

    groupIn: (n: number) => `Coming in · ${n}`,
    groupOut: (n: number) => `Going out · ${n}`,
    groupInBreakdown: (free: number, sleeved: number, buy: number) =>
      `${free} free · ${sleeved} sleeved · ${buy} to buy`,

    heldBy: (deck: string) => `in ${deck}`,
    pull: "Pull it",
    pulling: "Pulling…",
    // The guard: the source deck has pending changes of its own, so committing it
    // automatically would sweep somebody's half-finished tinkering into a version.
    // The deck NAME is already on the row, so the reason is a four-letter tag beside
    // it and the action is the same width as `Pull it`. R1's two-line sentence
    // ("that deck has its own pending changes →") was too long visually and in copy.
    pullGuardTag: "pending",
    pullGuardAction: "Open →",
    // Never rendered — the action's accessible name.
    pullGuardA11y: (deck: string, card: string) =>
      `${deck} has pending changes of its own. Open it to release ${card}.`,
    // Third guard: commander claims are in the availability model, so `Pull it` would
    // otherwise be offered on a row where it can only ever fail. Same tag shape, NO
    // action — no route releases it, so an "Open →" would lead somewhere that cannot help.
    commanderGuardTag: "commander",
    commanderGuardA11y: (deck: string, card: string) =>
      `${card} is ${deck}'s commander. It cannot be pulled.`,

    outNote: (n: number) =>
      `${n === 1 ? "it goes" : `all ${n} go`} back in the pool when you commit. No per-row ` +
      "toggle: putting one back is adding it to the deck, and the deck page already does that.",

    footer: (cards: number, buy: number, released: number) =>
      `${plural(cards, "card")} · ${buy} to buy · ${released} back in the pool`,
  },

  /* ---- §Surfaces 3 · commit ---- */
  commit: {
    heading: (version: number) => `Commit this list as v${version}`,
    lede: (version: number, unfree: number, removed: number) => {
      const head = `v${version} becomes the deck's list immediately.`;
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

    noteLabel: "Why this version exists — optional",
    // Offered at commit time precisely because it is unrecoverable afterwards (§Surfaces 3).
    noteWarning: "you cannot add this later — the version is not editable once committed",

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
    pullNote:
      "No action required — committing is what releases them. Take them out of the box " +
      "whenever you next open it.",

    cta: (version: number) => `Commit v${version}`,
    ctaPending: "Committing…",
    cancel: "Cancel",
    footer: (cards: number, buy: number, released: number) =>
      `${plural(cards, "card")} · ${buy} to buy · ${released} released`,

    refused: "We couldn't commit that version. Your changes are still here.",
    announced: (version: number, cards: number, buy: number) =>
      `Committed v${version}. ${plural(cards, "card")}, ${buy} to buy.`,
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
    question: (n: number) => `Discard ${plural(n, "change")}?`,
    consequence: (version: number, date: string, cards: number, adds: number, removes: number) => {
      const back = `The deck goes back to v${version} as committed on ${date} — ` +
        `${plural(cards, "card")}. `;
      // A draft can be adds-only, cuts-only, or basics-only, and "the 0 you cut" is
      // a figure nobody moved. Only the halves that exist are named, and the verb
      // follows what is left: two clauses are always plural, one is plural unless
      // it counts a single card.
      const lost = [
        adds > 0 ? `the ${adds} you added` : null,
        removes > 0 ? `the ${removes} you cut` : null,
      ].filter(Boolean).join(" and ");
      if (!lost) {
        return `${back}Nothing in this draft is stored anywhere, so this cannot be undone.`;
      }
      const single = adds > 0 && removes > 0 ? null : adds || removes;
      return `${back}${lost.charAt(0).toUpperCase()}${lost.slice(1)} ` +
        `${single === 1 ? "is" : "are"} not stored anywhere, so this cannot be undone.`;
    },
    confirm: (n: number) => `Discard ${plural(n, "change")}`,
    cancel: "Keep editing",
    pending: "Discarding…",
    announced: (n: number, version: number) =>
      `${plural(n, "change")} discarded. Back to v${version}.`,
    refused: "We couldn't discard those changes. Nothing has changed.",
  },

  /* ---- §Surfaces 4 · versions (the fourth tab) and the diff ---- */
  history: {
    // The tab. Count absent at zero — and at zero the TAB is absent too, because a
    // deck with no version has no history (§Decisions 4).
    tab: "Versions",
    heading: (n: number) => plural(n, "version"),
    manaValue: (mv: string) => `mv ${mv}`,
    current: "current",
    committed: (date: string, cards: number) =>
      `committed ${date} · ${plural(cards, "card")}`,
    delta: (adds: number, removes: number) => `+${adds} / −${removes}`,
    // A v1 has no predecessor. Never "+99" — the migration stamped a list that
    // was already there; ninety-nine decisions were not taken that day.
    initial: "initial",
    noNote: "no note",
    gamesHeld: (n: number) => `held ${plural(n, "game")}`,

    diffIn: (n: number) => `In · ${n}`,
    diffOut: (n: number) => `Out · ${n}`,
    diffNote:
      "no ownership dot, no prices, no pull offers — this is what the deck was, not what it needs",

    initialHeading: "Initial",
    initialBody:
      "the list as it stood when versioning arrived. There is nothing before it to compare " +
      "against, so there is no diff to show.",
    initialBrowse: (cards: number) => `Browse the ${plural(cards, "card")} →`,

    commanderChange: (from: string, to: string) => `${from} → ${to}`,
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
    // The six cells, in order. `body` above is the hero's over-cap line, NOT a strip cell.
    cells: ["manaValue", "ramp", "draw", "removal", "wipes", "land"] as const,
    shapeHeading: "How the deck's shape moves",
    shapeRow: (before: number, after: number) => `${before} → ${after}`,
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
