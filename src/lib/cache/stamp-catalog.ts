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

/** A drizzle transaction on ANY neon-serverless connection with this schema, not only `src/db`'s. */
type StampTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The same stamp, written through a caller's TRANSACTION on a connection of its choosing: what a
 * catalog copy uses, so the stamp lands on the branch the copy verified, in the publish that
 * changed its tables (plan `2026-09-28-card-data-replicate.md`, §3 item 9). `stampCatalogRefresh`
 * is bound to `src/db` and so to `DATABASE_URL`, which a two-connection copy never trusts.
 *
 * FATAL, unlike the ingests' stamp. The ingests tolerate a database without the table because they
 * run without `db:migrate`; a copy's target is migrated by definition, and a copy that published
 * without moving the stamp would leave every reader's cached list on the facts it just replaced.
 * A failure here throws and rolls the whole publish back.
 */
export async function stampCatalogRefreshIn(tx: StampTx): Promise<void> {
  await tx.insert(catalogRefreshes)
    .values({ id: CATALOG_ROW_ID, refreshedAt: new Date() })
    .onConflictDoUpdate({ target: catalogRefreshes.id, set: { refreshedAt: sql`excluded.refreshed_at` } });
}
