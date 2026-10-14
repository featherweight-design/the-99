// src/lib/copy/price.ts — price on the buy tag (#288).
// Shape follows src/lib/copy/availability.ts: flat const object, functions for
// interpolated strings, no JSX. Figures arrive pre-formatted — formatCents in
// src/lib/decks/price.ts owns the dollars, this module owns the words — so no
// string here ever sees a cents integer.
//
// VOCABULARY IS LOAD-BEARING. "sold out" is a fact about the shop, not about
// the player: it says a printing was stocked and is not stocked now. It is
// never "unavailable" (which the availability block already spends on decks
// holding a card) and never "out of stock at ManaPool" (which invites the
// question of other shops, and we have one feed).
//
// SILENCE IS A STATE. There is no string for a card we have no price for. Not
// "—", not "$0.00", not "price unknown". A missing price is not free and not an
// error; it is a card the feed has never stocked. The bare `buy` tag already
// says everything true about it, and giving that state a label here would be
// the first step toward rendering one.
//
// THE PROVENANCE LINE IS NOT A WARNING. "these are behind" describes our
// ingest, which the player did not cause and cannot fix. It rides --fg-locked
// with the rest of line 2, and nothing in this block reaches for alarm words.
export const priceCopy = {
  // ── The tag's tail ────────────────────────────────────────────────────
  // The separator between `buy` and the tail is the component's, not copy —
  // it is a coloured span, not a character in a sentence.
  tag: {
    soldOut: "sold out",
    // Suffixes on the figure, e.g. `$2.10 foil`. Lower case: they qualify the
    // figure, they do not label it.
    foil: "foil",
    etched: "etched",
  },

  // ── The price strip ───────────────────────────────────────────────────
  strip: {
    // Line 1's second clause. Drops entirely when priced === total — the
    // filter pill and the spine already say that number twice on the same
    // screen, and a third instance names nothing missing. It also drops at
    // priced === 0, where `provenanceUnpriced` below says the same thing in
    // words rather than as a fraction of nothing.
    pricedClause: (priced: number, total: number) => `${priced} of ${total} priced`,

    // Line 2, joined by the component with ' · '. `provenance` and
    // `provenanceUnpriced` are alternatives for the FIRST clause only —
    // `lastChecked` and `behind` follow either one unchanged.
    provenance: "prices from Mana Pool",
    // Replaces `provenance` when no row on the list has a price. States the
    // absence rather than a check we cannot evidence, and keeps the same ink:
    // the feed has never stocked these, which is our gap and not the player's
    // error. The buy link below is why this line now has something to say —
    // we could not price these, the store can.
    provenanceUnpriced: "no prices from Mana Pool for these",
    lastChecked: (when: string) => `last checked ${when}`,
    behind: "these are behind",
  },

  // ── The cheapest-printing line ────────────────────────────────────────
  // Drawn beside the card modal's own tag, and ONLY where another printing of
  // the same card is cheaper than the one on screen. `from` is the marketplace
  // idiom for the bottom of a range, which is exactly what it is: the figure
  // beside it belongs to this printing, and this one is where the card starts.
  //
  // It is not a warning and not an instruction. The reader arrived from a
  // surface that quotes the cheapest printing, and without this the two figures
  // are simply two numbers for one card.
  // The spoken sentence names the FINISH, because the figure is the cheapest
  // NON-FOIL printing and a live foil can undercut it — "cheapest printing" would
  // then be a false claim, and the one reader who cannot see the tag beside it is
  // the one being told. The visible `from` carries no such claim on its own: the
  // tag it sits beside states its own finish, and a 10px line that spelled the
  // qualifier out would be the longer half of the pair.
  cheapest: {
    from: (figure: string) => `from ${figure}`,
    aria: (figure: string) => `cheapest non-foil printing of this card is ${figure} at Mana Pool`,
  },

  // ── Accessible names ──────────────────────────────────────────────────
  // Spoken once per price, on the tile only. The decklist row passes no label:
  // the word `buy` already sits in that row's reading order.
  aria: {
    priced: (figure: string, when: string) =>
      `${figure} at Mana Pool, last checked ${when}`,
    // Same sentence with the behind clause appended, rather than a second
    // sentence — one utterance per price, however old the table is.
    pricedBehind: (figure: string, when: string) =>
      `${figure} at Mana Pool, last checked ${when}, these prices are behind`,
  },

  // ── The export dialog's correction ────────────────────────────────────
  // Two hardcoded copies of one claim ("pricing is a planned add") become
  // false the moment this pass ships. One key, both call sites.
  export: {
    pricingNote: "Prices show in the app · exports copy names only",
  },
} as const;
