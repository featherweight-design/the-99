// card-rows · copy strings
//
// Card line item parity (R1). This handoff is a consistency ruling on six rows
// that already ship, so it is almost entirely a *reuse* manifest: every label a
// card row draws today stays exactly as it is, in the module that owns it.
//
// Three strings are new, and all three are accessible names for the ownership
// dot's third state. Nothing new is drawn as visible text on any row.
//
// Reused by reference — DO NOT redefine:
//   src/lib/copy/availability.ts        marker.soft / .hard / .hardIn / .hardMulti /
//                                       .over / .overWithDemand / .overAlsoIn and the
//                                       four *Aria forms. Count-only on five of six rows.
//   src/lib/copy/recommendations.ts     shopping.rowSecondCopyTag / …Aria, rowFigure,
//                                       rowNoFigure and their desktop forms.
//   src/lib/copy/decks-builder.ts       addPanelCopy.row.quantity / .remove / .removeAria /
//                                       .removeCopyAria, undo.*
//   src/lib/copy/deck-import.ts         unresolved.rowAria / .rowTag / .rowFix,
//                                       resolve.rawLineNumber, update.diff.*
//   src/lib/copy/synergy-discovery.ts   figure.ariaOwned / .ariaUnowned / .rowAria
//   src/lib/copy/commander-explained.ts committed.ariaSuffix
//
// The `buy` word on the diff row is NOT a new string: that row's hand-rolled pill
// retires in favour of the shipped BuyTag, which brings its own word and its own
// accessible name with it.

export const cardRowCopy = {
  /**
   * The shared ownership dot's accessible names. `owned` and `unowned` are the
   * strings the decklist row passes inline today, lifted into the copy module so
   * the third state cannot be introduced somewhere else with different wording.
   *
   * Sentence case, no terminal period: these are names, not prose, and they are
   * read immediately before or after the card name.
   */
  dot: {
    owned: "Owned",
    unowned: "Not owned",

    // NEW. The third state. "Owned" would be true and useless here — the whole
    // point of the state is that the copy exists and is not available — and
    // "Committed" alone names a status without saying to what.
    committed: "Owned, already in a deck",
  },

  /**
   * The commander panels' legend, which moves into the dot's module with
   * LegendPip so the swatch and its sentence cannot drift again.
   *
   * These render beside a rendered dot rather than naming its colour: every
   * theme redefines --avail-hard-fg, so "amber" was true of one of six.
   */
  legend: {
    free: "free to sleeve",
    committed: "already in a finished deck",
    unowned: "not in your collection",
  },
} as const;

// ── What each row draws, as a reuse map ─────────────────────────────────────
//
// rows-view.tsx        availabilityCopy.collection.rowAria(name, type, qty, set,
//                        markerAria(a, { nameless: true }))
//                      marker: count-only, 8.5px mono, inline after the name
//
// decklist-row.tsx     addPanelCopy.row.quantity / .removeAria / .removeCopyAria
//                      marker: spoken + nameless, 11/11.5px mono
//                      BuyTag word, or recommendationsCopy.shopping.rowSecondCopyTag
//                      cardRowCopy.dot.owned | .unowned | .committed
//
// card-search-row.tsx  ownership phrase composed by the caller (×N owned / not owned)
//                      marker: name-bearing on desktop, count-only on phone
//                      no dot — the phrase is the ownership statement
//
// unresolved-row.tsx   deckImportCopy.unresolved.rowAria / .rowTag / .rowFix
//                      resolve.rawLineNumber
//                      sr-only "unmatched line"
//                      NO availability copy — the row has no oracle id
//
// update-diff-row.tsx  deckImportCopy.update.diff.keep / .kept / .keptMobile /
//                        .keepAria / .sourceLine
//                      marker: count-only (no deck vantage on this surface)
//                      BuyTag, replacing the hand-rolled pill
//                      cardRowCopy.dot.*
//
// synergy-row.tsx      synergyCopy.figure.rowAria + explainedCopy.committed.ariaSuffix
//                      synergyCopy.select.addAria / .removeAria
//                      cardRowCopy.dot.* and cardRowCopy.legend.*
//                      marker copy arrives with slice B — no new string then either
