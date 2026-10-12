import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cardLabels } from "../../db/schema";

/**
 * The label generation: the newest `card_labels.labelled_at` anywhere, as epoch millis, or `none` with no
 * label at all. A cached payload whose figures read labels keys on it (Stats on /decks, G3), because a label
 * build on staging publishes with no `catalog_refreshes` stamp (`publishWave`), so the catalog generation
 * never moves for it. Global rather than per card: any build retires the entry, which costs one recompute
 * per build and can never keep a stale count.
 *
 * Undefined when the read fails: the caller then reads uncached rather than keying wrongly.
 */
export async function labelGeneration(): Promise<string | undefined> {
  try {
    const [row] = await db.select({ millis: sql<string | null>`(extract(epoch from max(${cardLabels.labelledAt})) * 1000)::bigint` }).from(cardLabels);
    return row?.millis == null ? "none" : String(row.millis);
  } catch {
    // not a fallback: the caller reads uncached, which is the answer with no key.
    return undefined;
  }
}
