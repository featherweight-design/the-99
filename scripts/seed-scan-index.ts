// Publishes card scanning's server index (plan `2026-10-16-card-scan.md`) from the exporter's files:
//
//   SCAN_INDEX_TARGET_URL=<url> SCAN_INDEX_TARGET_BRANCH=br-... pnpm db:seed:scan-index <dir> [--dry-run]
//
// `<dir>` holds `scan-rows.json` and `scan-rows.f32`, written by `export_index.py all --server`. FAILS CLOSED, the
// `pull:staging` rule: the target is never defaulted, and the database must report exactly the branch the caller
// named, by `neon.branch_id`, or the run exits 2 having written nothing. Never through the Neon MCP: a script,
// against the database it names. The files are checked whole (model, dimension, keys, unit length, the row floor)
// before the target is touched, and the publish is one transaction (`publishScanIndex`). `--dry-run` checks the
// files and the target and writes nothing.
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { publishScanIndex, readScanRows, scanRowsRefusal } from "./lib/scan-index";

neonConfig.webSocketConstructor = ws;

const url = process.env.SCAN_INDEX_TARGET_URL;
const named = process.env.SCAN_INDEX_TARGET_BRANCH;
const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<number> {
  if (!url || !named || !dir) {
    console.error("SCAN_INDEX_TARGET_URL, SCAN_INDEX_TARGET_BRANCH and the rows' directory are all required and never defaulted.");
    return 2;
  }
  const rows = readScanRows(dir);
  const refusal = scanRowsRefusal(rows);
  if (refusal) {
    console.error(`refusing: ${refusal}. Nothing was written.`);
    return 2;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    const [{ branch }] = (await client.query("select current_setting('neon.branch_id', true) as branch")).rows as { branch: string | null }[];
    if (branch !== named) {
      console.error(`refusing: the database reports branch ${branch ?? "(unknown)"}, not ${named}. Nothing was written.`);
      return 2;
    }
    const ready = (await client.query("select to_regclass('scan_index') is not null as ok")).rows[0] as { ok: boolean };
    if (!ready.ok) {
      console.error("refusing: scan_index does not exist here yet. Run it after this database's migration 0137.");
      return 2;
    }
    console.log(`${named}: ${rows.version}, ${rows.rows} rows, ${rows.model}`);
    if (dryRun) {
      console.log("dry run: the files and the target check out; nothing written.");
      return 0;
    }
    const t0 = Date.now();
    await publishScanIndex(client, rows, (s) => console.log(s));
    console.log(`published in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    return 0;
  } finally {
    client.release();
    await pool.end();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
