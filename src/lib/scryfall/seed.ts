import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { fetchBulkIndex, streamBulkEntries } from "./bulk";
import { toCardRow, type CardRow } from "./transform";
import { stampCatalogRefresh } from "../cache/stamp-catalog";

// The bulk file is gzipped JSONL; stream-parse it so the seed never materializes the
// whole payload.
export async function seedCards(): Promise<{ upserted: number; skipped: number }> {
  const index = await fetchBulkIndex("oracle_cards");

  let upserted = 0, skipped = 0;
  let batch: CardRow[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    await db.insert(cards).values(batch).onConflictDoUpdate({
      target: cards.oracleId,
      // Full-column update via Postgres excluded refs keeps the upsert idempotent.
      set: {
        scryfallId: sql`excluded.scryfall_id`,
        name: sql`excluded.name`,
        manaCost: sql`excluded.mana_cost`,
        cmc: sql`excluded.cmc`,
        colorIdentity: sql`excluded.color_identity`,
        typeLine: sql`excluded.type_line`,
        oracleText: sql`excluded.oracle_text`,
        keywords: sql`excluded.keywords`,
        commanderLegal: sql`excluded.commander_legal`,
        imageUri: sql`excluded.image_uri`,
        artCropUri: sql`excluded.art_crop_uri`,
        rarity: sql`excluded.rarity`,
        layout: sql`excluded.layout`,
        backImageUri: sql`excluded.back_image_uri`,
        gameChanger: sql`excluded.game_changer`,
      },
    });
    upserted += batch.length;
    batch = [];
  };

  for await (const value of streamBulkEntries(index)) {
    const row = toCardRow(value as import("./transform").ScryfallCard);
    if (!row) { skipped++; continue; }
    batch.push(row);
    if (batch.length >= 500) await flush();
  }
  await flush();
  // Every cached list payload carries card names, art and colour identities, so this run
  // changed all of them. The stamp is what retires them; see `catalog-generation.ts`.
  await stampCatalogRefresh();
  return { upserted, skipped };
}
