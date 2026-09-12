import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, printings, skippedPrintings } from "../../db/schema";
import { fetchBulkIndex, streamBulkEntries } from "./bulk";
import {
  classifyPrinting,
  type PrintingRow,
  type SkippedPrintingRow,
} from "./transform-printings";

const BATCH_SIZE = 500;

export type SeedPrintingsResult = {
  upserted: number;
  skippedOrphan: number;
  skippedLayout: number;
  skippedReversible: number;
  representatives: number;
  baseSetSizes: number;
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
 * Blanks every set's denominator. Called BEFORE the ingest, not after it.
 *
 * Nullability protects the first migration and nothing after it: the ingest writes in
 * independent batches, so a refresh that dies halfway leaves a partly rewritten mix of
 * `booster` values beside the previous run's non-null `base_set_size` — a denominator that
 * no longer describes its numerator, rendered as a percentage. Clearing first means a
 * failed refresh leaves sets reading "not indexed yet", which is true.
 */
export async function clearBaseSetSizes(): Promise<void> {
  await db.execute(sql`update sets set base_set_size = null where base_set_size is not null`);
}

/**
 * Fills sets.base_set_size from the booster flag, with the Commander-product fallback.
 * Mirrors baseSetSizeOf in src/lib/sets/completion.ts, which is where it is unit tested:
 * a set with any booster printing counts those, and a set with none — every printing in a
 * Commander product carries booster false — counts its non-variant ones instead.
 */
export async function setBaseSetSizes(): Promise<number> {
  const updated = await db.execute(sql`
    with counts as (
      select set_code,
             count(*) filter (where booster is not null)::int                     as classified,
             count(*) filter (where booster is true)::int                         as in_booster,
             count(*) filter (where booster is not null and not is_variant)::int   as non_variant
        from printings
       group by set_code
    )
    update sets s
       -- NULL rather than 0. A classified set whose rows are all variants counts zero
       -- either way, and writing that makes it "indexed with an empty base run": the grid
       -- renders 0 / 0 and the index applies the complete treatment to a set with nothing
       -- in it. Zero base cells means nobody has said what the base run is.
       set base_set_size = nullif(
             case when c.in_booster > 0 then c.in_booster else c.non_variant end, 0)
      from counts c
     -- A set no printing has been classified for keeps its NULL. Without this it takes a
     -- denominator of 0 and the index reads "0%", which is the one thing nullability
     -- exists to prevent: a figure nobody computed, presented as a fact.
     where s.code = c.set_code and c.classified > 0
    returning s.code
  `);
  return updated.rows.length;
}

/**
 * Ingests every printing from Scryfall's `default_cards` bulk (~77MB gzipped).
 *
 * The file is stream-parsed so it is never materialized. Idempotent throughout: printings and
 * the skipped ledger both upsert on `scryfall_id`, and the representative pass is reset-then-set.
 *
 * IT UPSERTS AND NEVER DELETES, and nothing reconciles the table against the bulk it just
 * read. A printing Scryfall withdraws therefore stays in `printings` forever, which means
 * a set grid can draw a cell for a card no longer in the catalogue and `base_set_size` can
 * count it. The figure is then very slightly wrong in the reader's favour — a denominator
 * one too large — and the cell is a card nobody can buy.
 *
 * Not fixed here on purpose. Reconciling means DELETING catalog rows, and a partial run
 * that fails mid-stream would delete live ones; doing it safely needs a staging table and
 * a swap, which is a change to the ingest rather than to the feature that reads it.
 * Withdrawals are rare and the damage is one stale cell, so this is recorded as a known
 * limitation rather than repaired in a PR about set completion.
 */
export async function seedPrintings(): Promise<SeedPrintingsResult> {
  const index = await fetchBulkIndex("default_cards");

  // printings.oracle_id has an FK to cards.oracle_id, and the two ingests are not
  // lock-stepped. Pre-loading the ~35k known ids (~1.2MB) lets orphans be filtered in the
  // stream instead of failing the batch.
  const known = new Set(
    (await db.select({ oracleId: cards.oracleId }).from(cards)).map((c) => c.oracleId),
  );
  if (known.size === 0) {
    throw new Error("cards table is empty — run `pnpm db:seed` before seeding printings");
  }

  // Before the first batch, so a run that dies halfway cannot leave a stale denominator
  // beside a half-rewritten set of booster flags.
  await clearBaseSetSizes();

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
        flavorName: sql`excluded.flavor_name`,
        booster: sql`excluded.booster`,
        rarity: sql`excluded.rarity`,
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

  for await (const value of streamBulkEntries(index)) {
    const result = classifyPrinting(value);
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
  // Denominators are published only from a run that saw the WHOLE bulk. Orphans are
  // skipped when `cards` is behind `printings` — the supported manual mode — and a base
  // run counted from the survivors can be short, which would mark a set complete against
  // a denominator missing its new cards. Left null, the sets read "not indexed yet" until
  // a full refresh, which is true.
  const baseSetSizes = skippedOrphan > 0 ? 0 : await setBaseSetSizes();
  return {
    upserted, skippedOrphan, skippedLayout, skippedReversible, representatives, baseSetSizes,
  };
}
