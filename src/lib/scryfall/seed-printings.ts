import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, printings, skippedPrintings } from "../../db/schema";
import { fetchBulkIndex, streamBulkEntries } from "./bulk";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
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
 * Fills sets.base_set_size from the booster flag, with the Commander-product fallback.
 * Mirrors baseSetSizeOf in src/lib/sets/completion.ts, which is where it is unit tested:
 * a set with any booster printing counts those, and a set with none — every printing in a
 * Commander product carries booster false — counts its non-variant ones instead.
 *
 * CLEARS AND REPUBLISHES IN ONE TRANSACTION, and that is the whole point of the shape.
 *
 * The clear used to run on its own before the first batch, so that a refresh dying halfway
 * could not leave the previous run's denominator beside half-rewritten `booster` flags —
 * a denominator that no longer describes its numerator, drawn as a percentage. Sound on its
 * own. What it did not survive was pairing with the caller's other rule, that a run which
 * skipped orphans must publish nothing: between them, ONE orphaned printing blanked every
 * set in the database and nothing restored them until a later run reported zero. On the
 * weekly schedule that is up to seven days of every set reading `not indexed yet`, drawn
 * exactly like a set the catalog has never seen, behind a green job. It happened on staging
 * on 2026-09-16 (#704).
 *
 * Inside one transaction the blank is never observable: either both statements land or
 * neither does. A run that dies before this point now leaves the PREVIOUS denominators
 * standing — stale by one refresh rather than absent, which is the lesser of the two wrongs
 * and the one a reader can still act on.
 */
/** Thrown to roll the publish back when it would clear without replacing. Never escapes. */
class PublishedNothing extends Error {}

export async function setBaseSetSizes(): Promise<number> {
  try {
    return await db.transaction(async (tx) => {
      // Still a clear-then-fill rather than an upsert: a set that LOST its classification
      // (every printing now unclassified, or the set emptied) has to go back to null, and
      // the fill below deliberately skips those rows so it cannot write a denominator of 0.
      await tx.execute(sql`update sets set base_set_size = null where base_set_size is not null`);
      const updated = await tx.execute(sql`
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
    -- The VALUE, not just the row: the nullif above writes NULL for a set whose classified
    -- printings are all variants, and RETURNING hands that row back like any other. Counting
    -- rows would call such a run a publish, so a database of nothing but all-variant sets
    -- would clear every denominator and report success. (No backticks in here: this comment
    -- is inside a template literal, and one would end it.)
    returning s.code, s.base_set_size
  `);
      const published = updated.rows.filter(
        (row) => (row as { base_set_size: number | null }).base_set_size !== null,
      ).length;
      // A FILL THAT WROTE NOTHING ROLLS THE CLEAR BACK. Both statements are inside one
      // transaction so the intermediate blank is unobservable, but committing a clear whose
      // fill matched no row would still leave every set null — which is the whole defect,
      // reached through a different door: an unseeded `sets` table, or a printings table
      // that classifies nothing, rather than an orphaned bulk. Rolling back is what makes
      // `unsizedRunFailure`'s "the previous denominators are untouched" true in every path
      // instead of just the orphan one.
      if (published === 0) throw new PublishedNothing();
      return published;
    });
  } catch (error) {
    if (error instanceof PublishedNothing) return 0;
    throw error;
  }
}

/**
 * Why this run published no denominators, or null when it published some.
 *
 * Pure, and separate from the ingest, because it is the sentence the CLI exits non-zero on
 * (#704). A run that upserts a hundred thousand printings and sizes no set at all is a
 * FAILED run wearing a green check: the word `0` in a summary line is the only thing that
 * says so today, and nobody reads a summary line on a job that passed.
 */
export function unsizedRunFailure(
  r: Pick<
    SeedPrintingsResult,
    "upserted" | "skippedOrphan" | "skippedLayout" | "skippedReversible" | "baseSetSizes"
  >,
): string | null {
  if (r.baseSetSizes > 0) return null;
  // ORPHANS ARE TESTED BEFORE the no-op case, not after. A run where EVERY printing is
  // orphaned — `cards` populated but wholly out of step with the bulk — ingests nothing and
  // skips a hundred thousand, and reading `upserted === 0` first would file the worst state
  // this function can see as "nothing to do, exit 0".
  if (r.skippedOrphan > 0) {
    return `No set was sized: ${r.skippedOrphan} printing(s) name a card the oracle catalog `
      + "does not hold, so this run saw an incomplete bulk and refused to publish a base run "
      + "counted from the survivors. The previous denominators are untouched. Re-run the "
      + "refresh with the oracle ingest (`job=all`) to size them from a complete catalog.";
  }
  // A no-op is a bulk this ingest RECOGNISED NOTHING IN — no printing accepted, none
  // orphaned, and none turned away at the layout or reversible gates. `upserted === 0` alone
  // is not that: an upstream shape change that sent every entry to one of those gates would
  // ingest nothing, publish nothing, and be waved through here as "nothing to do", which is
  // the silent success this whole function exists to end.
  if (r.upserted === 0 && r.skippedLayout === 0 && r.skippedReversible === 0) return null;
  if (r.upserted === 0) {
    return `No set was sized and no printing was ingested, though the bulk held entries: `
      + `${r.skippedLayout} non-card (token, emblem, theme front, plane and the like) and ${r.skippedReversible} reversible were turned `
      + "away at the layout gates and nothing else was recognised. That is an upstream shape "
      + "change, not a catalog state — the previous denominators are untouched, and "
      + "re-running will do the same until the bulk or the transform moves.";
  }
  // TWO CAUSES, AND THIS NAMES BOTH rather than asserting the likelier one. The fill matches
  // `sets` by code, so it writes nothing either when no printing is classified (`booster`
  // null throughout the bulk) or when `sets` holds none of these codes — a database where the
  // sets ingest has never run, which `job=printings` on a fresh catalog produces. Sending a
  // reader to inspect the upstream file for the second one wastes the trip.
  return "No set was sized and no printing was orphaned. Either this bulk classifies nothing "
    + "(`booster` null throughout), or the `sets` table holds none of its set codes — the sets "
    + "ingest has not run against this database. The previous denominators are untouched. "
    + "Re-run with `job=all`, which seeds sets and oracle cards first, and check the upstream "
    + "file if it repeats.";
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
        artCropUri: sql`excluded.art_crop_uri`,
        backImageUri: sql`excluded.back_image_uri`,
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
    // NOW A NARROW COUNTER, and a spike in it is a real signal rather than a constant. It
    // used to count every `reversible_card` — ~82 of them, every run — because the layout
    // was dropped wholesale for carrying no top-level oracle id. They are ingested from
    // their faces since 2026-09-21, so this counts only the case the transform will not
    // guess at: faces naming different oracles, of which there are none today.
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
  // a denominator missing its new cards.
  //
  // Refusing to publish no longer means blanking what is there: `setBaseSetSizes` clears and
  // fills in one transaction, so skipping it leaves the PREVIOUS denominators standing. The
  // run is a failure all the same, and `unsizedRunFailure` is the sentence the CLI exits on
  // (#704) — a refresh that sized nothing must not pass for a refresh that worked.
  const baseSetSizes = skippedOrphan > 0 ? 0 : await setBaseSetSizes();
  // Stamped even when no denominator was published: the printings themselves moved, and a
  // set grid is a checklist of them. A refused publish leaves the old denominators standing
  // (#704), and those are exactly what a reader should stop being served a stale copy of.
  await stampCatalogRefresh();
  return {
    upserted, skippedOrphan, skippedLayout, skippedReversible, representatives, baseSetSizes,
  };
}
