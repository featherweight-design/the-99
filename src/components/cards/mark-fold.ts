/**
 * Where a tier of a row's marks really starts folding, given how many marks the row has: a tier that would fold exactly ONE
 * mark folds none, so the reader sees that mark rather than a `+1` standing in for it (Hugh, 2026-10-27). A `+N` therefore
 * always counts two or more. The deck row (`decklist-row.tsx`) and the Upgrade result's swap rows (`result-view.tsx`) fold by it.
 */
export function foldsFrom(count: number, from: number): number {
  return count - from === 1 ? count : from;
}
