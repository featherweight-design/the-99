/**
 * The server-side cache behind the four list routes.
 *
 * Measured against the largest collection in the database, `/discover` spent
 * 1.1–1.6s, `/commanders` 1.2s and `/collection` 0.6s assembling their payload,
 * and paid it again on every visit — the browser's own timings put TTFB at 6ms,
 * so the wait is compute, not transport. None of that work depends on anything
 * but the reader's own rows, so it is cached here rather than recomputed.
 *
 * Not `experimental.staleTimes`, and not the client: this is the one lever that
 * also helps a first visit, which no client cache can reach. See the caching
 * section in AGENTS.md for the client-side rule this sits underneath.
 *
 * Every entry carries one tag, `user-lists:<userId>`, and every write path that
 * revalidates a list surface clears it — see `revalidateUserLists`. The hour
 * ceiling is a backstop, not the invalidation story: a write whose tag call was
 * missed self-heals within the hour instead of persisting until the next deploy.
 */

import { unstable_cache, updateTag } from "next/cache";

const CEILING_SECONDS = 60 * 60;

function tagFor(userId: string): string {
  return `user-lists:${userId}`;
}

/**
 * Caches one reader's list payload under `key`.
 *
 * `key` must name every input the loader reads apart from `userId` — a sort
 * order, a mode. `unstable_cache` cannot see a closure's variables, so an input
 * left out of the key is an input two different answers get filed under.
 *
 * The result is stored as JSON, so the loader must return plain data: a `Map`
 * comes back as `{}` and a `Date` as a string. Hand back entries rather than a
 * map, and format dates at the edge that renders them.
 *
 * That JSON must also come in under 2 MB, which is the data cache's per-entry
 * ceiling. An entry over it is refused with a warning and never stored, so the
 * loader runs on every request AND pays to serialise its result first — slower
 * than not caching at all. `/discover` (3.1 MB) and `/collection` (2.4 MB) are
 * both over it today and are deliberately left uncached; `/commanders` fits
 * because its second ranking ships as a delta rather than a second list.
 */
export function cacheForUser<T>(
  userId: string,
  key: string[],
  load: () => Promise<T>,
): Promise<T> {
  return unstable_cache(load, ["user-lists", userId, ...key], {
    tags: [tagFor(userId)],
    revalidate: CEILING_SECONDS,
  })();
}

/**
 * Drops every cached list payload for one reader.
 *
 * `updateTag` rather than `revalidateTag`: a player who has just confirmed an
 * upload or claimed a card must see that on the next page, and `revalidateTag`
 * serves the stale entry while the fresh one is computed. The cost is that the
 * next read of each list blocks on recomputing it — which is the read the write
 * just invalidated anyway.
 *
 * Callable only from a Server Action, which is what every write path here is.
 */
export function revalidateUserLists(userId: string): void {
  updateTag(tagFor(userId));
}
