/**
 * Which catalog the cached list payloads were built from.
 *
 * `cacheForUser` puts this in every key, so a catalog refresh retires every reader's
 * entries at once without knowing who they are — the one thing `revalidateUserLists`
 * cannot do, since it takes a user id and a weekly job has no list of readers (#705).
 *
 * CACHED FOR A MINUTE, and that is the trade this makes. Read unconditionally it would add
 * a round trip to every list request, which is the work the cache above it exists to avoid;
 * cached for the visit it would never move. Sixty seconds means a refresh reaches every
 * reader within a minute, against an hour of waiting the ceiling out, and costs one small
 * query a minute per server.
 *
 * A read that fails falls back to a constant rather than throwing. The generation is an
 * optimisation for freshness, not a correctness boundary: with the table unreachable the
 * cache behaves exactly as it did before this existed, which is the direction to fail in.
 */
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "../../db";
import { catalogRefreshes, CATALOG_ROW_ID } from "../../db/schema";

/** Used when the stamp cannot be read, and when no ingest has ever run. */
const UNSTAMPED = "0";

/**
 * The stamp as a key segment. Epoch millis rather than the timestamp's own rendering, for
 * the reason `DeckClaim.since` gives: the column is `timestamp` without time zone, and
 * every other reading of one in this repository has been bitten by the local-time parse.
 * Exported so the translation is pinned by a test; the query around it needs a database.
 */
export function generationKey(refreshedAt: Date | string | null | undefined): string {
  if (!refreshedAt) return UNSTAMPED;
  // A NAKED TIMESTAMP IS READ AS UTC. `2026-09-18 12:00:00` is what Postgres renders for a
  // column with no zone, and `new Date()` takes that for LOCAL time — so two servers in
  // different zones would derive two keys from one stamp and split the cache between them.
  // Naming the zone keeps the host's own clock out of a shared key.
  const stamped = typeof refreshedAt === "string"
      && !/[Zz]$|[+-]\d\d:?\d\d$/.test(refreshedAt)
    ? `${refreshedAt.replace(" ", "T")}Z`
    : refreshedAt;
  const millis = new Date(stamped).getTime();
  return Number.isNaN(millis) ? UNSTAMPED : String(millis);
}

async function load(): Promise<string> {
  try {
    const [row] = await db
      .select({ refreshedAt: catalogRefreshes.refreshedAt })
      .from(catalogRefreshes)
      .limit(1);
    return generationKey(row?.refreshedAt);
  } catch {
    return UNSTAMPED;
  }
}

/**
 * Built on first use and kept, not at module scope.
 *
 * `unstable_cache` is called where it is imported, so wrapping at module scope would run it
 * for anything that so much as imports a module importing this one — which is every list
 * route and, in tests, every file that mocks `next/cache` for its own reasons. Twenty-three
 * unrelated cases broke on exactly that. Memoised, so the wrapper is still made once.
 */
let cached: (() => Promise<string>) | null = null;

export async function catalogGeneration(): Promise<string> {
  try {
    cached ??= unstable_cache(
      load,
      ["catalog-generation"],
      // No tag: nothing invalidates this on purpose. The window IS the invalidation story,
      // and a tag would need the same fan-out over readers this design exists to avoid.
      { revalidate: 60 },
    );
    return await cached();
  } catch {
    // The WRAPPER can throw too, not just the query — `unstable_cache` requires Next's
    // incremental cache and raises an invariant without it, which is every call from
    // outside a request. Falling back here is what makes the promise above true: with this
    // unreadable the list cache behaves exactly as it did before the generation existed,
    // rather than taking a page down for a freshness optimisation.
    return UNSTAMPED;
  }
}
