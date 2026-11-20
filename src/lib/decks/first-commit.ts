/**
 * Whether a deck can take its first commit (`Commit as v1`) now: it has no version, its list is exactly its body size, and no line
 * is unresolved. One test for the spine's offer (`builder-shell.tsx`, which also asks its optimistic count) and for the ⋯ menu's
 * why-it-is-hidden block (`deck-card-overflow.tsx`), each fed its own surface's counts: the tile's are the list payload's, the
 * header's the spine's optimistic ones, so a deck edited a moment ago can differ between them for a beat. The server applies the same
 * test inside `commitDeckVersion` and `/changes?commit=1` redirects a commit it would refuse, so a stale offer is a no-op, not a write.
 */
export function firstCommitReady(d: { versionNumber: number | null; built: number; bodySize: number; unresolved: number }): boolean {
  return d.versionNumber === null && d.built === d.bodySize && d.unresolved === 0;
}
