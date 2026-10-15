/**
 * Whether this deployment writes the collection through the ledger (collection foundation,
 * plan `2026-10-09-collection-write-path.md`). The upload and revert actions read it as they
 * arrive (that plan's PRs 2 and 3); this PR adds the switch and the write path, and nothing reads
 * it yet. Off, a collection write behaves exactly as it did before the ledger existed and writes
 * no history.
 *
 * The same shape as the other release switches: server-side, read per request, and OFF for
 * anything but the exact string `'true'`. Changing it on Vercel needs a redeploy.
 */
export function collectionEditEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.COLLECTION_EDIT_ENABLED === "true";
}

/**
 * Whether an upload can be confirmed as a SYNC (plan `2026-10-15-collection-sync.md`): the third way
 * an upload meets the collection, beside Replace and Add. On only when `COLLECTION_SYNC_ENABLED` AND
 * `COLLECTION_EDIT_ENABLED` are both `'true'`, because a Sync writes through the ledger and nowhere
 * else. Off, the upload actions refuse `mode: "sync"` and nothing draws it.
 */
export function collectionSyncEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.COLLECTION_SYNC_ENABLED === "true" && collectionEditEnabled(env);
}
