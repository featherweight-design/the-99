/**
 * The commander row's own copy — the gap line and the foot separator, and
 * nothing else.
 *
 * ONE NEW BLOCK, deliberately. The row draws two sentences and three figures,
 * and two of the three figures are other files' words: the Fit denominator is
 * `commandersCopy.row.*`, the deck count is `discoverCopy.row.popularity`, the
 * price is `discoveryCopy.price.*`, and the sentence is a database column. They
 * are imported rather than retyped, because a second copy of a shipped string is
 * free to drift from the surface that already prints it.
 */
export const commanderRowCopy = {
  /**
   * The gap line. TEMPLATED, never generated: per-player generation was priced
   * at ~3,300 model calls per collection change and rejected in the spec.
   *
   * Three forms for the names and one for their absence. The slot is never
   * empty — a row whose gap line vanished would change height between two
   * sorts, which is the ruling the always-on line exists to keep (handoff D2,
   * D9).
   */
  gap: {
    /**
     * Up to three mechanic labels, creature types already removed by the
     * classifier.
     *
     * Three names is the NORMAL form, not the generous one: measured over all
     * 3,279 indexed commanders, 93.1% have three or more eligible mechanic tags
     * and only 3.3% land on one or two. The handoff's amber B worried about the
     * opposite case.
     */
    unplayed: (labels: string[]) => {
      const [a, b, c] = labels;
      if (labels.length >= 3) return `None of your decks play ${a}, ${b} or ${c}.`;
      if (labels.length === 2) return `None of your decks play ${a} or ${b}.`;
      return `None of your decks play ${a}.`;
    },

    /**
     * Every mechanic tag on this commander is already played somewhere in the
     * reader's decks. The claim is the OVERLAP, because the gap is empty and an
     * empty clause is forbidden.
     *
     * It names no mechanic, no deck and no collection fact beyond play / do not
     * play, so it reads identically on `/discover` and `/commanders` — which one
     * shared row component requires (handoff D1).
     *
     * NOT CONGRATULATORY, and measurement has made that ruling load-bearing
     * rather than precautionary: under `Something new` this same fact is why the
     * row ranks last, and on a reader with 18 built decks it is 64% of the
     * `/commanders` rows and 67% of `/discover`'s. A celebratory treatment would
     * be the majority voice of both lanes.
     */
    allPlayed: "You already play every mechanic this commander leans on.",

    /**
     * NOT A STRING, recorded so the absence is deliberate: a commander with no
     * MECHANIC tags — including one whose every tag is a creature type — draws
     * `discoveryCopy.untagged` in this slot and never `allPlayed`, which would
     * assert something about a commander with nothing on file. The classifier's
     * output decides, not `tags.length`.
     */
    noMechanicTags: null,
  },

  /** The foot line's separator. Punctuation, so it is `aria-hidden` where it is
      drawn. */
  figures: {
    separator: "·",
  },
} as const;
