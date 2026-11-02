import { createHash } from "node:crypto";

/**
 * The cache-key segment that names a reader's hidden set: For you's and Discover's entries are filed
 * under it (`commanderRankingsKey`, `discoveryKey`), and the loader is handed the same ids, so a payload
 * is only ever filed under the set it was built from.
 *
 * That is what closes the Hide/Undo race (hide follow-up D1). `updateTag` expires entries dated before
 * it, and the data cache dates an entry when it is WRITTEN: a build that read the old set and finished
 * after the write's `updateTag` used to be filed as fresh and served with the row missing. Keyed on the
 * set, that late entry sits under the OLD set's key, which no request after the write asks for.
 *
 * Order-free (sorted first) so the same set is the same key, and short: a 12-hex digest, never the ids.
 */
export function hiddenSetKey(hiddenIds: readonly string[]): string {
  if (hiddenIds.length === 0) return "hidden:none";
  const digest = createHash("sha256").update([...hiddenIds].sort().join(",")).digest("hex");
  return `hidden:${digest.slice(0, 12)}`;
}
