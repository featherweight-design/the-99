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

/**
 * Whether a player can start without a collection (plan `2026-10-15-no-collection-entry.md`): the
 * import's `I own these cards` add, and the surfaces the line's later PRs draw. On only when
 * `NO_COLLECTION_ENTRY_ENABLED` AND `COLLECTION_EDIT_ENABLED` are both `'true'`, because every write
 * it makes goes through the ledger. Off, the import is exactly as shipped and ignores `own`.
 */
export function noCollectionEntryEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NO_COLLECTION_ENTRY_ENABLED === "true" && collectionEditEnabled(env);
}
