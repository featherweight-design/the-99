// Dollars by origin and feature from `model_calls`, over a window. READ-ONLY.
//
//   pnpm report:model-spend --target staging|production [--days N | --month]
//
// Default window: the current UTC month. The database is NAMED, never inferred: env.mjs loads
// `.env` over the shell, so DATABASE_URL is always local-dev and is not read here. `--target`
// resolves to THE_99_NEON_STAGING_DIRECT or THE_99_NEON_DIRECT from your shell; `REPORT_DB_URL`
// (and optionally `REPORT_DB_BRANCH`) reads any other database. The branch the database reports
// is printed first, and a mismatch with the named one stops the run. One SELECT, inside a
// read-only transaction.
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { formatSpend, groupSpend, type SpendRow } from "./lib/model-spend";
import { MISSING_ORIGIN_MESSAGE, isMissingOriginColumn, resolveSpendTarget } from "./lib/spend-target";

function fail(message: string): never {
  console.error(`report-model-spend: ${message}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
let target;
try {
  target = resolveSpendTarget(argv, process.env);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

const i = argv.indexOf("--days");
const now = new Date();
let since: Date;
if (i >= 0) {
  const days = Number(argv[i + 1]);
  if (!(Number.isInteger(days) && days > 0)) fail("--days needs a positive whole number");
  since = new Date(now.getTime() - days * 86_400_000);
} else {
  since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: target.url });
const client = await pool.connect();
try {
  await client.query("begin read only");
  const { rows: b } = await client.query("select current_setting('neon.branch_id', true) as branch");
  const branch: string | null = b[0]?.branch ?? null;
  console.log(`target ${target.name}, neon.branch_id ${branch ?? "unknown"}`);
  if (target.branchId && branch !== target.branchId) {
    fail(`connected to ${branch ?? "unknown"}, but ${target.name} is ${target.branchId}; refusing`);
  }
  const { rows } = await client.query(
    `select origin, feature, status, cost_micro_usd as "costMicroUsd" from model_calls where created_at >= $1`,
    // ISO text, not a Date: pg would send local time, and a timestamp column drops the offset.
    [since.toISOString()],
  );
  const spend: SpendRow[] = rows.map((r) => ({ ...r, costMicroUsd: r.costMicroUsd === null ? null : Number(r.costMicroUsd) }));
  console.log(`model_calls since ${since.toISOString()}\n`);
  console.log(formatSpend(groupSpend(spend)));
  await client.query("rollback");
} catch (err) {
  if (isMissingOriginColumn(err)) fail(MISSING_ORIGIN_MESSAGE);
  throw err;
} finally {
  client.release();
  await pool.end();
}
