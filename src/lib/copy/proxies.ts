// Production strings for deck proxies — /decks/[id], the card detail receipt,
// and /collection/proxies. Ships as src/lib/copy/proxies.ts.
//
// Conventions carried from lib/copy/availability.ts and lib/copy/set-collections.ts:
//   - figures are interpolated, never baked into a sentence fragment
//   - every plural has an explicit singular
//   - nothing here names an internal noun (no "deck_proxies", no "anti-join")
//
// THE ONE RULE. availability.ts's header states it: "Nothing here may assert where a
// physical card is: we describe LISTS, never boxes, binders or sleeves." A proxy is the
// first feature that can break it, because it fills a slot with no card behind it. So:
//
//   * NOTHING in this file may be read as ownership. Not "you have it", not "sorted",
//     not a bare "covered". The marked state always says what did NOT happen, in the same
//     breath as what did — see control.marked.
//   * "covered" is legal in PROSE and illegal as a LABEL. In a sentence that also names
//     what stayed untouched it is exact; alone on a tag it reads as a state the app has
//     granted rather than a choice the player made.
//   * NO QUANTITY, anywhere (ruling 5). There is no copy in this file that takes a count
//     of proxies for one card, because a proxy covers the whole ask and there is nothing
//     to count. Counts of CARDS and of DECKS are fine and appear throughout.
//
// THE MARK IS A GLYPH AND THE WORD LIVES IN THREE PLACES. The row draws `P` and never
// the word — money draws `$` at the same density for the same reason. So "proxy" is
// authored in the key (`key.proxy`), in the mark's `title` (`tag.title`) and in its
// accessible name (`tag.aria`), which is exactly how BuyTag's collapsed density already
// speaks its own glyph. Three carriers, never one: a one-character mark is only safe for a
// fact the app must not be vague about if the word is reachable three ways.
//
// VOCABULARY. The noun is "proxy" and the verb is "run" — the words players already use,
// and the word in the route. Rejected: "printed" (one letter from the printing picker's
// own noun, on surfaces that ship both), "paper" (slang, and it names the object rather
// than the deck's answer), "covered" as a label (above).

export const proxyCopy = {
  // ── The tag (deck row and commander caption) ──────────────────────────
  // One word, no tail, no figure, no collapsed density. It shares a slot with BuyTag and
  // the two can never co-occur — see lib/decks/row-tag.ts, which is where that is
  // enforced rather than here.
  tag: {
    // Drawn, and never spoken — the glyph stands for the word rather than saying it, which
    // is the ruling BuyTag's own collapsed `$` already carries.
    glyph: "P",
    // Hover, for a pointer. Two words, because the surface owes two words: anything longer
    // belongs on the about page.
    title: "Proxy",
    // The row's own reading order carries the card name, so the mark does not repeat it.
    // Stated as the deck's answer, not as a property of the card.
    aria: "You’re running a proxy for this one",
    // The pair case, and ONLY the pair case: two commanders, two independent flags, one
    // caption row, so a bare glyph would be ambiguous about WHICH commander. Short name,
    // after a middot. Never "P×2" — ruling 5.
    pair: (shortName: string) => `P · ${shortName}`,
    pairTitle: (shortName: string) => `Proxy · ${shortName}`,
    pairAria: (name: string) => `You’re running a proxy for ${name}`,
  },

  // ── The key, under the decklist toolbar ───────────────────────────────
  // Lists ONLY the marks the current view contains, and renders nothing when it contains
  // none — an empty legend is furniture, and this app is already strict about that (the
  // availability marker renders null when free; the roll-up region is absent at zero).
  //
  // TWO WORDS PER MARK, MAXIMUM. The key answers "what is this glyph" and stops; the about
  // page answers everything else. This is also the surface every future mark is added to —
  // game changers, bracket movers — so it takes its entries as data rather than as a
  // hardcoded pair.
  key: {
    buy: "to buy",
    proxy: "proxy",
    // The door to the about page. OMITTED, not disabled, until that page exists — the key
    // stands alone perfectly well and the pointer is the addition.
    about: "what the marks mean",
    // The key is a group of samples, not a control. Labelled so a screen reader arriving at
    // it knows what it is looking at, since every glyph inside it is aria-hidden.
    regionAria: "What the marks on these rows mean",
    // The same label for the card view's instance, where there are no rows. A
    // SIBLING and never an edit: the list still has rows, and one string cannot
    // be true of both surfaces.
    //
    // `cards`, not `tiles`. The reader is looking at cards; `tile` is the name
    // of the component that draws one, and no string in this app says an
    // internal noun out loud.
    regionAriaCards: "What the marks on these cards mean",
  },

  // ── The control, in the card sheet ────────────────────────────────────
  // Absent without a deck context. There is no string for that state, on purpose, so a
  // future edit cannot accidentally give the absence a label.
  control: {
    heading: "In this deck",
    // The deck is named in the LABEL rather than the heading: a sheet paged through with
    // Prev/Next is easy to lose your place in, so the name belongs in the sentence the
    // reader is about to act on.
    label: (deck: string) => `Run a proxy in ${deck}`,
    // Two clauses, and the second is the one that matters. "This deck's slot is filled"
    // alone invites the inference the whole feature exists to prevent.
    marked: (deck: string) =>
      `${deck}’s slot is filled. No copy in your collection is used.`,
    // Ruling 2, said once, in both states. The reader's real question is "do I have to
    // commit this?" and it is cheaper to answer than to leave hanging.
    note: "Takes effect at once. A proxy is not part of a version.",
    // The read failed, so the app cannot say whether this one is printed — and a
    // toggle drawn over a state nobody knows invites the wrong press. Greyed in
    // place rather than absent: the control still belongs here, it just cannot
    // answer yet.
    unknown: "Can’t tell whether this one’s a proxy right now.",
    // The membership validation can refuse: the card left the deck between render and tap.
    // Names what is true now rather than what failed.
    refused: (card: string) => `${card} isn’t in this deck any more, so there’s nothing to proxy.`,
    announceMarked: (card: string, deck: string) =>
      `${card} is now a proxy in ${deck}. No copy in your collection is used.`,
    // States the consequence, because it is the one that can surprise: the deck starts
    // claiming again and may find its copy senior-claimed elsewhere.
    announceUnmarked: (card: string, deck: string) =>
      `${card} is no longer a proxy in ${deck}. This deck is asking for a copy again.`,
  },

  // ── The card detail receipt ───────────────────────────────────────────
  // Sits BELOW availabilityCopy.collection's split line, behind a hairline. The hairline
  // is the boundary of the arithmetic: everything above it sums to `owned`.
  //
  // A gerund where the two headings above it are prepositional phrases, deliberately —
  // it is a thing you are DOING rather than a place. Flagged in READINESS as a seam a
  // copy review may want levelled.
  receipt: {
    heading: "Running a proxy",
    // No right-hand column and therefore no per-row string: `holds N` / `wants N` are
    // quantities of cardboard, and `prints 1` would put a quantity on a thing ruling 5
    // says has none. The missing figure IS the statement.
    note: (deckCount: number) =>
      deckCount === 1
        ? "This deck is covered and asks nothing of your collection."
        : "These decks are covered and ask nothing of your collection.",
    // The total, when the player owns none. "none" rather than "0", which is
    // availabilityCopy.marker's own rule: every neighbouring number on these surfaces is
    // a quantity you can act on, and a leading 0 beside them reads as one more tally
    // rather than as an absence. It also takes --fg-muted and never --accent, because
    // accent is a quantity you HAVE.
    ownsNone: "none",
    deckLinkAria: (deck: string) => `Open the ${deck} deck`,
  },

  // ── The deck header (decision 6 — severable) ──────────────────────────
  // One mono line under the progress bar, absent at zero. It exists because a deck can
  // read Complete with printed cards in it, which is correct and is also the exact moment
  // a player could be misled. Says "proxies" and not "N you don't own" — the latter is
  // true of the buy list too and means something else there.
  deckHeader: {
    line: (n: number) =>
      n === 1 ? "1 of these is a proxy" : `${n} of these are proxies`,
  },

  // ── The /decks tile (R2) ──────────────────────────────────────────────
  // The SAME FACT as deckHeader.line, at the tile's density. The deck page has a wide
  // band; this is a truncating 10.5px cell in a column that is 189px at 640px of
  // viewport, and the slot's shipped idiom is figure-plus-noun: `4 over`, `3 lines
  // unresolved`, `3 in use elsewhere`. Same word in both so nobody learns two.
  //
  // It rides `detailFor`'s existing slot as a SECOND FALLBACK into the null branch,
  // ranked after the Building + inUseElsewhere clause — that one answers "what is holding
  // this deck up" and a proxy is not holding anything up. It never displaces a figure,
  // which is also what stops it ever taking a warning colour: every status that would
  // lend it one already has a figure in the slot.
  //
  // No aria string, deliberately. The tile's overlay link composes its own name from
  // `cardAria(name, identity, status, count, detail, lastPlayed)`, so this lands in it in
  // position — "… Complete, 99 / 99, 7 proxies".
  deckCard: {
    line: (n: number) => (n === 1 ? "1 proxy" : `${n} proxies`),
  },

  // ── The review row on /decks/[id]/changes (R2) ────────────────────────
  // NOT a branch of `bucketWord`, though R2 drew it as one. The row's VISIBLE mark is
  // `ProxyTag` in the availability slot — the same slot and treatment the buy tag takes,
  // which is what keeps the two exclusive — and its per-row word is a full sentence on
  // `describedBy` rather than a chip. `bucketWord` deliberately has no `proxied` arm:
  // returning the bare chip there would only make the sentence unreachable.
  //
  // WHY IT IS NOT SILENT. `bucketWord` returns null at `free` and at a null bucket, so
  // silence was available and would have cost nothing to adopt. It is wrong: `free` means
  // "your collection has a spare copy for this", and drawing a proxied add the same way
  // asserts a copy in a box — on the one surface whose job is telling a player what a
  // commit will cost them.
  //
  // Names the cause, like the tag does, and unlike its two neighbours (`to buy`, `can be
  // pulled`) which name what you can do about it. There is nothing to do about this one.
  review: {
    // NOT RENDERED. The review row's visible mark is `ProxyTag` in the
    // availability slot — the same slot and the same treatment the buy tag
    // takes, which is what keeps the two exclusive — and its per-row word is
    // read aloud rather than drawn. Kept because the handoff authored it and a
    // future surface that draws a word-chip per row would want this one.
    chip: "proxied",
    // Never rendered — the row's accessible description, riding `describedBy`, which is
    // where this page already carries the availability word "so the buy tag's colour is
    // not the only statement of it". Shaped like `commanderGuardA11y`: a full sentence
    // that names the card and offers no action.
    a11y: (card: string) =>
      `${card} is a proxy in this deck, so this add asks nothing of your collection.`,
  },

  // ── /collection/proxies ───────────────────────────────────────────────
  page: {
    title: "What you’re printing",
    // The second clause is a clarification for a player who HAS a collection, so it drops
    // for one who does not — that reader needs no reassurance about a collection they
    // never made.
    subtitle: (cards: number, decks: number) =>
      `${cards === 1 ? "1 card" : `${cards} cards`} across ${decks === 1 ? "1 deck" : `${decks} decks`}.`,
    subtitleWithCollection: (cards: number, decks: number) =>
      `${cards === 1 ? "1 card" : `${cards} cards`} across ${decks === 1 ? "1 deck" : `${decks} decks`}.`
      + " Marking a proxy fills a deck’s slot and uses no copy, so nothing here has moved in or out of your collection.",
    tail: (remaining: number) =>
      remaining === 1 ? "… 1 more card" : `… ${remaining} more cards`,
  },

  // The money, and it always states its own gap. Never a bare total, and never a total
  // that silently treats an unstocked card as zero. Same sentence shape as the set page's
  // cost strip, with one word changed.
  cost: {
    label: "Cost to own them for real",
    line: (priced: number, total: number) => `over ${priced} of the ${total}`,
    unpriced: (n: number) =>
      n === 1
        ? "1 has never been stocked and is not in this figure"
        : `${n} have never been stocked and are not in this figure`,
    // RENDERED since the loader took the app's own price read: `priceState`
    // tells sold-out from never-stocked, and the two are different facts — one
    // card was on sale and is not now, the other never has been.
    soldOut: (n: number) =>
      n === 1
        ? "1 is sold out and is not in this figure"
        : `${n} are sold out and are not in this figure`,
    stale: (asOf: string) => `prices as of ${asOf}`,
    // Stands in for the figure when nothing on the list can be costed. A zero would read
    // as a list that costs nothing to own rather than one nobody is selling.
    noneCostable: "no price",
  },

  row: {
    // The row is a container with several targets — the card name opens the sheet, each
    // deck name is its own link — so there is no single row label to write. These name
    // the parts.
    cardAria: (name: string) => `${name}, card details`,
    deckAria: (deck: string) => `Open the ${deck} deck`,
    deckCount: (n: number) => (n === 1 ? "1 deck" : `${n} decks`),
    // Ruling 3's case is invisible in this list otherwise — a legend looks like any other
    // card here. Neutral hairline skin, never a colour.
    commander: "commander",
    commanderAria: "This deck’s commander",
    noStock: "no stock",
    noStockAria: "Never stocked at Mana Pool",
  },

  // Three branches. (a) and (b) differ because they name different preconditions, and an
  // empty state that names the wrong one sends the reader somewhere that will not help.
  // Neither mentions the collection, which is the rule this whole route is built on.
  empty: {
    // Has decks, proxies none of them.
    heading: "You’re not printing anything",
    body:
      "When a card in a deck is too expensive to buy, or two decks want the one copy you have, mark one of them as a proxy from the card’s sheet. It lands here.",
    action: "Go to your decks",
    // No decks at all. The only branch with a filled button, because here there genuinely
    // is one next act.
    noDecksHeading: "Proxies start in a deck",
    noDecksBody:
      "A proxy is one deck’s answer about one slot, so there has to be a deck first. Build one and this page fills itself in.",
    noDecksAction: "Build a deck",
  },

  // Refusals. Both are states a reader can reach by being slow rather than by
  // doing anything wrong — a card cut in another tab, a deck deleted — so
  // neither blames them and neither names a table.
  error: {
    notInDeck: "That card isn’t in this deck any more.",
    // DIRECTION-NEUTRAL. One string covers both presses, because the throw that
    // produces it does not know which one it interrupted — and "couldn't mark
    // that" over a failed UNMARK names the opposite of what the reader did.
    refused: "That may not have saved. Reload to see the proxy mark.",
  },
} as const;
