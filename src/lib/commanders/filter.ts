/**
 * How a colour selection is matched against a commander's identity.
 *
 * `contains` is the shipped behaviour and stays the default: keep commanders
 * whose identity contains ALL the selected colours (selected ⊆ colorIdentity).
 * `exactly` keeps only the commanders whose identity is the selection and
 * nothing besides.
 *
 * Two modes, never three: an "any of" mode would make a wider selection return
 * MORE rows, which is the opposite of what lighting another pip looks like it
 * does.
 */
export type JoinMode = "contains" | "exactly";

/**
 * Filters by colour identity under one of the two match modes.
 *
 * An empty selection returns all results unchanged under BOTH modes. Under
 * `exactly` the literal reading would be "keep the colourless", which is a
 * filter the player never asked for: with no pip lit there is no selection to
 * be exact about, and the mode control is not even rendered.
 *
 * Never re-sorts.
 */
export function filterByColors<T extends { colorIdentity: string[] }>(
  results: T[],
  selected: string[],
  mode: JoinMode = "contains",
): T[] {
  if (selected.length === 0) return results;
  return results.filter((r) => matchesColors(r.colorIdentity, selected, mode));
}

/**
 * The rule itself, for one identity: the lanes filter a list through `filterByColors`, and
 * `/collection` tests a card inside a predicate that also checks every other filter, so both
 * read this rather than each keeping a copy. An empty selection matches everything, under
 * both modes, for the reason `filterByColors` gives.
 */
export function matchesColors(identity: readonly string[], selected: readonly string[], mode: JoinMode): boolean {
  if (selected.length === 0) return true;
  if (mode === "exactly" && identity.length !== selected.length) return false;
  return selected.every((c) => identity.includes(c));
}
