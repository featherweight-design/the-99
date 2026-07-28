import { Readable } from "node:stream";
import { sql } from "drizzle-orm";
import chain from "stream-chain";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/stream-array.js";
import { db } from "../../db";
import { cards, printings, skippedPrintings } from "../../db/schema";
import { SCRYFALL_HEADERS } from "./seed-sets";
import {
  classifyPrinting,
  type PrintingRow,
  type SkippedPrintingRow,
} from "./transform-printings";

const BULK_INDEX = "https://api.scryfall.com/bulk-data/default_cards";
const BATCH_SIZE = 500;

export type SeedPrintingsResult = {
  upserted: number;
  skippedOrphan: number;
  skippedLayout: number;
  skippedReversible: number;
  representatives: number;
};

/**
 * Recomputes `is_representative` for every printing, in a single transaction.
 *
 * Reset-then-set, not set-only: a partial ingest leaves stale winners behind, and a re-run
 * that adds a better printing would otherwise never clear the old one. The ordering mirrors
 * compareForRepresentative in transform-printings.ts, which is where it is unit-tested.
 */
export async function setRepresentativePrintings(): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`update printings set is_representative = false where is_representative`);
    await tx.execute(sql`
      with ranked as (
        select scryfall_id,
               row_number() over (
                 partition by oracle_id, set_code
                 order by is_variant asc,
                          nullif(regexp_replace(collector_number, '\\D', '', 'g'), '')::int
                            nulls last,
                          collector_number asc
               ) as rn
        from printings
      )
      update printings p
         set is_representative = true
        from ranked r
       where p.scryfall_id = r.scryfall_id and r.rn = 1
    `);
    const counted = await tx.execute(
      sql`select count(*)::int as count from printings where is_representative`,
    );
    return Number((counted.rows[0] as { count: number }).count);
  });
}

/**
 * Ingests every printing from Scryfall's `default_cards` bulk (~620MB).
 *
 * The file is stream-parsed so it is never materialized. Idempotent throughout: printings and
 * the skipped ledger both upsert on `scryfall_id`, and the representative pass is reset-then-set.
 */
export async function seedPrintings(): Promise<SeedPrintingsResult> {
  const meta = await fetch(BULK_INDEX, {
    headers: SCRYFALL_HEADERS,
    signal: AbortSignal.timeout(30_000),
  }).then((r) => {
    if (!r.ok) throw new Error(`bulk-data index ${r.status}`);
    return r.json();
  });
  if (typeof meta?.download_uri !== "string") {
    throw new Error("unexpected bulk-data index shape: missing download_uri");
  }

  // printings.oracle_id has an FK to cards.oracle_id, and the two ingests are not
  // lock-stepped. Pre-loading the ~35k known ids (~1.2MB) lets orphans be filtered in the
  // stream instead of failing the batch.
  const known = new Set(
    (await db.select({ oracleId: cards.oracleId }).from(cards)).map((c) => c.oracleId),
  );
  if (known.size === 0) {
    throw new Error("cards table is empty — run `pnpm db:seed` before seeding printings");
  }

  // The timeout spans the whole request including body streaming. 30 minutes is generous for
  // a 620MB download and still fails loudly well inside the workflow's timeout-minutes: 60.
  const res = await fetch(meta.download_uri, {
    headers: SCRYFALL_HEADERS,
    signal: AbortSignal.timeout(1_800_000),
  });
  if (!res.ok || !res.body) throw new Error(`bulk download ${res.status}`);

  let upserted = 0, skippedOrphan = 0, skippedLayout = 0, skippedReversible = 0;
  let batch: PrintingRow[] = [];
  let skippedBatch: SkippedPrintingRow[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await db.insert(printings).values(batch).onConflictDoUpdate({
      target: printings.scryfallId,
      // Full-column update via Postgres excluded refs keeps the upsert idempotent.
      // is_representative is deliberately absent: it is owned by the post-load pass, and
      // rewriting it here would blank every representative for the length of the ingest.
      set: {
        oracleId: sql`excluded.oracle_id`,
        setCode: sql`excluded.set_code`,
        collectorNumber: sql`excluded.collector_number`,
        imageUri: sql`excluded.image_uri`,
        imageUriSmall: sql`excluded.image_uri_small`,
        finishes: sql`excluded.finishes`,
        isVariant: sql`excluded.is_variant`,
      },
    });
    upserted += batch.length;
    batch = [];
  };

  const flushSkipped = async () => {
    if (skippedBatch.length === 0) return;
    await db.insert(skippedPrintings).values(skippedBatch).onConflictDoUpdate({
      target: skippedPrintings.scryfallId,
      set: { layout: sql`excluded.layout`, name: sql`excluded.name` },
    });
    skippedLayout += skippedBatch.length;
    skippedBatch = [];
  };

  const pipeline = chain([
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    parser(),
    streamArray(),
  ]);
  for await (const { value } of pipeline) {
    const result = classifyPrinting(value as Record<string, unknown>);
    if (result.kind === "skipped-reversible") { skippedReversible++; continue; }
    // Digital-only printings are dropped entirely — neither a printing nor worth a ledger row.
    if (result.kind === "skipped-digital") continue;
    if (result.kind === "skipped-layout") {
      skippedBatch.push(result.row);
      if (skippedBatch.length >= BATCH_SIZE) await flushSkipped();
      continue;
    }
    if (!known.has(result.row.oracleId)) { skippedOrphan++; continue; }
    batch.push(result.row);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  await flushSkipped();

  const representatives = await setRepresentativePrintings();
  return { upserted, skippedOrphan, skippedLayout, skippedReversible, representatives };
}
