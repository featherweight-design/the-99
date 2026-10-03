/**
 * Per-deck localStorage key for which Consider shelves this reader has folded.
 *
 * `the99.consider.folded.{deckId}`, exactly as named in the handoff
 * (`STATES-consider-tiles.md` s5) — a dotted key, unlike `topOffDraftKey`'s
 * colons, because this is the handoff's own string rather than this
 * codebase's general convention.
 */
export function shelfFoldKey(deckId: string): string {
  return `the99.consider.folded.${deckId}`;
}

/**
 * The stored value is a bare array of folded shelf keys. Unknown entries
 * (a role that no longer renders a shelf) are never filtered out here —
 * nothing ever looks one up unless today's shelves still carry that key, so
 * a stale one just sits inert rather than needing a sweep.
 */
export function parseFoldedShelves(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((k): k is string => typeof k === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function encodeFoldedShelves(folded: ReadonlySet<string>): string {
  return JSON.stringify([...folded]);
}
