/**
 * Whether this deployment caches Home and `/decks` per reader on the data stamp (Performance
 * PR 6, `page-cache.ts`). Hugh's release ruling applies: on in staging, off in production until
 * he has watched it there.
 *
 * Off means OFF, not "cache less": `cachePageForUser` reads no stamp, stores nothing and runs the
 * load exactly as the pages did before the cache existed. That is what makes it the first move
 * when a cached page looks stale, before any trigger is touched (see the runbook in AGENTS.md).
 *
 * The same shape as the other release switches: server-side, read per request, and OFF for
 * anything but the exact string `'true'`. Changing it on Vercel needs a redeploy.
 */
export function listCacheEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.LIST_CACHE_ENABLED === "true";
}
