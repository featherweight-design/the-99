// card-detail · copy strings — price, zoom, flip (R1)
// design/design_handoff_the99_card_detail/  →  src/lib/copy/cards.ts
//
// ── the headline: NO PRICE STRING IS ADDED ────────────────────────────────────
//
// Price copy is ratified and lives with the buy tag. This handoff renders the
// same three forms and the same silence:
//
//   priced      the bare figure                 e.g. "$2.41"
//   foil-only   cell.foilPrice(price)           "◆ foil $6.10"
//   no stock    cell.noStock                    "no stock"   ← sold out AND never stocked
//   absent      — nothing renders —                           ← nothing reached us
//
// The line between the last two is WHO WAS SILENT, not what the answer was.
// `no stock` is the store answering no; silence is no answer arriving. That is
// why set-cell.tsx always has a word to print (a card in a set it is showing
// always has a store answer) and why the buy tag's ratified silence is the
// no-answer case. Both ancestors are right; neither is overridden.
//
// ...from `set-collections · copy strings.ts`. Do not fork them into cards.ts;
// import them. Three reasons, in order of how badly each would bite:
//
//   1. Silence is a STATE, not a missing string. A key for it is how "—" and
//      "$0.00" get written six months from now by someone filling a blank.
//   2. The same figure appears on the set grid, the deck-side tag and here. One
//      definition, or they drift.
//   3. "no stock" carries two facts (sold out / never stocked) by ruling, and
//      distinguishes them in the accessible name only — exactly as set-cell
//      does. A second copy of the string is where the second visible word gets
//      added quietly.
//
// The accessible forms are also already ratified: `cell.foilPriceAria`,
// `cell.noStockAria`. Reuse them in the card's description, below.

export const cardZoomCopy = {
  /**
   * The art becomes a button. Shared accessible name — the commander's bespoke
   * one was already deleted in full-card R1, and this must not reintroduce the
   * pattern.
   */
  zoomAria: (name: string) => `Look at ${name} up close`,

  /** The layer's own label. It is a region inside the dialog, NOT a dialog. */
  layerAria: (name: string) => `${name}, shown large`,

  /**
   * The one caption line under the zoomed card. Set · code · collector number,
   * so you know which printing you are holding.
   *
   * `num` may be '' on a bare Name,Qty import — omit the field AND its
   * separator, per the printing picker's ruling. Never print "no number".
   */
  printing: (setName: string, code: string, num: string) =>
    num ? `${setName} · ${code} ${num}` : `${setName} · ${code}`,

  /** Appended to the caption on the reverse face. Not a new line. */
  backSuffix: " · back",

  /**
   * The close control. The modal's shipped ✕ in its shipped slot — its LABEL
   * changes while the zoom is open, its position does not. Two labels rather
   * than one, because "Close card details" while a zoom is up is a lie about
   * what the press will do.
   */
  close: "Close the large view",

  /**
   * The quiet hint under the desktop art — --fg-locked, desktop only; phone has
   * the ⤢ and a thumb.
   *
   * NOT rendered in the compact art header (card-modal.tsx:344): the ⤢ is
   * withheld there and so is this. The gesture survives without either — the
   * thumb's focus ring is the affordance.
   *
   * REJECTED: "Tap to zoom" (zoom is a verb about a viewer, and this is not
   * one) and "View full card" (the exact phrase full-card R1 retired for lying
   * about its destination; it must not come back pointing somewhere else).
   */
  hint: "tap the art to hold it",
} as const;

export const cardFlipCopy = {
  /**
   * Two ACCESSIBLE NAMES, one control — the shipped corner plate is glyph-only
   * and stays glyph-only inside the zoom, so these are aria-labels, not visible
   * text. Renders ONLY when the `layout` column says two faces — never from a
   * "//" in the name or type line. A split or adventure card carries the
   * separator and has no back.
   */
  toBack: "Turn it over",
  toFront: "Turn it back",

  /**
   * Announced by the modal's existing live region on settle — not on press, so
   * a reader is told what happened rather than what was asked for. ONE live
   * region in this modal; do not add a second.
   */
  announce: (faceName: string) => `Now showing ${faceName}`,

  /** The glyph is aria-hidden; the label is the accessible name. */
  glyph: "↻",
} as const;

// ── what is NOT here, and must not be added ───────────────────────────────────
//
//   · Any price string, in any state, including the empty one.
//   · A "prices from ManaPool" provenance line. That belongs to the strip, which
//     is a surface about a list. A single card's tag makes no claim about a run.
//   · A stale-price clause. Same reason: one figure, no run to be behind.
//   · "Tap anywhere to close." Deleted with the lightbox in full-card R1; the
//     gesture survives, the sentence does not.
//   · A label on the price tag ("Price", "Market"). The figure is self-evident,
//     and a label would make it a meta field — which §1 rejected.
