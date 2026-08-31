/**
 * Global rank over the full candidate set, in the given order. Built BEFORE any
 * colour filter, which is what keeps the shipped `filtering never renumbers`
 * invariant true in both ranking modes — a filter hides rows and leaves a gap in
 * the numerals rather than closing it.
 *
 * Two of these exist per page, one per `Score against` mode. Which is in play
 * follows `?avail=`. The numeral therefore DOES change when the toggle moves,
 * and that is deliberate: the shipped invariant is about filtering, which
 * changes no score, while `Score against` changes the score itself. Frozen
 * numerals would render `3, 4, 1, 2` down a page whose own order contradicts
 * them.
 *
 * Keyed on slug rather than oracleId because slug is what the rendered list
 * iterates, and `rankFree` carries each commander's canonical slug through
 * unchanged for exactly this reason.
 */
export function rankMap(items: { slug: string }[]): Map<string, number> {
  return new Map(items.map((r, i) => [r.slug, i + 1]));
}
