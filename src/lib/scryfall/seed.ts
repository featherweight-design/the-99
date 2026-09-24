import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { fetchBulkIndex, streamBulkEntries } from "./bulk";
import { toCardRow, type CardRow } from "./transform";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { diffCardBatch, emptyLogReport, logTableExists, writeEntries, type LogReport } from "../notices/log";

// The upsert, unchanged, against whichever executor the batch runs on.
const upsert = (exec: Pick<typeof db, "insert">, rows: CardRow[]) =>
  exec.insert(cards).values(rows).onConflictDoUpdate({
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

/**
 * One batch of the card ingest. Exported so `probe:notices-log` can drive a batch against a real
 * Postgres without downloading the bulk file.
 *
 * THE DECK NOTICES LOG (brief §6), and the one structural change to this ingest: a batch that logs
 * runs in a TRANSACTION of its own, where it ran as one bare statement before. The run is still not
 * transactional as a whole; a batch now commits with its entries or not at all, so a run that fails
 * part-way leaves every committed change logged, and the next run's before-read cannot miss a
 * transition an earlier batch already made. The entries' write is a savepoint inside it and never
 * fails the batch (`writeEntries`). With `logging` off the batch is the bare upsert it always was.
 */
export async function upsertCardBatch(rows: CardRow[], logging: boolean, log: LogReport): Promise<void> {
  if (rows.length === 0) return;
  if (!logging) {
    await upsert(db, rows);
    return;
  }
  await db.transaction(async (tx) => {
    // The before-read in a SAVEPOINT, as the combo publishes take theirs: a failed read rolls back
    // to it, the batch still upserts, and this batch writes no entries. Never an empty "before",
    // which would log every card as newly flagged.
    let before: { oracleId: string; gameChanger: boolean; commanderLegal: boolean }[] | null = null;
    try {
      before = await tx.transaction((sp) => sp
        .select({ oracleId: cards.oracleId, gameChanger: cards.gameChanger, commanderLegal: cards.commanderLegal })
        .from(cards)
        .where(inArray(cards.oracleId, rows.map((r) => r.oracleId))));
    } catch (error) {
      console.warn(`notices: a card batch's prior state was unread, so it writes no entries (${error instanceof Error ? error.message : String(error)})`);
    }
    await upsert(tx, rows);
    if (before) await writeEntries(tx, diffCardBatch(new Map(before.map((b) => [b.oracleId, b])), rows), log);
  });
}

// The bulk file is gzipped JSONL; stream-parse it so the seed never materializes the
// whole payload.
export async function seedCards(): Promise<{ upserted: number; skipped: number; log: LogReport }> {
  const index = await fetchBulkIndex("oracle_cards");
  // Asked once: a database the workflow reaches before its migration logs nothing and says so.
  const logging = await logTableExists(db);
  const log = emptyLogReport();

  let upserted = 0, skipped = 0;
  let batch: CardRow[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    await upsertCardBatch(batch, logging, log);
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
  // In the job's own output, where a lost entry is seen; the caller's summary line is not ours.
  if (logging) console.log(`deck notices: ${log.written} change log entries written, ${log.lost} lost.`);
  return { upserted, skipped, log };
}
