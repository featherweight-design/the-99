/**
 * Which Spellbook combo index a cached read was derived from.
 *
 * The in-deck combo marks are a join over `spellbook_variants` and `spellbook_variant_cards`. Both are rewritten by
 * `db:seed:combos` and `db:copy:combos`, which do NOT stamp `catalog_refreshes`, so `cacheForUser`'s catalog generation cannot see a
 * combo refresh and the commander-index generation (`index-generation.ts`) is a different table set altogether. This one is read off
 * the variants themselves: the newest `computed_at` (every ingest rewrites every row) and the row count, so an ingest that landed in
 * the same millisecond as the last, or one that only removed rows, still moves it.
 *
 * It is read off `spellbook_variants` and not the flags table: the ingest publishes flags in one transaction and the variants in a
 * second, so a flags stamp would move before the data a cached entry reads had.
 *
 * Mirrors `index-generation.ts`: epoch millis computed in SQL (the column has no zone), cached for 60 seconds, and a read that fails
 * answers the constant and is recorded, so the page serving it is not stored as if the read had succeeded.
 */
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "../../db";
import { generationKey } from "./catalog-generation";
import { recordSoftFailure } from "./soft-failure";

const UNSTAMPED = "0";

/** The read itself, uncached and exported so a script or a test can reach it without a request. */
export async function readComboGeneration(q: Pick<typeof db, "select"> = db): Promise<string> {
  try {
    const [row] = await q
      .select({
        newest: sql<string | null>`(select (extract(epoch from max(computed_at)) * 1000)::bigint from spellbook_variants)`,
        rows: sql<string | null>`(select count(*) from spellbook_variants)`,
      })
      .from(sql`(select 1) as _`);
    const parts = [generationKey(row?.newest), generationKey(row?.rows)];
    return parts.every((p) => p === UNSTAMPED) ? UNSTAMPED : parts.join(".");
  } catch {
    recordSoftFailure();
    return UNSTAMPED;
  }
}

let cached: (() => Promise<string>) | null = null;

export async function comboGeneration(): Promise<string> {
  try {
    cached ??= unstable_cache(readComboGeneration, ["combo-generation"], { revalidate: 60 });
    return await cached();
  } catch {
    recordSoftFailure();
    return UNSTAMPED;
  }
}
