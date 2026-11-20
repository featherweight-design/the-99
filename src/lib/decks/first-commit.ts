/**
 * Whether a deck can take its first commit (`Commit as v1`) now: it has no version, its list is exactly its body size, and no line
 * is unresolved. One test for the spine's offer (`builder-shell.tsx`, which also asks its optimistic count) and for the ⋯ menu's
 * why-it-is-hidden block (`deck-card-overflow.tsx`), so the two can never offer a commit the other refuses. The server applies the
 * same test inside `commitDeckVersion`.
 */
export function firstCommitReady(d: { versionNumber: number | null; built: number; bodySize: number; unresolved: number }): boolean {
  return d.versionNumber === null && d.built === d.bodySize && d.unresolved === 0;
}
