// The one harness every catalog copy uses (plan `2026-09-28-card-data-replicate.md`, §3): a build
// made once on staging, published to production by a verified, one-way, fail-closed copy.
//
// What a copy guarantees, in the order it checks:
//
//   1. ONE WAY. Source and target are separate variables, never defaulted, and the caller NAMES
//      the target's Neon branch (`CATALOG_COPY_TARGET_BRANCH`). The target must report exactly
//      that branch — the `pull:staging` rule: "not the source" is not "safe to write to".
//   2. IDENTITY BY `neon.branch_id`, never by URL.
//   3. THE SOURCE HOLDS A SUCCESSFUL BUILD, and both catalogs are the one it was built from: the
//      ledger's newest row of this kind (`catalog_builds`) must be ok, and its catalog input
//      fingerprint must equal the source's now and the target's.
//   4. A CONSISTENT SOURCE: every read in one repeatable-read, read-only transaction.
//   5. ONE TARGET TRANSACTION, under the `catalog-ingest` lock, with the target's fingerprint
//      re-read inside it; the publish replaces each table family exactly.
//   6. VERIFIED BEFORE COMMIT: each table's count and md5 on the target, inside the transaction,
//      against the source snapshot's. A mismatch rolls the whole publish back.
//   7. THE STAMP is written on that same transaction, so readers' caches retire with the commit.
//
// It connects with its OWN pools. `src/db` is a module-scope pool on DATABASE_URL, and a builder's
// publish bodies import it transitively; the copy job sets DATABASE_URL to the verified target so
// that import can load, and nothing here ever queries through it.
import { Pool, neonConfig } from "@neondatabase/serverless";
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../../src/db/schema";
import { stampCatalogRefreshIn } from "../../src/lib/cache/stamp-catalog";
import { buildRefusal, latestBuild, type BuildKind, type BuildRow } from "../../src/lib/catalog/builds";
import { fingerprintKey, readCatalogFingerprint } from "../../src/lib/catalog/fingerprint";
import { requireEnv } from "./env.mjs";

neonConfig.webSocketConstructor = ws;

export type CopyDb = NeonDatabase<typeof schema>;
export type CopyTx = Parameters<Parameters<CopyDb["transaction"]>[0]>[0];

/** The key the catalog ingest holds for its whole run, and a copy takes inside its publish. */
export const CATALOG_INGEST_LOCK = "catalog-ingest";
export const catalogLockSql = sql`select pg_advisory_xact_lock(hashtextextended(${CATALOG_INGEST_LOCK}, 0))`;

export class CopyRefused extends Error {}

/** Pure: why this source/target pair may not be copied between, or null. */
export function identityRefusal(source: string | null, target: string | null, named: string): string | null {
  if (!source || !target) return "a side reports no neon.branch_id; refusing to guess which database it is";
  if (source === target) return `source and target are the same branch (${source})`;
  if (target !== named) return `the target reports ${target}, not the named ${named}`;
  return null;
}

/** A table's content as one comparable figure: its row count and an md5 of its rows, in text. */
export type TableFigure = { rows: number; md5: string };

/**
 * `cols` are the column EXPRESSIONS compared, which is exactly what the copy wrote (`copyTable`
 * builds them). Rows are ordered by their own text rather than a key, so no table needs a key
 * spelled here to be compared.
 */
export function tableFigureSql(table: string, cols: readonly string[]): SQL {
  const list = cols.join(", ");
  return sql.raw(`
    select count(*)::int as rows,
           md5(coalesce(string_agg(r::text, chr(30) order by r::text), '')) as md5
    from (select ${list} from "${table}") r`);
}

export async function readTableFigure(
  executor: { execute: (q: SQL) => Promise<{ rows: unknown[] }> },
  table: string,
  cols: readonly string[],
): Promise<TableFigure> {
  const { rows } = await executor.execute(tableFigureSql(table, cols));
  const row = rows[0] as { rows: number; md5: string };
  return { rows: Number(row.rows), md5: row.md5 };
}

/** Pure: every table whose target figure differs from the source's, or null when all agree. */
export function verifyRefusal(
  source: Record<string, TableFigure>,
  target: Record<string, TableFigure>,
): string | null {
  const off = Object.keys(source).filter((t) =>
    !target[t] || target[t].rows !== source[t].rows || target[t].md5 !== source[t].md5);
  if (off.length === 0) return null;
  return off.map((t) => `${t}: source ${source[t].rows} rows ${source[t].md5}, target ${target[t]?.rows ?? "?"} rows ${target[t]?.md5 ?? "?"}`).join("; ");
}

export type CopyTable = { name: string; cols: readonly string[] };

/**
 * A table to replace, compared on every column but `exclude`.
 *
 * A `timestamp` is compared to the MILLISECOND. Rows travel source to target as JS values, and a
 * `Date` holds milliseconds where Postgres holds microseconds, so a copied `computed_at` lands
 * truncated. That is what the copy writes and what production then serves; comparing microseconds
 * would fail every copy over a digit no reader uses.
 */
export function copyTable(name: string, table: PgTable, exclude: readonly string[] = []): CopyTable {
  const cols = Object.values(getTableColumns(table))
    .filter((c) => !exclude.includes(c.name))
    .map((c) => (c.columnType === "PgTimestamp" ? `date_trunc('milliseconds', "${c.name}")` : `"${c.name}"`));
  return { name, cols };
}

export type CopySpec<S> = {
  kind: BuildKind;
  /** The tables the publish replaces, and the columns it replaces in each. */
  tables: readonly CopyTable[];
  /** Every read of the source, inside its repeatable-read snapshot. */
  readSource: (tx: CopyTx) => Promise<S>;
  /** The builders' own floors, re-checked on the snapshot. Empty means publish. */
  floors: (snapshot: S) => string[];
  /** The writes, inside the target transaction, after the lock and the fingerprint re-check. */
  publish: (tx: CopyTx, snapshot: S) => Promise<void>;
  /** A line for the log: what the snapshot holds. */
  describe: (snapshot: S) => string;
};

type Connected = { pool: Pool; db: CopyDb };
const connect = (url: string): Connected => {
  const pool = new Pool({ connectionString: url });
  return { pool, db: drizzle(pool, { schema }) };
};

const branchOf = async (db: CopyDb | CopyTx): Promise<string | null> => {
  const { rows } = await db.execute(sql`select current_setting('neon.branch_id', true) as branch`);
  const branch = (rows[0] as { branch: string | null }).branch;
  return branch && branch.length > 0 ? branch : null;
};

/**
 * Run one copy end to end. Throws `CopyRefused` for every refusal, and rethrows anything else;
 * either way nothing on the target has changed unless this returned.
 */
export async function runCopy<S>(spec: CopySpec<S>, log: (line: string) => void = console.log): Promise<void> {
  const env = requireEnv(["CATALOG_COPY_SOURCE_URL", "CATALOG_COPY_TARGET_URL", "CATALOG_COPY_TARGET_BRANCH"]);
  const dryRun = process.argv.includes("--dry-run");
  const source = connect(env.CATALOG_COPY_SOURCE_URL);
  const target = connect(env.CATALOG_COPY_TARGET_URL);
  try {
    const [sourceBranch, targetBranch] = await Promise.all([branchOf(source.db), branchOf(target.db)]);
    const identity = identityRefusal(sourceBranch, targetBranch, env.CATALOG_COPY_TARGET_BRANCH);
    if (identity) throw new CopyRefused(identity);
    log(`copy ${spec.kind}: ${sourceBranch} -> ${targetBranch}${dryRun ? " (dry run)" : ""}`);

    // ---- the source, as one instant ------------------------------------------------------
    const snap = await source.db.transaction(async (tx) => {
      const build = await latestBuild(tx, spec.kind);
      const fingerprint = fingerprintKey(await readCatalogFingerprint(tx));
      const data = await spec.readSource(tx);
      const figures: Record<string, TableFigure> = {};
      for (const t of spec.tables) figures[t.name] = await readTableFigure(tx, t.name, t.cols);
      return { build, fingerprint, data, figures };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });

    const targetFingerprint = fingerprintKey(await readCatalogFingerprint(target.db));
    log(`source build: ${describeBuild(snap.build)}`);
    log(`catalog: source ${snap.fingerprint} · target ${targetFingerprint}`);
    log(`source holds: ${spec.describe(snap.data)}`);
    for (const t of spec.tables) log(`  ${t.name}: ${snap.figures[t.name].rows} rows ${snap.figures[t.name].md5}`);

    const refusal = buildRefusal(snap.build, snap.fingerprint, targetFingerprint);
    if (refusal) throw new CopyRefused(refusal);
    const below = spec.floors(snap.data);
    if (below.length > 0) throw new CopyRefused(`the source is under the builders' floors: ${below.join("; ")}`);
    if (dryRun) {
      log("dry run: every check passed; nothing written");
      return;
    }

    // ---- the publish, as one transaction -------------------------------------------------
    await target.db.transaction(async (tx) => {
      await tx.execute(catalogLockSql);
      // Re-read UNDER the lock: a catalog refresh that committed after the check above is either
      // finished (and visible here) or waiting on this lock, never interleaved with the writes.
      const now = fingerprintKey(await readCatalogFingerprint(tx));
      if (now !== snap.build!.catalogFingerprint) {
        throw new CopyRefused(`the target's catalog moved before the publish (${now}); refresh and retry`);
      }
      await spec.publish(tx, snap.data);
      const figures: Record<string, TableFigure> = {};
      for (const t of spec.tables) figures[t.name] = await readTableFigure(tx, t.name, t.cols);
      const mismatch = verifyRefusal(snap.figures, figures);
      if (mismatch) throw new CopyRefused(`verification failed, publish rolled back: ${mismatch}`);
      await stampCatalogRefreshIn(tx);
    });
    log(`copy ${spec.kind}: published and verified`);
  } finally {
    await Promise.all([source.pool.end(), target.pool.end()]);
  }
}

const describeBuild = (b: BuildRow | null) =>
  b ? `${b.id} started ${b.startedAt.toISOString()} · ok ${b.ok} · catalog ${b.catalogFingerprint}` : "none";

/** The CLI wrapper every copy script ends with: a refusal exits 2, any other failure 1. */
export function runCopyCli<S>(spec: CopySpec<S>): void {
  runCopy(spec).then(
    () => process.exit(0),
    (error) => {
      if (error instanceof CopyRefused) {
        console.error(`REFUSED: ${error.message}`);
        process.exit(2);
      }
      console.error(error);
      process.exit(1);
    },
  );
}
