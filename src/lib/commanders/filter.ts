/**
 * Inclusion semantics: keep commanders whose colorIdentity contains ALL
 * selected colors (i.e. selected ⊆ colorIdentity).
 * An empty selection returns all results unchanged.
 * Never re-sorts.
 */
export function filterByColors<T extends { colorIdentity: string[] }>(
  results: T[],
  selected: string[],
): T[] {
  if (selected.length === 0) return results;
  return results.filter((r) =>
    selected.every((c) => r.colorIdentity.includes(c)),
  );
}
