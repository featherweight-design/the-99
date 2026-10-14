/**
 * `To build` — the seventh deck status. R5.
 *
 * ## This file supersedes `deck-statuses-pending · copy strings.ts` in full.
 *
 * That file described TWO MARKS — a hollow plate for a deck with no committed
 * version, and a 2px `--fg` left rule for a committed deck whose draft had
 * moved. Both shipped on 2026-09-18 and both are retired: they were the only
 * wordless signals in the deck list, and the plate measured ~39 near-neutral
 * units against `Building` — the commonest WIP deck, and so the least legible
 * case the feature had.
 *
 * What replaces them is not a mark. It is a WORD, in the pill, beside the other
 * six — so unlike everything R1–R4 drew, this file adds almost no strings at
 * all. That is the point of the round.
 *
 * ## What actually changes in copy
 *
 * ONE new status label, in `refreshCopy.status`, where the other six already
 * live. It is not a separate vocabulary and must not be given one:
 *
 *     status: {
 *       draft: 'Draft',
 *       building: 'Building',
 *       over: 'Over',
 *       unresolved: 'Unresolved',
 *       toBuy: 'To buy',
 *   +   toBuild: 'To build',
 *       complete: 'Complete',
 *     }
 *
 * Title case with a lower-case verb, exactly as `To buy` is written — the two
 * are a pair and any divergence in their casing is a bug.
 *
 * The key sits between `toBuy` and `complete`, in cascade order, because this
 * object is read top-to-bottom by anybody learning the vocabulary and the order
 * IS the meaning (see `statusPill()`'s header).
 *
 * ## Why there is no `detailToBuild`
 *
 * The tile's detail row prints `all owned`, which `refreshCopy.decks` does not
 * yet have as a string but `STATES-deck-statuses.md` already names as one of
 * the four detail figures. It is the figure that answers "why is this not
 * `To buy`", which is the question a reader has beside this word. If it is
 * missing from the copy file, add it to `decks` as `detailAllOwned: 'all owned'`
 * — NOT to a new namespace for this value.
 *
 * ## Why there is no aria suffix
 *
 * `cardAria` already announces the status word in position three. A seventh
 * value needs nothing: it IS the status. Every `markAria` and `cardAriaSuffix`
 * in the superseded file exists only because a mark had no word, and each one
 * can be deleted with the mark it named.
 */

/** The filter column. Both changes are LABELS; no param moves. */
export const deckStatusFacetCopy = {
  /**
   * Seven rows now, `To build` between `To buy` and `Complete`. The header's
   * count follows: `7 of 7`. It must always equal the number of rows rendered —
   * `refreshCopy.filters` owns the heading, and this is a note, not a new home
   * for it.
   */
  statusRowCount: 7,

  /**
   * The `Deck state` facet keeps both rows and both are relabelled. The params
   * are UNCHANGED — `?state=uncommitted,pending` — so every saved link works.
   */
  state: {
    heading: "Deck state",
    /**
     * Was `Not committed yet`. Renamed because `To build` is now a status of
     * nearly those words, and two controls that read the same but select
     * different sets is the worst outcome available.
     *
     * This row is BROADER than the status: it catches a never-committed deck at
     * any count, where `To build` catches only the full, owned ones.
     */
    noVersion: "No version yet",
    /**
     * Was `Has pending changes`. States the fact rather than naming a mark that
     * no longer exists.
     */
    editedSince: "Edited since last version",
  },
} as const;

/**
 * Unchanged, and listed so nobody re-derives them:
 *
 *   • `deckVersioningCopy.pending.since(changes, version)` — the detail row's
 *     `1 change since v1`. Ruling 4 confirms this fact gets NO mark; the words
 *     were always the whole treatment.
 *   • The deck page banner, the commit sheet, the `Commit as v1` offer.
 *   • `refreshCopy.decks.cardAria` / `cardAriaNoDetail`, both signatures.
 *   • `?status=`, `?state=`, `activeFilterCount`.
 */
