// A read's settle, and WHY a credit came back, proved against a real Postgres. Each path a Help me
// choose read can end by is settled for real and the two records are read back:
//   ok            spent, no reason, settled_at set
//   failed        refunded, reason `failed`
//   nothing_valid refunded, reason `nothing_valid`
//   late_success  a read that answered ok after its reservation went stale (RESERVATION_TTL_MS):
//                 refunded, reason `late_success`, the read itself still `ok`, and the loud log fired
//   reaped        refunded by the reaper, reason `reaped`, read `failed` / `interrupted`
// and the table refuses a reason on a call that was not refunded, and a reason outside the four.
//
// Why this exists: on 2026-10-12 two staging reads ended `ok` in the read store with their credit
// `refunded` in the ledger, and nothing recorded why. The reasons and `settled_at` are what would
// have answered it.
//
// Every row is under a per-run `user_id` and deleted in a `finally`; nothing app-wide is written.
// The target is its own REQUIRED variable and is refused when it reports the production or staging
// branch, because `.env` is loaded with override and a `DATABASE_URL=` prefix would be discarded.
//
//   PROBE_TARGET_URL=<local-dev or a scratch branch> pnpm probe:intake-settle
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { RESERVATION_TTL_MS } from "../src/lib/model/allowance-rule";
import { INTAKE_REAPER_CUTOFF_MS } from "../src/lib/intake/limits";

neonConfig.webSocketConstructor = ws;

const URL_ = process.env.PROBE_TARGET_URL;
if (!URL_) throw new Error("PROBE_TARGET_URL is not set: name the database to write to (local-dev or a scratch branch)");
process.env.DATABASE_URL = URL_;

const pool = new Pool({ connectionString: URL_ });
const fixture = drizzle(pool);
const USER = `probe-intake-settle-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];
async function refusal(text: ReturnType<typeof sql>): Promise<string | null> {
  try {
    await fixture.execute(text);
    return null;
  } catch (e) {
    return (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code ?? "unknown";
  }
}

type Settled = { read_status: string; error_class: string | null; settled: boolean; call_status: string; refund_reason: string | null };
const read = async (readId: string): Promise<Settled> =>
  (await rows<Settled>(sql`
    select r.status as read_status, r.error_class, (r.settled_at is not null) as settled, m.status as call_status, m.refund_reason
    from intake_reads r join model_calls m on m.id = r.model_call_id where r.id = ${readId}::uuid`))[0];

async function main() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch === "br-noisy-violet-a6vw4ess" || branch === "br-polished-pond-a6e63y0b") {
    throw new Error(`refusing: the target reports ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch`);
  }
  const { startRead, settleTheRead, reapAbandonedReads } = await import("../src/lib/intake/run-store");

  let n = 0;
  const start = async () => {
    const r = await startRead(USER, `probe-settle-${Date.now()}-${n += 1}`, "probe-model");
    if (r.kind !== "started") throw new Error(`could not start a read: ${r.kind}`);
    return r;
  };
  const pick = { pool: 1, weighed: 1, picks: [{ oracleId: "00000000-0000-0000-0000-000000000001", reason: [{ text: "probe" }] }] };
  const empty = { pool: 1, weighed: 1, picks: [] };
  const back = (table: "intake_reads" | "model_calls", id: string, ms: number) =>
    fixture.execute(table === "intake_reads"
      ? sql`update intake_reads set created_at = created_at - (${ms} * interval '1 millisecond') where id = ${id}::uuid`
      : sql`update model_calls set created_at = created_at - (${ms} * interval '1 millisecond') where id = ${id}::uuid`);

  console.log("\n1. A read that answers in time");
  const ok = await start();
  await settleTheRead({ ...ok, userId: USER }, { kind: "read", result: pick as never }, []);
  check("ok: read ok, call spent, no reason, settled_at set", await read(ok.readId),
    { read_status: "ok", error_class: null, settled: true, call_status: "spent", refund_reason: null });

  console.log("\n2. A call that failed");
  const failed = await start();
  await settleTheRead({ ...failed, userId: USER }, { kind: "failed", errorClass: "timeout" }, []);
  check("failed: refunded with reason failed", await read(failed.readId),
    { read_status: "failed", error_class: "timeout", settled: true, call_status: "refunded", refund_reason: "failed" });

  console.log("\n3. An answer with nothing valid in it");
  const nothing = await start();
  await settleTheRead({ ...nothing, userId: USER }, { kind: "read", result: empty as never }, []);
  check("nothing_valid: refunded with reason nothing_valid", await read(nothing.readId),
    { read_status: "failed", error_class: "nothing_valid", settled: true, call_status: "refunded", refund_reason: "nothing_valid" });

  console.log("\n4. A success that arrives after its reservation went stale");
  const late = await start();
  // Past the TTL but not the reaper's cutoff for the READ, which only the reaper reads: the settle is what is tested.
  await back("model_calls", late.callId, RESERVATION_TTL_MS + 60_000);
  const logged: string[] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args.map(String).join(" ")); };
  try {
    await settleTheRead({ ...late, userId: USER }, { kind: "read", result: pick as never }, []);
  } finally {
    console.error = realError;
  }
  check("late_success: read ok, call refunded with reason late_success", await read(late.readId),
    { read_status: "ok", error_class: null, settled: true, call_status: "refunded", refund_reason: "late_success" });
  check("the ok-but-refunded case is logged loudly, naming the read and its call",
    logged.some((l) => l.includes("[intake]") && l.includes(late.readId) && l.includes(late.callId)), true);

  console.log("\n5. An abandoned read");
  const reaped = await start();
  await back("intake_reads", reaped.readId, INTAKE_REAPER_CUTOFF_MS + 60_000);
  check("the reaper took one read", await reapAbandonedReads(USER), 1);
  check("reaped: refunded with reason reaped", await read(reaped.readId),
    { read_status: "failed", error_class: "interrupted", settled: true, call_status: "refunded", refund_reason: "reaped" });

  console.log("\n6. The table's own rules");
  check("a reason outside the four is refused", await refusal(sql`update model_calls set refund_reason = 'because' where id = ${failed.callId}::uuid`), "23514");
  check("a reason on a call that was not refunded is refused", await refusal(sql`update model_calls set refund_reason = 'failed' where id = ${ok.callId}::uuid`), "23514");
}

async function run() {
  try {
    await main();
  } finally {
    await fixture.execute(sql`delete from intake_reads where user_id = ${USER}`);
    await fixture.execute(sql`delete from model_calls where user_id = ${USER}`);
    await pool.end();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
