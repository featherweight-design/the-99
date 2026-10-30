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
  // The shared filter panel: its copy functions take a string name, so it reads a friend's label to hand them one and
  // marks every element that carries it (PR C, the cart's Friend filter).
  "src/components/ui/filter-panel.tsx",
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

/**
 * The cross-user read layer (PR G). A select under `src/lib/social/` that PROJECTS `socialProfiles.displayName`,
 * `pods.name` or a friend's `decks.name` hands a raw string to whatever follows, so the top-level function holding that
 * projection must also call a mint (below), or be listed in `RAW_ROW_READS` with the reason the string stays plain.
 */
export const SOCIAL_DIR = "src/lib/social/";
/** The columns that hold another reader's name, as `table.column`. */
export const NAME_COLUMNS = ["socialProfiles.displayName", "pods.name", "decks.name"];
/** The calls that mint (or are a thin wrapper over `named()`). */
export const MINT_HELPERS = ["named", "savedName", "feedFriend"];
/** `path#function` of a projection that returns a raw row on purpose; the row is minted by its caller in the same file. */
export const RAW_ROW_READS = [
  // The viewer's OWN name, drawn plain (the reader's own name is not another reader's).
  "src/lib/social/friends.ts#ensureProfile",
  "src/lib/social/home-friends.ts#loadHomeFriends",
  // A game's save resolves a friend seat and writes the name into the game's snapshot columns; the name is branded
  // on the way out (`savedName`, opponent-names.ts), never on the way in.
  "src/lib/social/games.ts#friendshipsIn",
  "src/lib/social/games.ts#friendDecksIn",
];
