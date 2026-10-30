// Who may import the three guarded modules of `src/lib/person-name/` (PersonName plan, PR A). One table, read by
// `check:third-party-names` (the authority: it resolves every import, re-export and dynamic import) and by
// `eslint.config.mjs` (the same rule as an editor squiggle, by import string). Dependency-free so ESLint can load it.
// Tests (`*.test.*`) may import all three: fixtures mint names and assertions read them back.

/** Where a third-party name is minted (`named()`): the cross-user read layer, where the name leaves the database. */
export const MINT = "src/lib/person-name/mint.ts";
/** Where a name becomes a string again (`reveal()`). */
export const REVEAL = "src/lib/person-name/reveal.ts";
/** Tests' helper (`plain()`), which reveals. */
export const TESTING = "src/lib/person-name/testing.ts";

/**
 * The files that may reveal: the drawing components (which mark what they draw), tests' helper, and the two
 * server-only paths a name leaves the page by (push text, feed writes; plan PR D, the first to use them).
 */
export const REVEAL_ALLOW = [
  "src/lib/person-name/person-name.tsx",
  TESTING,
  "src/lib/push/to-push-item.ts",
  "src/lib/social/feed-write.ts",
];

export const isTestPath = (path) => /\.test\.(?:t|j)sx?$|\.test\.mts$/.test(path);

/** May `path` (repository-relative, `/`-separated) import `target`? */
export function mayImport(path, target) {
  if (isTestPath(path)) return true;
  if (target === MINT) return path.startsWith("src/lib/social/") || path.startsWith("src/lib/person-name/");
  if (target === REVEAL) return REVEAL_ALLOW.includes(path);
  if (target === TESTING) return false;
  return true;
}
