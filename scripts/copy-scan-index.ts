// Installs staging's card-scan index on another database, production above all (plan `2026-10-16-card-scan.md`:
// production's index comes by a copy, not a second embedding run):
//
//   CATALOG_COPY_SOURCE_URL=<staging> CATALOG_COPY_TARGET_URL=<target> CATALOG_COPY_TARGET_BRANCH=br-... \
//     pnpm db:copy:scan-index [--dry-run]
//
// The catalog copy harness's rules (`scripts/lib/catalog-copy.ts`), applied to a table no build ledger covers:
//
// - **One way, named target.** The three variables are never defaulted; the target must report exactly the named
//   branch by `neon.branch_id`, and a same-branch pair is refused (`identityRefusal`).
// - **One source instant.** Every source read is one repeatable-read, read-only transaction: the meta row, the rows
//   and the source's figure. `db:seed:scan-index` publishes in one transaction, so any instant is a whole index.
// - **The rows are checked whole before the target is touched** (`scanRowsRefusal`: the model, the row floor, the
//   keys and unit length), and so is the target's catalog: an index whose cards the target does not know would name
//   cards it cannot draw.
// - **One target transaction**: the ingest's own publish (`publishScanIndexIn`), then a count-and-md5 verify of
//   `scan_index` against the source's figure and of the meta row, before the commit. A mismatch rolls it all back.
//
// A refusal exits 2, any other failure 1. `--dry-run` runs every check and writes nothing.
import "./lib/env.mjs";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { CopyRefused, identityRefusal, runCopyMain } from "./lib/catalog-copy";
import { EMBED_DIM } from "../src/lib/card-scan/match";
import { MIN_ROWS, SCAN_FIGURE_SQL, parseHalfvec, publishScanIndexIn, scanRowsRefusal, type ScanRows } from "./lib/scan-index";

neonConfig.webSocketConstructor = ws;

/** The share of the index's cards the target's catalog may lack before the copy refuses. */
export const MISSING_CARD_SHARE = 0.01;

type Figure = { rows: number; md5: string };

const branchOf = async (c: PoolClient) =>
  ((await c.query("select current_setting('neon.branch_id', true) as b")).rows[0] as { b: string | null }).b || null;

const figureOf = async (c: PoolClient): Promise<Figure> => {
  const row = (await c.query(SCAN_FIGURE_SQL)).rows[0] as { rows: number; md5: string };
  return { rows: Number(row.rows), md5: row.md5 };
};

/** Why the target's catalog cannot take this index, or null: a share of its cards it does not hold. */
export function missingCardsRefusal(cards: number, missing: number, share = MISSING_CARD_SHARE): string | null {
  if (cards === 0) return "the index names no cards";
  return missing / cards > share
    ? `the target's catalog lacks ${missing} of the index's ${cards} cards (over ${share * 100}%); refresh its catalog first`
    : null;
}

async function main(): Promise<void> {
  const env = requireEnv(["CATALOG_COPY_SOURCE_URL", "CATALOG_COPY_TARGET_URL", "CATALOG_COPY_TARGET_BRANCH"]);
  const dryRun = process.argv.includes("--dry-run");
  const sourcePool = new Pool({ connectionString: env.CATALOG_COPY_SOURCE_URL, max: 1 });
  const targetPool = new Pool({ connectionString: env.CATALOG_COPY_TARGET_URL, max: 1 });
  const source = await sourcePool.connect();
  const target = await targetPool.connect();
  try {
    const [sourceBranch, targetBranch] = await Promise.all([branchOf(source), branchOf(target)]);
    const identity = identityRefusal(sourceBranch, targetBranch, env.CATALOG_COPY_TARGET_BRANCH);
    if (identity) throw new CopyRefused(identity);
    console.log(`copy scan index: ${sourceBranch} -> ${targetBranch}${dryRun ? " (dry run)" : ""}`);

    // ---- the source, as one instant ------------------------------------------------------
    await source.query("begin isolation level repeatable read read only");
    let rows: ScanRows & { dim: number; rows: number };
    let sourceFigure: Figure;
    try {
      const meta = (await source.query("select version, model, rows from scan_index_meta where id = 1")).rows[0] as
        | { version: string; model: string; rows: number }
        | undefined;
      if (!meta) throw new CopyRefused("the source holds no scan index (scan_index_meta is empty)");
      const read = await source.query(
        "select scryfall_id::text as s, face as f, oracle_id::text as o, embedding::text as e from scan_index order by scryfall_id, face",
      );
      const list = read.rows as { s: string; f: string; o: string; e: string }[];
      const vectors = new Float32Array(list.length * EMBED_DIM);
      list.forEach((r, i) => parseHalfvec(r.e, vectors, i * EMBED_DIM));
      rows = {
        version: meta.version, model: meta.model, dim: EMBED_DIM, rows: Number(meta.rows),
        keys: list.map((r) => [r.s, r.f, r.o] as [string, string, string]), vectors, literals: list.map((r) => r.e),
      };
      sourceFigure = await figureOf(source);
      await source.query("commit");
    } catch (err) {
      await source.query("rollback");
      throw err;
    }
    console.log(`source holds: ${rows.version}, ${rows.keys.length} rows, ${rows.model} · ${sourceFigure.md5}`);
    const refusal = scanRowsRefusal(rows, MIN_ROWS);
    if (refusal) throw new CopyRefused(`the source's index will not publish: ${refusal}`);

    // ---- the target: it can take this index ----------------------------------------------
    const ready = (await target.query("select to_regclass('scan_index') is not null as ok")).rows[0] as { ok: boolean };
    if (!ready.ok) throw new CopyRefused("scan_index does not exist on the target yet: run after its migration 0137");
    const oracleIds = [...new Set(rows.keys.map((k) => k[2]))];
    const [{ missing }] = (await target.query(
      "select count(*)::int as missing from unnest($1::uuid[]) as o(id) where not exists (select 1 from cards c where c.oracle_id = o.id)",
      [oracleIds],
    )).rows as { missing: number }[];
    console.log(`target catalog: ${oracleIds.length - missing} of ${oracleIds.length} of the index's cards held`);
    const cardRefusal = missingCardsRefusal(oracleIds.length, missing);
    if (cardRefusal) throw new CopyRefused(cardRefusal);
    if (dryRun) {
      console.log("dry run: every check passed; nothing written");
      return;
    }

    // ---- the publish, as one transaction, verified before it commits ---------------------
    const t0 = Date.now();
    await target.query("begin");
    try {
      await publishScanIndexIn((text, params) => target.query(text, params), rows, (s) => console.log(s), async () => {
        const now = await figureOf(target);
        if (now.rows !== sourceFigure.rows || now.md5 !== sourceFigure.md5) {
          throw new CopyRefused(
            `verification failed, publish rolled back: source ${sourceFigure.rows} rows ${sourceFigure.md5}, target ${now.rows} rows ${now.md5}`,
          );
        }
        const meta = (await target.query("select version, model, rows from scan_index_meta where id = 1")).rows[0] as
          { version: string; model: string; rows: number };
        if (meta.version !== rows.version || meta.model !== rows.model || Number(meta.rows) !== rows.keys.length) {
          throw new CopyRefused("verification failed, publish rolled back: the meta row does not match the source's");
        }
      });
      await target.query("commit");
    } catch (err) {
      await target.query("rollback");
      throw err;
    }
    console.log(`copy scan index: published and verified in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally {
    source.release();
    target.release();
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

if (process.argv[1]?.endsWith("copy-scan-index.ts")) runCopyMain(main);
