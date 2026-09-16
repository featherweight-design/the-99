// The 99 — the commander row, R1.
// design/design_handoff_the99_commander_row/
// spec: docs/superpowers/specs/2026-09-15-commander-row-play-style-design.md (PR #664)
//
// ONE new block. Everything else on the row is a string that already ships, listed in the reuse
// manifest below and imported rather than retyped — the row draws two sentences and three figures,
// and two of the three figures are other files' words.

export const commanderRowCopy = {
  /**
   * The gap line. Templated, never generated: per-player generation was priced at ~3,300 model
   * calls per collection change and rejected in the spec.
   *
   * Three forms for the names and ONE for their absence. The slot is never empty — a row whose gap
   * line vanished would change height between two sorts, which is the ruling the always-on line
   * exists to keep.
   */
  gap: {
    /** Up to three mechanic labels, creature types already removed by the classifier. */
    unplayed: (labels: string[]) => {
      const [a, b, c] = labels;
      if (labels.length >= 3) return `None of your decks play ${a}, ${b} or ${c}.`;
      if (labels.length === 2) return `None of your decks play ${a} or ${b}.`;
      return `None of your decks play ${a}.`;
    },

    /**
     * `Nothing new` — every mechanic tag on this commander is already played somewhere in the
     * reader's decks. The claim is the OVERLAP, because the gap is empty and an empty clause is
     * forbidden.
     *
     * It names no mechanic (`unplayedLabels` is empty here, so there is nothing to name), no deck
     * and no collection fact beyond play / do not play — so it reads identically on /discover and
     * /commanders, which one shared row component requires. It is not congratulatory: under
     * `Something new` this same fact is why the row ranks last.
     */
    allPlayed: "You already play every mechanic this commander leans on.",

    /**
     * NOT A STRING, recorded here so the absence is deliberate: a commander with no MECHANIC tags
     * — including one whose every tag is a creature type — draws `discoveryCopy.untagged` in this
     * slot and never `allPlayed`, which would assert something about a commander with nothing on
     * file. The classifier's output decides, not `tags.length`.
     */
    noMechanicTags: null,
  },

  /** The foot line's separator. Punctuation, so it is aria-hidden where it is drawn. */
  figures: {
    separator: "·",
  },
} as const;

/**
 * REUSE MANIFEST — imported, not retyped. Where this handoff and one of these files disagree, the
 * file wins.
 *
 *   commandersCopy.row.fitDenominator            "/100 FIT"                     src/lib/copy/lanes.ts
 *   commandersCopy.row.fitDenominatorMeasurable  "/40 MEASURABLE FIT"           src/lib/copy/lanes.ts
 *   discoverCopy.row.popularity                  "24,012 decks tracked"         src/lib/copy/lanes.ts
 *   discoveryCopy.untagged.heading / .body       the No tag data note           src/lib/copy/commander-discovery.ts
 *   discoveryCopy.price.*                        figure, source, aria, absent   src/lib/copy/commander-discovery.ts
 *   explainedCopy.score.scoreAria                the row link's reading         src/lib/copy/commander-explained.ts
 *   explainedCopy.home.cardAria                  the row link's wrapper         src/lib/copy/commander-explained.ts
 *   commander_support.prose                      the stored sentence            the database
 *
 * RETIRED — deleted with the composition. `check:copy-drift` fails on every property table quoting
 * one of these, and correcting those tables is in scope for the same PR.
 *
 *   discoverCopy.row.notOwned                    "not in your collection"
 *   discoverCopy.row.novelty                     "{n} of its top cards new to you"
 *   discoverCopy.row.supportOwned                the count chip's figure + unit
 *   discoveryCopy.justify.tagList
 *   discoveryCopy.justify.distanceNear / .distanceNone / .distanceLabel / .distanceAria
 *   discoveryCopy.justify.sharedList
 *   discoveryCopy.justify.floorNote / .floorNoteShort
 *   discoveryCopy.justify.overlap
 *   planeCopy.overflow.more / .fewer / .moreAria / .fewerAria   (on this row only — the plane keeps them)
 *   commandersCopy.row.action                    already retired; its comment goes with the row
 *
 * NOT TOUCHED, and named so nobody goes looking: every filter, order, result, empty and emptyFree
 * string in lanes.ts; availabilityCopy.receipt.* (the owned lane's delta, which leaves with the
 * receipt line but is still the availability feature's string, not this one's).
 */
