// The 99 — card surfaces · copy strings
// Handoff: design_handoff_the99_card_surfaces (R1). Covers #349, #350, #351, #363.
//
// Almost everything on these surfaces is a REUSE. This file holds only the
// strings that do not exist yet, and names the module that owns each string
// that does. No visible copy on the decklist row changes; the pips are drawn,
// not written.

// ─── NEW ─────────────────────────────────────────────────────────────────────

/**
 * R2 call 1 — BuyTag's collapsed density.
 *
 * On the All tab the tag draws a bare `$`; on Shopping it draws the full
 * `buy $12.40`. The VISIBLE text collapses, the accessible name does NOT: a
 * screen reader gets the word and the price at both densities, because the
 * collapse buys horizontal room and a reader who cannot see the chip was never
 * spending it.
 *
 * The same collapsed chip is the card view tile's availability-slot occupant
 * when the player owns no copies (R2 call 2), so `glyph` and `collapsedAria`
 * serve the tile too. Sold-out collapses to the same `$` and the same aria
 * without the price — accepted edge case; the chip must NOT restyle for it.
 */
export const buyTagCopy = {
  glyph: "$",
  full: (price: string) => `buy ${price}`,
  /** Both densities speak this. `price` omitted when the card is sold out. */
  collapsedAria: (price?: string) =>
    price ? `not owned — buy for ${price}` : "not owned — no price available",
  /** On the tile, where the slot's job is the floor rather than the shop. */
  tileSlotAria: "not owned",
} as const;

/**
 * #349 — the view toggle. Adopted from collection/filter-bar.tsx:270, which
 * ships `${v === "rows" ? "Rows" : "Grid"} view`. The words change because the
 * issue's own words are list and card; the geometry and the glyphs do not.
 *
 * aria-pressed carries the state, so these are names and not state sentences.
 */
export const deckViewCopy = {
  toggle: {
    listAria: "List view",
    cardAria: "Card view",
    // The glyphs are decorative and identical to /collection's.
    listGlyph: "≣",
    cardGlyph: "▦",
  },
} as const;

// The toggle's GEOMETRY and FILL are no longer /collection's shipped values:
// refresh R2 rules 44×44 phone / 32×32 desktop, and the active segment is bone
// on --elevated rather than --accent, on BOTH surfaces in one PR. Recorded here
// because a reader reaching for the shipped aria strings above is the reader
// most likely to also copy the shipped sizes. See README § Reconciled with
// refresh R2. The All/Shopping pills' active fill moves with it.

/**
 * #350 — the mana cost's textual alternative. Ruling 6 requires it; CostPips is
 * aria-hidden today.
 *
 * The mapper is here rather than in the component because it is words, and
 * because the pip cap must never reach the spoken form: a six-plus-symbol cost
 * draws four pips and a `+N` but SPEAKS every symbol. A reader who cannot see
 * the pips is the one reader for whom truncation is not a trade.
 */
export const manaCopy = {
  /** "{2}{W}{W}" → "mana cost 2 white white" */
  costAria: (spokenSymbols: string) => `mana cost ${spokenSymbols}`,
  /** A card with no cost — lands, and the back faces of some transforms. */
  costNone: "no mana cost",
  symbol: {
    W: "white",
    U: "blue",
    B: "black",
    R: "red",
    G: "green",
    C: "colourless",
    X: "X",
    /** Hybrid "U/B" → "blue or black"; two-brid "2/W" → "2 or white". */
    hybridJoiner: " or ",
    /** Phyrexian "G/P" → "green or 2 life". */
    phyrexian: "2 life",
  },
  /**
   * The overflow pip's DRAWN text only. It has no accessible name of its own —
   * costAria above already speaks the whole cost, and a spoken "+7" beside it
   * would count the symbols twice.
   */
  pipOverflow: (omitted: number) => `+${omitted}`,
} as const;

/**
 * #363 — the two-faced mark and the modal's flip control.
 *
 * `mark` is drawn text, aria-hidden; `markAria` is the sr-only sibling. The
 * flip control names the FACE IT TURNS TO, not the act: "Turn over" tells the
 * reader nothing they cannot see, and the other face's name is the fact they
 * are actually reaching for.
 */
export const twoFacedCopy = {
  mark: "//",
  markAria: "two-faced card",
  flipToAria: (otherFaceName: string) => `Turn over to ${otherFaceName}`,
  /** Announced on the swap, since the image change is silent by design. */
  flippedAria: (faceName: string) => `Showing ${faceName}`,
} as const;

// ─── REUSED, BY REFERENCE ────────────────────────────────────────────────────
//
// Nothing below is redefined here. Listed so the ledger is complete and so a
// second copy never gets written.
//
// #351 hover preview
//   No copy at all. The preview is aria-hidden and carries no caption — the
//   card image is the whole content (README call 5).
//
// The card view tile
//   remove ✕ ............... addPanelCopy.row.removeAria / removeCopyAria
//                            (lib/copy/decks-builder) — the row's own strings,
//                            unchanged, because it is the same act
//   quantity badge ......... grid-view.tsx draws `×${quantity}` inline; it is
//                            aria-hidden and the trigger's name carries the count
//   availability chip ...... availabilityCopy.marker.* (lib/copy/availability),
//                            count-only by density, unchanged — this is the
//                            slot's occupant when ownedCount > 0
//   unowned slot ........... buyTagCopy.glyph + tileSlotAria, ABOVE (R2 call 2).
//                            The one state where the tile's slot is not the
//                            marker's to fill, because the marker only speaks
//                            about copies you own
//   empty list ............. addPanelCopy.emptyList
//   no art ................. addPanelCopy.tile.noArt
//
// The decklist row
//   NO NEW VISIBLE COPY, and R2 REMOVES some: the cost is pips, and on the All
//   tab the buy tag collapses to buyTagCopy.glyph. The meta line's other run is
//   the shipped recommendationsCopy.shopping.rowFigure / rowNoFigure, and its
//   phone/desktop split is unchanged.
//
//   Scope note: the collapse is decklist-row.tsx under filter === "all" only.
//   update-diff-row.tsx keeps the full tag.
//
// The control bar
//   All / Shopping / By type / By role ... group-toggle.tsx, verbatim
//   "Group" .............................. DELETED (README call 2)
//
// The ownership dot's third state
//   card-rows · copy strings.ts (design_handoff_the99_card_rows) already ships
//   the three accessible names. Not duplicated here.
