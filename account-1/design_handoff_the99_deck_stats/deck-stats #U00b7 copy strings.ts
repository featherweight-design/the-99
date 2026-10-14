// src/lib/copy/deck-stats.ts — "What this deck is", the four figures (design handoff R1).
// Shape follows src/lib/copy/price.ts: flat const object, functions for interpolated
// strings, no JSX. Figures arrive pre-formatted — formatCents owns the dollars, this
// module owns the words — so no string here ever sees a cents integer.
//
// ONE MEANING AT TWO ALTITUDES. Every per-deck string below is reused verbatim by the
// roll-up. The only strings the roll-up adds are `rollup.*`, and both of them are about
// SCOPE, not about the figures. If a figure ever needs a second wording at the other
// altitude, that is a third definition and decision 2 forbids it.
//
// ABSENCE IS AN EM DASH AND A SENTENCE, NEVER A ZERO. `0–0–0` is a figure nobody played,
// presented as if somebody had. `$0.00` is a price nobody quoted. Both are refused here
// so that no surface can render them by reaching for a string.
//
// THE BLOCK PRODUCES NO HEADLINE. `deriveHeadline`'s four outcomes belong to the Games
// tab and this module deliberately holds no sentence that could compete with them —
// no pattern voice, no finding, no "you won it". A figure and a denominator.
//
// THE CAVEAT CAPTION IS UNCONDITIONAL. `colours.overage` prints on a mono-colour deck
// where the figures do add up exactly. A conditional caveat teaches a reader that its
// absence means the figures sum to the denominator, which is false on the next deck.

export const deckStatsCopy = {
  // ── The block ─────────────────────────────────────────────────────────
  block: {
    heading: "What this deck is",
    // Desktop only. The phone eyebrow stands alone; there is no room for a gloss
    // beside it and the cells say the same thing in four labels.
    gloss: "four figures, measured against nothing",
    aria: "What this deck is",
  },

  // ── Record ────────────────────────────────────────────────────────────
  // The tab's own count is "games logged, never the record" (game-log.md:121) and the
  // tab keeps it. This is a figure in the block's register; it relabels nothing.
  record: {
    label: "Record",
    // All three terms, always. A record with a missing third term reads as a
    // different record, and en dashes because this is a score and not a range of
    // hyphenated words.
    figure: (wins: string, losses: string, draws: string) => `${wins}–${losses}–${draws}`,
    count: (games: string) => `${games} games logged`,
    countOne: "1 game logged",
    // Desktop gloss. Spells the figure's terms once, where there is room, so the
    // three numbers are never a guess.
    gloss: "wins–losses–draws",
    // played === 0. No pitch: the Games tab replaces its whole panel with one, and a
    // weaker second pitch beside it is worse than none.
    none: "no games logged",
    aria: (wins: string, losses: string, draws: string, games: string) =>
      `Record ${wins} wins, ${losses} losses, ${draws} draws across ${games} games logged`,
    ariaNone: "Record — no games logged yet",
  },

  // ── Colour identity spread ────────────────────────────────────────────
  // The genuinely new figure. `IdentityPips` states a commander's colours, which are the
  // deck's legal BOUNDS; this states how the 99 landed inside them. The vocabulary is
  // different because the claim is.
  colours: {
    label: "Colours",
    // Desktop label-row trailing clause. "Identity" is the field Commander's deck rule
    // is written in and the field the rest of the app filters a legal pool by — it is
    // not the mana cost, and a reader comparing this to the curve needs to know that.
    scope: "identity, not cost",
    // The six row letters. `C` is a letter and not a word because it sits in an 11px
    // column beside five others — and because the pips carry hue, the letters carry
    // greyscale, and one cannot be longer than the rest.
    rows: ["W", "U", "B", "R", "G", "C"] as const,
    denominator: (copies: string) => `of ${copies} cards`,
    // THE CAVEAT. Prints unconditionally. `copies` is carried beside the six figures
    // precisely so no surface infers a denominator by adding them up.
    overage: (copies: string) => `once per colour, so these add past ${copies}`,
    // Desktop joins the two into one caption line; phone stacks the caveat under the
    // rows and puts the denominator in the label row.
    caption: (copies: string) =>
      `of ${copies} cards · once per colour, so these add past ${copies}`,
    aria: (
      figures: string,
      copies: string,
    ) => `Colours by identity: ${figures}. Of ${copies} cards, counted once per colour, so these add past ${copies}`,
    // Joined by the component with ", ". Zero rows are included: a colour this deck
    // does not play is part of what the deck is.
    ariaRow: (letter: string, count: string) => `${letter} ${count}`,
    ariaLetter: {
      W: "white",
      U: "blue",
      B: "black",
      R: "red",
      G: "green",
      C: "colourless",
    },
  },

  // ── Mana curve ────────────────────────────────────────────────────────
  // The word is already taken: versioning's what-changed strip uses `curve` for a
  // one-number average over the COMMITTED list with no commander. Both figures keep the
  // word and each names its list. Dropping `listClause` re-opens that collision.
  curve: {
    label: "Curve",
    average: (avg: string) => `avg ${avg}`,
    // curve.copies === 0 → average is null. Never `avg 0`, which reads as a deck of
    // Moxen rather than as a deck with nothing to cast.
    averageNone: "avg —",
    // THE LIST CLAUSE. The block reads the live draft with both commanders folded in;
    // the strip reads deck_version_cards alone. The two can legitimately differ, and
    // this is the only thing on screen that explains why.
    listClause: "live list, both commanders in",
    counted: (copies: string) => `${copies} cast`,
    // Lands are reported rather than drawn, exactly as manaCurve reports them. Never a
    // ninth column: a land is not cast, and its mana value of zero would pile a third
    // of the deck into the 0 bucket.
    lands: (lands: string) => `${lands} lands, excluded`,
    landsNone: "no lands yet",
    nothingCast: "nothing to cast yet",
    // Bucket 7 is a ceiling (CURVE_MAX), not a cost. The label is what stops it being
    // read as a count of sevens.
    bucketLabel: (cmc: number) => (cmc >= 7 ? "7+" : String(cmc)),
    caption: (copies: string, lands: string) =>
      `${copies} cast · ${lands} lands, excluded · live list, both commanders in`,
    aria: (buckets: string, avg: string, copies: string, lands: string) =>
      `Mana curve: ${buckets}. Average ${avg} over the live list with both commanders in. ${copies} cast, ${lands} lands excluded`,
    ariaBucket: (cmc: string, copies: string) => `${cmc} mana ${copies}`,
    ariaNoAverage: (lands: string) =>
      `Mana curve: nothing to cast yet, so there is no average. ${lands} lands excluded`,
  },

  // ── Cost to complete ──────────────────────────────────────────────────
  // `To buy` is the shipped word on the tile, the rail and Commitments, all three of
  // which read loadShoppingRollup. This cell reads the same roll-up, so it takes the
  // same word. The price strip 400px below sums the decklist's own Shopping rows and
  // keeps its own wording — `deficit` is the clause that tells them apart.
  cost: {
    label: "To buy",
    figure: (copies: string) => copies,
    unit: "copies",
    unitOne: "copy",
    // THE CLAUSE THAT EARNS THE FOURTH PRINTING. The deck page is the only surface
    // where both cost figures are visible at once, so it is the only one that can say
    // which is which.
    deficit: "after the copies you already own",
    // Reused verbatim from priceCopy.strip.pricedClause. Same fraction, same meaning,
    // one wording.
    pricedClause: (priced: string, total: string) => `${priced} of ${total} priced`,
    // Reused verbatim from priceCopy.strip.provenanceUnpriced. The feed omits an
    // out-of-stock card rather than pricing it at zero, so this is our gap and not the
    // player's error.
    unpriced: "no prices from ManaPool for these",
    // cost === null. NOT "complete", NOT "done", NOT "$0.00". The roll-up excludes
    // basic lands, so a deck whose only gap is thirty Forests lands here too.
    none: "nothing to buy",
    noneNote: "basics are never counted, so this is not finished",
    aria: (copies: string, figure: string, priced: string, total: string) =>
      `To buy ${copies} copies, ${figure}, ${priced} of ${total} priced, after the copies you already own`,
    ariaAllPriced: (copies: string, figure: string) =>
      `To buy ${copies} copies, ${figure}, after the copies you already own`,
    ariaUnpriced: (copies: string) =>
      `To buy ${copies} copies, no prices from ManaPool for these`,
    ariaNone: "Nothing to buy — basics are never counted, so this is not finished",
  },

  // ── The roll-up altitude (Home) ───────────────────────────────────────
  // Two figures, not four. sumPlayRecords and sumColourSpreads exist for this altitude;
  // there is no sumManaCurves, and cost already has a home in the Commitments card.
  // Every figure string above is reused unchanged — only scope is new.
  rollup: {
    heading: "What you play",
    scope: (decks: string) => `across ${decks} decks`,
    scopeOne: "across 1 deck",
    // Why the record is a sum and not a re-tally: adding the per-deck records is the
    // same answer, and it is the one a page holding the per-deck figures already has.
    recordGloss: "every deck's record, added",
    recordNone: "no games logged yet",
    recordNoneNote: "the roll-up of one deck's absence is the same absence",
    aria: "What you play",
  },
} as const;
