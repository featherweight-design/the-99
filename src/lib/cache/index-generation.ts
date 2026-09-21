/**
 * Which commander index a cached deck mix was derived from.
 *
 * A mix is five integers resolved down the basis chain, and every rung of that chain reads
 * `commander_support` or `identity_composition` — both written by the monthly `Commander
 * index` job. `cacheForUser` already carries the CATALOG generation, and that is a different
 * stamp: an index rebuild does not touch `catalog_refreshes`, so without this an entry built
 * before a rebuild is served after it for the cache's one-hour ceiling, with the route
 * presenting it as the deck's current comparison.
 *
 * The window is small and the event is rare — an hour, once a month. It is worth closing
 * anyway because of WHICH hour: the first index run that writes role averages flips every
 * deck in the app from an asserted baseline to a measured one, and that is the single moment
 * this feature exists for. Serving the old figure through it, on the page that explains what
 * changed, is the worst hour of the month to be stale in.
 *
 * Everything below mirrors `catalog-generation.ts` deliberately, including the reasons — the
 * zone-free timestamp, the 60-second cache, the fallback that fails toward the old behaviour
 * rather than throwing, and the memoised wrapper built on first use rather than at module
 * scope. `generationKey` is imported rather than re-derived.
 */
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "../../db";
import { commanderSupport } from "../../db/schema";
import { generationKey } from "./catalog-generation";

/** Used when the stamp cannot be read, and when no index run has ever completed. */
const UNSTAMPED = "0";

/**
 * The read itself, uncached and exported — same reason as its catalog twin: `unstable_cache`
 * raises outside a request, so a script reaching for this answer must not have to rewrite
 * the query to get it.
 *
 * `max(computed_at)` rather than a single row: this table has one row per commander, and the
 * job stamps each as it writes. Epoch millis computed in SQL, because the column carries no
 * zone and a `Date` built from its rendering takes the reading host's clock with it.
 */
export async function readIndexGeneration(): Promise<string> {
  try {
    const [row] = await db
      .select({
        millis: sql<string | null>`(extract(epoch from max(${commanderSupport.computedAt})) * 1000)::bigint`,
      })
      .from(commanderSupport);
    return generationKey(row?.millis);
  } catch {
    return UNSTAMPED;
  }
}

let cached: (() => Promise<string>) | null = null;

export async function indexGeneration(): Promise<string> {
  try {
    cached ??= unstable_cache(readIndexGeneration, ["index-generation"], { revalidate: 60 });
    return await cached();
  } catch {
    return UNSTAMPED;
  }
}
