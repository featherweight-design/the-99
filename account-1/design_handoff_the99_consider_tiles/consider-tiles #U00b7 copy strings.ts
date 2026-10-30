// Consider tiles and tab (H30) — proposed strings for /copy-review. Copy is not settled here.
// One new drawn string. Everything else on the tile and the shelf header is shipped copy, moved.

export const considerTilesCopy = {
  tile: {
    /**
     * The secondary line on a tile that completes a combo, in the type line's place.
     * The lemniscate now sits on the meta line (§C2), so this line carries the partner alone.
     * Drawn aria-hidden; the tile keeps ComboClause's sr-only
     * `comboAwarenessCopy.a11y.completes(partner)` as the spoken form.
     */
    comboPartner: (partner: string) => `+ ${partner}`,
  },
} as const;

// REUSED, unchanged:
//   addPanelCopy.tile.lift(pts)            "+31 pts vs. all decks"  (ink changes, words do not)
//   synergySignedDisplay(n)                "−8 pts"
//   synergyCopy.shelf.noSynergy
//   addPanelCopy.shelf.labels.*, .coverage, .count, .noTarget
//   addPanelCopy.unowned.shelfCoverage     "not in your collection"
//   synergyCopy.shelf.label / .meta
//   addPanelCopy.consider.showAll(n)       "Show all N"  (+ " →")
//   addPanelCopy.consider.collapse         "Show fewer"
//   addPanelCopy.consider.showAllAria(role, n)
//   addPanelCopy.tile.add / addUnowned / inDeck / inDeckAria
//   availabilityCopy.marker.tileInUse / tileOver
//   BuyTag's figure and its collapsed "$"
//
// RETIRED from the tile: addPanelCopy.tile.detailHint ("details ↗"); the "buy" word in the tile slot.
//
// NO NEW STRING for the fold. The header button's accessible name is its own text
// (label + count clause), and aria-expanded carries open/closed. No announcement on fold.
