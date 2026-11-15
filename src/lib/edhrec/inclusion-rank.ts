/**
 * EDHREC inclusion as a ranking. One lookup and one sort, shared by every reader that ranks
 * EDHREC's names: the commander page lists its cards as New Cards, High Synergy, Top Cards,
 * then by type, so LIST order is not a ranking. A reader that keeps list order leads with
 * whatever EDHREC added this week (Windgrace's Top picks led with a 5.6% new card ahead of
 * The Gitrog Monster at 78%).
 */

/** A card's inclusion figure, keyed the way `inclusionByName` is: lowercased, falling back to
    the front face of a "Front // Back" name, since EDHREC keys double-faced cards by front face.
    A non-finite figure is no figure. */
export function inclusionLookup(
  inclusionByName: Readonly<Record<string, number | undefined>>,
): (name: string) => number | null {
  return (name) => {
    const lower = name.toLowerCase();
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    return raw != null && Number.isFinite(raw) ? raw : null;
  };
}

/** EDHREC's card names ranked by inclusion, highest first; an unlisted figure last, list order kept on a tie. */
export function byInclusion(names: readonly string[], inclusionOf: (name: string) => number | null): string[] {
  return names
    .map((name, index) => ({ name, index, pct: inclusionOf(name) ?? -1 }))
    .sort((a, b) => b.pct - a.pct || a.index - b.index)
    .map((r) => r.name);
}
