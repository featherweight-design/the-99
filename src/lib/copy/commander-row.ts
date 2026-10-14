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
/** A run of the gap sentence: plain text, or a mechanic label to emphasise. */
export type GapPart = string | { label: string };

/**
 * The gap sentence as its runs, which is the ONE definition of it — the flat
 * string below is derived from this, never written twice.
 *
 * Three names is the NORMAL form, not the generous one: measured over all 3,279
 * indexed commanders, 93.1% have three or more eligible mechanic tags and only
 * 3.3% land on one or two.
 */
function unplayedParts(labels: string[]): GapPart[] {
  const [a, b, c] = labels;
  if (labels.length >= 3) {
    return [
      "None of your decks play ",
      { label: a! },
      ", ",
      { label: b! },
      " or ",
      { label: c! },
      ".",
    ];
  }
  if (labels.length === 2) {
    return ["None of your decks play ", { label: a! }, " or ", { label: b! }, "."];
  }
  return ["None of your decks play ", { label: a! }, "."];
}

/**
 * The commander's top themes, naming no deck of the reader's.
 *
 * Replaces *you already play every mechanic this commander leans on*, which was
 * both the majority voice of two lanes and unsupportable — see `gapSlotFor`'s
 * own note for the measurement and the cause. This sentence asserts nothing
 * about the reader, so nothing in it can be false.
 *
 * `capped` decides "top three" against a plain list. A commander with exactly
 * three themes has had nothing cut, and implying a cut that did not happen is a
 * small untruth of the same family as the sentence this replaces.
 */
function topStylesParts(labels: string[], capped: boolean): GapPart[] {
  const [a, b, c] = labels;
  const lead = capped
    ? "This commander’s top three play styles are "
    : "This commander’s play styles are ";
  if (labels.length >= 3) {
    return [lead, { label: a! }, ", ", { label: b! }, " and ", { label: c! }, "."];
  }
  if (labels.length === 2) return [lead, { label: a! }, " and ", { label: b! }, "."];
  // One theme is not a list, and "play styles are X" reads wrong for it. The
  // singular lead is spelled out rather than assembled, because a sentence
  // stitched from a plural template reads like one.
  return [
    capped ? "This commander’s top play style is " : "This commander’s play style is ",
    { label: a! },
    ".",
  ];
}

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
    unplayedParts: unplayedParts,

    /**
     * The same sentence as one string, DERIVED from the parts above rather than
     * spelled a second time.
     *
     * The canvas emphasises each mechanic name inside the sentence, so the row
     * needs the labels as separate nodes — and two templates, one for the
     * string and one for the nodes, are free to drift the moment either moves.
     * `check:copy-drift` reads the string form, and this keeps the string it
     * reads and the sentence the reader sees the same sentence by construction.
     */
    unplayed: (labels: string[]) =>
      unplayedParts(labels)
        .map((part) => (typeof part === "string" ? part : part.label))
        .join(""),

    /**
     * The commander's top themes. See `topStylesParts` above for the sentence
     * and `gapSlotFor` for the measurement that retired the claim this
     * replaced.
     *
     * The doc block that stood here described that retired sentence — that it
     * "names no mechanic, no deck", that "the claim is the OVERLAP", and that
     * it was "64% of the /commanders rows and 67% of /discover's". Every clause
     * is now either false or a stale figure: this sentence names three
     * mechanics, makes no claim, and the measurement it quoted was superseded
     * inside the same change by 77.0% / 67.2% against the reference account.
     */
    topStylesParts: topStylesParts,

    /**
     * The same sentence as one string, DERIVED from the parts — the reason is
     * `unplayed`'s: `check:copy-drift` reads the string form, and two templates
     * would be free to drift.
     */
    topStyles: (labels: string[], capped: boolean) =>
      topStylesParts(labels, capped)
        .map((part) => (typeof part === "string" ? part : part.label))
        .join(""),

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
