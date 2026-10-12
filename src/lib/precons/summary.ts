/**
 * The /decks precons line's meta: how many distinct decklists, and the newest release. Catalog data,
 * read beside the page's cached payload. A failed or empty read is never a failed /decks: the line
 * stays and drops its meta (audit finding 9), so this answers null rather than throwing.
 */
import { isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { precons } from "../../db/schema";

export type PreconSummary = { count: number; newest: string };

/** The read itself: plain editions only, since a twin folds into the edition it names. */
export function preconSummaryQuery() {
  return db
    .select({ count: sql<number>`count(*)::int`, newest: sql<string | null>`max(${precons.releaseDate})::text` })
    .from(precons)
    .where(isNull(precons.twinOf));
}

export async function readPreconSummary(): Promise<PreconSummary | null> {
  try {
    const [row] = await preconSummaryQuery();
    return row && row.count > 0 && row.newest ? { count: row.count, newest: row.newest } : null;
  } catch (error) {
    // not a fallback: read beside the cached payload, never inside it, so nothing is stored.
    console.error("precons: the /decks line's summary could not be read", error);
    return null;
  }
}
