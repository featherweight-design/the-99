import { Readable } from "node:stream";
import { sql } from "drizzle-orm";
import chain from "stream-chain";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/stream-array.js";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { toCardRow, type CardRow } from "./transform";

// Scryfall's documented bulk-data type identifier (the hyphenated alias also resolves).
const BULK_INDEX = "https://api.scryfall.com/bulk-data/oracle_cards";

// The bulk file is a ~150MB JSON array; stream-parse it so the seed never
// materializes the whole payload (keeps the Vercel cron route within memory limits).
export async function seedCards(): Promise<{ upserted: number; skipped: number }> {
  const meta = await fetch(BULK_INDEX, {
    headers: { "User-Agent": "the-99/1.0" },
    signal: AbortSignal.timeout(10_000),
  }).then((r) => {
    if (!r.ok) throw new Error(`bulk-data index ${r.status}`);
    return r.json();
  });
  // The timeout spans the whole request including body streaming; 240s stays
  // inside the cron route's 300s maxDuration so a stalled download fails loudly
  // instead of being killed by the platform mid-seed.
  const res = await fetch(meta.download_uri, {
    headers: { "User-Agent": "the-99/1.0" },
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok || !res.body) throw new Error(`bulk download ${res.status}`);

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
        rarity: sql`excluded.rarity`,
      },
    });
    upserted += batch.length;
    batch = [];
  };

  const pipeline = chain([
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    parser(),
    streamArray(),
  ]);
  for await (const { value } of pipeline) {
    const row = toCardRow(value as import("./transform").ScryfallCard);
    if (!row) { skipped++; continue; }
    batch.push(row);
    if (batch.length >= 500) await flush();
  }
  await flush();
  return { upserted, skipped };
}
