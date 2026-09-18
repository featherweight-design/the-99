/**
 * Records that the catalog has changed, which retires every cached list payload derived
 * from it — see `catalog-generation.ts` for how, and #705 for why.
 *
 * Called at the END of each ingest, after its writes are visible, so a reader who misses
 * the stamp by a moment gets the old generation and one more minute of the old payload
 * rather than a new generation over half-written rows.
 *
 * ONE ROW, upserted. `id` is the constant 1 because "the current catalog" is a single fact;
 * a table that grew a row per refresh would make reading it a scan with an ordering, for an
 * answer nothing needs the history of.
 */
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogRefreshes } from "../../db/schema";

export async function stampCatalogRefresh(): Promise<void> {
  await db
    .insert(catalogRefreshes)
    .values({ id: 1, refreshedAt: new Date() })
    .onConflictDoUpdate({
      target: catalogRefreshes.id,
      set: { refreshedAt: sql`excluded.refreshed_at` },
    });
}
