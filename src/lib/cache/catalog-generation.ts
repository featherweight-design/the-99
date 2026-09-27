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
import { eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "../../db";
import { catalogRefreshes, CATALOG_ROW_ID } from "../../db/schema";

/** Used when the stamp cannot be read, and when no ingest has ever run. */
const UNSTAMPED = "0";

/**
 * The stamp as a key segment, from the epoch millis the query computed.
 *
 * A bigint arrives from the driver as a STRING, and it is already what the key wants — so
 * this normalises rather than parses. The parsing was the danger: the column carries no
 * zone, so a `Date` built from its rendering takes the reading host's clock with it, and
 * two servers in different zones would key one stamp two ways. `readCatalogGeneration` asks Postgres for the
 * number instead. `DeckClaim.since` carries the same note for the same reason.
 *
 * Exported so the translation is pinned by a test; the query around it needs a database.
 */
export function generationKey(millis: string | number | null | undefined): string {
  if (millis === null || millis === undefined || millis === "") return UNSTAMPED;
  const value = Number(millis);
  return Number.isFinite(value) ? String(value) : UNSTAMPED;
}

/**
 * The read itself, uncached and exported.
 *
 * `catalogGeneration` wraps this in `unstable_cache`, which raises an invariant outside a
 * request — so a script cannot reach the production reader through it, and `probe:catalog-stamp`
 * was reimplementing the query to get at the answer. A second copy of a query is the thing
 * this repository keeps paying for: it drifts by one clause and both halves go on passing.
 */
export async function readCatalogGeneration(): Promise<string> {
  try {
    // EPOCH MILLIS COMPUTED IN SQL, and BY ID rather than whichever row comes first. The
    // column has no zone, so the driver would hand back a `Date` built from a naked
    // `2026-09-18 12:00:00` — already carrying the reading host's clock, which no later
    // normalising can take out again. And `limit(1)` with no `where` asks for whatever
    // Postgres reaches first: a second row would flip the generation between requests and
    // retire every reader's cache on each flip. The check constraint makes that impossible;
    // this makes the read correct regardless.
    const [row] = await db
      .select({
        millis: sql<string | null>`(extract(epoch from ${catalogRefreshes.refreshedAt}) * 1000)::bigint`,
      })
      .from(catalogRefreshes)
      .where(eq(catalogRefreshes.id, CATALOG_ROW_ID));
    return generationKey(row?.millis);
  } catch {
    // not a fallback: the key loses the generation, and nothing a page draws changes.
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
      readCatalogGeneration,
      ["catalog-generation"],
      // No tag: nothing invalidates this on purpose. The window IS the invalidation story,
      // and a tag would need the same fan-out over readers this design exists to avoid.
      { revalidate: 60 },
    );
    return await cached();
  } catch {
    // not a fallback: as above, the key alone is affected.
    // The WRAPPER can throw too, not just the query — `unstable_cache` requires Next's
    // incremental cache and raises an invariant without it, which is every call from
    // outside a request. Falling back here is what makes the promise above true: with this
    // unreadable the list cache behaves exactly as it did before the generation existed,
    // rather than taking a page down for a freshness optimisation.
    return UNSTAMPED;
  }
}
