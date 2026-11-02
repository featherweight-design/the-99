/**
 * The server-side cache behind `/commanders`, `/discover` and `/collection`.
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
 *
 * The reader's own writes are not the only thing these payloads depend on, though. Every
 * one of them is derived from the card catalog, which a weekly job rewrites and which no
 * tag can name — so the catalog's generation is part of the KEY. See
 * `catalog-generation.ts`.
 *
 * So is the DEPLOYMENT (`deployment.ts`): a build that changes what a payload says for
 * unchanged rows must not serve the previous build's entries, and the tag cannot see a deploy.
 */

import { unstable_cache, updateTag } from "next/cache";

import { catalogGeneration } from "./catalog-generation";
import { DEPLOYMENT_ID } from "./deployment";

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
 * The DEPLOYMENT is not one you pass: it is added to every key here
 * (`DEPLOYMENT_ID`), so a build that changes what a payload says for unchanged
 * rows never serves the previous build's entries. The tag cannot do that job —
 * it is dropped only by the reader's own writes. The version strings some
 * callers still carry (`browse-5`, `commanderRankingsKey`) predate this and are
 * now redundant across deploys; they do no harm, and no new one is needed.
 *
 * The result is stored as JSON, so the loader must return plain data: a `Map`
 * comes back as `{}` and a `Date` as a string. Hand back entries rather than a
 * map, and format dates at the edge that renders them.
 *
 * That JSON must also come in under 2 MB, which is the data cache's per-entry
 * ceiling. An entry over it is refused with a warning and never stored, so the
 * loader runs on every request AND pays to serialise its result first — slower
 * than not caching at all. It is the reason each of these three payloads was cut
 * down before being cached: `/commanders` ships its second ranking as a delta
 * rather than a second list, `/discover` caches the dictionary-encoded form
 * (3.1 MB plain, 1.1 MB encoded) and `/collection` caches a browse list with no
 * printings, oracle text or back art (2.4 MB before, 1.0 MB after). Anything added to one
 * of these payloads spends headroom that is measured in hundreds of KB, not MB.
 *
 * `opts.store`, when given, is asked of every value the loader returns: false SERVES it and never
 * files it. For a payload the key describes wrongly, such as one counted by the classifier because
 * the label read failed while the key names the labels basis (admin PR 6d-2): stored, it would be
 * served as the labels' until the ceiling. The degraded-ranking rule of `cachePageForUser`.
 */
export async function cacheForUser<T>(
  userId: string,
  key: string[],
  load: () => Promise<T>,
  opts: { store?: (value: T) => boolean } = {},
): Promise<T> {
  // THE CATALOG IS AN INPUT TO EVERY ONE OF THESE PAYLOADS, and the tag cannot express it:
  // the tag is per reader, and the weekly refresh has no list of readers to drop. In the key
  // it needs none — an entry built from the previous catalog is simply never asked for
  // again. See `catalog-generation.ts` for what it costs and why it is cached for a minute.
  // THE DEPLOYMENT TOO, so a build that changes a payload's shape never serves the last
  // build's entries. That used to be a version each caller had to remember to bump.
  const catalog = await catalogGeneration();
  const { store } = opts;
  const run = store
    ? async () => {
        const value = await load();
        // Thrown rather than returned: the data cache stores whatever the function returns.
        if (!store(value)) throw new NotStored(value);
        return value;
      }
    : load;
  try {
    return await unstable_cache(run, ["user-lists", userId, DEPLOYMENT_ID, catalog, ...key], {
      tags: [tagFor(userId)],
      revalidate: CEILING_SECONDS,
    })();
  } catch (error) {
    // not a fallback: a value served unstored, or the loader's own error rethrown.
    if (error instanceof NotStored) return error.value as T;
    throw error;
  }
}

class NotStored {
  constructor(readonly value: unknown) {}
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
