import { sql } from "drizzle-orm";
import { db } from "../../db";
import { sets } from "../../db/schema";
import { SCRYFALL_HEADERS } from "./http";
import { toSetRows } from "./transform-sets";
import { stampCatalogRefresh } from "../cache/stamp-catalog";

const SETS_INDEX = "https://api.scryfall.com/sets";

/** Ingests the full Scryfall set catalog. Idempotent: upserts on `code`. */
export async function seedSets(): Promise<{ upserted: number }> {
  const res = await fetch(SETS_INDEX, {
    headers: SCRYFALL_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`scryfall /sets ${res.status}`);
  const rows = toSetRows(await res.json());
  if (rows.length === 0) throw new Error("scryfall /sets returned no sets");

  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(sets).values(rows.slice(i, i + 500)).onConflictDoUpdate({
      target: sets.code,
      // Full-column update via Postgres excluded refs keeps the upsert idempotent.
      set: {
        name: sql`excluded.name`,
        setType: sql`excluded.set_type`,
        releasedAt: sql`excluded.released_at`,
        cardCount: sql`excluded.card_count`,
        digital: sql`excluded.digital`,
        iconSvgUri: sql`excluded.icon_svg_uri`,
      },
    });
  }
  // Set names and icons are drawn from every set surface, and those payloads are cached.
  await stampCatalogRefresh();
  return { upserted: rows.length };
}
