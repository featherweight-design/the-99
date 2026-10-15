// Dates the holdings `collection_items.added_at` found already there (Date added, PR 1). Run ONCE per
// database, after that database's migration (0127) has deployed.
//
//   BACKFILL_TARGET_URL=<url> BACKFILL_TARGET_BRANCH=br-... pnpm db:backfill:added-at [--dry-run]
//
// FAILS CLOSED, the `pull:staging` rule: the target is never defaulted, and the database must report
// exactly the branch the caller named, by `neon.branch_id`, or the run exits 2 having read and written
// nothing. Never through the Neon MCP: a script, against the database it names. `--dry-run` counts what
// would be dated, writes nothing, and is the first run on every database. Idempotent: only rows with a null
// `added_at` are touched.
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { backfillAddedAt } from "../src/lib/collection/added-at-backfill";

neonConfig.webSocketConstructor = ws;

const url = process.env.BACKFILL_TARGET_URL;
const named = process.env.BACKFILL_TARGET_BRANCH;
const dryRun = process.argv.includes("--dry-run");
if (!url || !named) {
  console.error("BACKFILL_TARGET_URL and BACKFILL_TARGET_BRANCH are both required and never defaulted.");
  process.exit(2);
}

async function main() {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const [{ branch }] = (await pool.query("select current_setting('neon.branch_id', true) as branch")).rows as { branch: string | null }[];
    if (branch !== named) {
      console.error(`refusing: the database reports branch ${branch ?? "(unknown)"}, not ${named}. Nothing was read or written.`);
      process.exitCode = 2;
      return;
    }
    const hasColumn = (await pool.query(
      "select 1 from information_schema.columns where table_name = 'collection_items' and column_name = 'added_at'",
    )).rows.length > 0;
    if (!hasColumn) {
      console.error("refusing: collection_items has no added_at column here yet. Run it after this database's migration 0127.");
      process.exitCode = 2;
      return;
    }
    const report = await backfillAddedAt(pool, { dryRun });
    console.log(`${dryRun ? "[dry run] would date" : "dated"} ${report.dated} of ${report.undated} undated holdings on ${branch}: ${report.exact} exact, ${report.inexact} since-the-first-file; ${report.undated - report.dated} stay unknown.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
