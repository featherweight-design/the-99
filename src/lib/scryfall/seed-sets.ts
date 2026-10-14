import { sql } from "drizzle-orm";
import { db } from "../../db";
import { sets } from "../../db/schema";
import { fetchDir, readFetchedJson } from "../catalog/fetch-dir";
import { SCRYFALL_HEADERS, SETS_INDEX } from "./http";
import { toSetRows } from "./transform-sets";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { stampFirstSeen } from "../catalog/first-seen";


/** The sets list: the file the `fetch` job saved under CATALOG_FETCH_DIR, or Scryfall itself. */
export async function loadSetsPayload(): Promise<unknown> {
  const dir = fetchDir();
  if (dir) return readFetchedJson(dir, "sets.json");
  const res = await fetch(SETS_INDEX, {
    headers: SCRYFALL_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`scryfall /sets ${res.status}`);
  return res.json();
}

/** Ingests the full Scryfall set catalog. Idempotent: upserts on `code`. */
export async function seedSets(): Promise<{ upserted: number }> {
  const rows = toSetRows((await loadSetsPayload()) as Parameters<typeof toSetRows>[0]);
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
        parentSetCode: sql`excluded.parent_set_code`,
      },
    });
  }
  await stampFirstSeen("set", rows.map((r) => r.code));
  // Set names and icons are drawn from every set surface, and those payloads are cached.
  await stampCatalogRefresh();
  return { upserted: rows.length };
}
