/**
 * Records that the catalog has changed, which retires every cached list payload derived
 * from it — see `catalog-generation.ts` for how, and #705 for why.
 *
 * Called at the END of each ingest, after its writes are visible, so a reader who misses
 * the stamp by a moment gets the old generation and one more minute of the old payload
 * rather than a new generation over half-written rows.
 *
 * ONE ROW, upserted. `id` is `CATALOG_ROW_ID`, and a check constraint forbids any other, because "the current catalog" is a single fact;
 * a table that grew a row per refresh would make reading it a scan with an ordering, for an
 * answer nothing needs the history of.
 */
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogRefreshes, CATALOG_ROW_ID } from "../../db/schema";

export async function stampCatalogRefresh(): Promise<void> {
  try {
    await db
      .insert(catalogRefreshes)
      .values({ id: CATALOG_ROW_ID, refreshedAt: new Date() })
      .onConflictDoUpdate({
        target: catalogRefreshes.id,
        set: { refreshedAt: sql`excluded.refreshed_at` },
      });
  } catch (error) {
    // A FAILED STAMP MUST NOT FAIL THE INGEST. The catalog refresh workflow runs the seed
    // scripts directly against the catalog databases and never runs `db:migrate` — Vercel
    // applies migrations on a production build, which is a different path — so the first
    // refresh after this ships can meet a database with no `catalog_refreshes` table at
    // all. Throwing there would turn a successful hundred-thousand-row ingest into a red
    // job over a cache hint.
    //
    // The cost of swallowing it is one refresh's worth of staleness, which is exactly the
    // behaviour every reader had before this existed. Loud, though: a silent miss here is
    // a week of readers wondering why the refresh did nothing.
    console.warn(
      "catalog generation not stamped — readers keep their cached lists until the hour "
      + `ceiling expires: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
