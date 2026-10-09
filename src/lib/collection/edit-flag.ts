/**
 * Whether this deployment writes the collection through the ledger (collection foundation,
 * plan `2026-10-09-collection-write-path.md`). Off, every collection write behaves exactly as
 * it did before the ledger existed and writes no history.
 *
 * The same shape as the other release switches: server-side, read per request, and OFF for
 * anything but the exact string `'true'`. Changing it on Vercel needs a redeploy.
 */
export function collectionEditEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.COLLECTION_EDIT_ENABLED === "true";
}
