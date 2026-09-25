// Help me choose PR 4's deeper read, proved against a real Postgres by calling the real
// `runDeeperRead`, `startRead`, `settleRead`, `cancelRead` and `reapReads`.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. Every rule applied to what a read RETURNS is unit tested;
// what those tests cannot see is what it WROTE, and the credit is the whole point (plan, PR 4):
//  - a read's unit is SPENT only when a valid chip survived validation;
//  - it is REFUNDED on a failed call, on Stop, and when nothing valid came back (F4);
//  - a LATE answer, one arriving after its Stop, changes nothing about the read or the credit,
//    and still records its bill on the ledger, because the upstream call billed all the same;
//  - the one-pending index refuses a second read in flight, and the loser holds no unit;
//  - the reaper frees a read stranded past its cutoff and refunds it;
//  - a Stop is scoped to its reader.
//
// THE MODEL IS INJECTED AND SPENDS NOTHING. The late-answer case needs a model that waits while
// the Stop lands, which only an injected one can do; the bills it reports are made up and priced
// at the real model's rates, so the ledger's cost column has something to show.
//
//   PROBE_TARGET_URL=<local-dev or a scratch branch> pnpm probe:help-me-choose-read
//
// The target is its own variable and is REQUIRED, for the reason the plumbing probe gives: `.env`
// is loaded with override, and `src/db` reads `DATABASE_URL` at module scope, so the modules that
// use it are imported only after it is set. Every row is under a per-run `user_id`, deleted in a
// `finally`. Point it at `local-dev` or a scratch branch, never production.
import "./lib/env.mjs";
import { randomUUID } from "node:crypto";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import type { ModelOutcome } from "../src/lib/model/client";
import { INTAKE_MODEL, INTAKE_REAPER_CUTOFF_MS } from "../src/lib/intake/limits";
import { buildPhraseIndex } from "../src/lib/intake/match";
import type { ReadResponse } from "../src/lib/intake/read";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.PROBE_TARGET_URL;
if (!DATABASE_URL) throw new Error("PROBE_TARGET_URL is not set: name local-dev or a scratch branch");
process.env.DATABASE_URL = DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-hmc-read-${Date.now()}`;
const OTHER = `${USER}-other`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};

const index = buildPhraseIndex([{ slug: "dinosaurs", label: "Dinosaurs" }], []);
const usage = { inputTokens: 3_000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 };
const reply = (themes: string[]): ModelOutcome<ReadResponse> => ({
  ok: true, usage, value: { themes, cards: [], budgetDollars: null, bracket: null, notUnderstood: [] },
});
const controls = { budgetDollars: null, bracket: null };

type Row = { status: string; error_class: string | null; chips: unknown; unit: string; feature: string; cost: number | null };
async function readRow(readId: string): Promise<Row> {
  const [r] = (await fixture.execute(sql`
    select r.status, r.error_class, r.chips, m.status as unit, m.feature, m.cost_micro_usd as cost
    from intake_reads r join model_calls m on m.id = r.model_call_id where r.id = ${readId}`)).rows as Row[];
  return r;
}
const units = async (userId: string) =>
  Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${userId}`)).rows[0] as { n: number }).n);

// WHERE THIS PROBE MAY WRITE. It writes intake_reads and model_calls rows, so it refuses the
// staging and production branches before its first write, and fails closed on a branch it cannot read.
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

async function refuseSharedDatabase() {
  const [r] = (await fixture.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string | null }[];
  const branch = r?.branch ?? null;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    await pool.end();
    throw new Error(`probe:help-me-choose-read writes fixture rows and refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
}

async function main() {
  await refuseSharedDatabase();
  try {
    const { runDeeperRead } = await import("../src/lib/intake/deeper-read");
    const store = await import("../src/lib/intake/run-store");
    const deps = (model: () => Promise<ModelOutcome<ReadResponse>>) => ({
      modelName: INTAKE_MODEL,
      model,
      loadIndex: async () => ({ labels: ["Dinosaurs"], index }),
      now: () => new Date(),
    });
    // Each press reads its own words: an ask already read is answered from the store (once per
    // ask), which would stop every later case from reaching the model at all.
    const run = (readId: string, model: () => Promise<ModelOutcome<ReadResponse>>, words = `big dumb lizards ${readId}`) =>
      runDeeperRead(USER, { readId, words, controls }, deps(model));

    console.log("\n1. A read with a valid chip spends its unit");
    const ok = randomUUID();
    check("the outcome is the chips", (await run(ok, async () => reply(["Dinosaurs"]))).kind, "read");
    const okRow = await readRow(ok);
    check("the read is ok and holds its chip", [okRow.status, okRow.chips], ["ok", { chips: [{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }], notUsed: [], notUnderstood: [] }]);
    check("its unit is spent, on the intake feature", [okRow.unit, okRow.feature], ["spent", "intake"]);
    check("its bill is recorded", (okRow.cost ?? 0) > 0, true);
    const unitsBefore = await units(USER);
    let asked = false;
    const again = await run(randomUUID(), async () => { asked = true; return reply(["Dinosaurs"]); }, `big dumb lizards ${ok}`);
    check("the same ask again gets the stored read back", [again.kind, asked], ["read", false]);
    check("and reserves nothing", await units(USER), unitsBefore);

    console.log("\n2. Nothing valid came back: refunded (F4)");
    const nothing = randomUUID();
    check("the outcome says nothing held up", (await run(nothing, async () => reply(["Pirates"]))).kind, "nothing");
    const nothingRow = await readRow(nothing);
    check("the read failed as nothing_valid, its unit refunded", [nothingRow.status, nothingRow.error_class, nothingRow.unit], ["failed", "nothing_valid", "refunded"]);
    check("a refund still records what the call burned", (nothingRow.cost ?? 0) > 0, true);

    console.log("\n3. A failed call: refunded");
    const failed = randomUUID();
    check("the outcome is the class", await run(failed, async () => ({ ok: false, errorClass: "upstream_busy" })), { kind: "failed", errorClass: "upstream_busy" });
    const failedRow = await readRow(failed);
    check("the read failed, its unit refunded", [failedRow.status, failedRow.error_class, failedRow.unit], ["failed", "upstream_busy", "refunded"]);

    console.log("\n4. Stop, then a late answer");
    const stopped = randomUUID();
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    let entered!: () => void;
    const inCall = new Promise<void>((r) => { entered = r; });
    const pending = run(stopped, async () => { entered(); await held; return reply(["Dinosaurs"]); });
    await inCall;
    const before = await units(USER);
    check("while it runs, a second press is refused as in flight", (await run(randomUUID(), async () => reply(["Dinosaurs"]))).kind, "in_flight");
    check("another reader's Stop cancels nothing", await store.cancelRead(stopped, OTHER), false);
    check("the reader's Stop cancels it", await store.cancelRead(stopped, USER), true);
    const mid = await readRow(stopped);
    check("the read is cancelled, its unit refunded, no bill yet", [mid.status, mid.unit, mid.cost], ["cancelled", "refunded", null]);
    release();
    check("the late answer reports stopped", (await pending).kind, "stopped");
    const late = await readRow(stopped);
    check("the late answer wrote no chip and moved no credit", [late.status, late.chips, late.unit], ["cancelled", null, "refunded"]);
    check("the late answer's bill landed on the ledger", (late.cost ?? 0) > 0, true);
    check("the refused second press holds no unit", await units(USER), before);

    check("a press reusing a settled read's id is refused as a reuse, not as in flight",
      (await store.startRead(USER, "again", INTAKE_MODEL, { readId: ok })).kind, "reused");

    console.log("\n5. The reaper frees a stranded read");
    const stranded = randomUUID();
    const past = new Date(Date.now() - INTAKE_REAPER_CUTOFF_MS - 60_000);
    const start = await store.startRead(USER, "stranded", INTAKE_MODEL, { readId: stranded, now: past });
    check("a read started past the cutoff is pending", [start.kind, (await readRow(stranded)).status], ["started", "pending"]);
    const next = randomUUID();
    check("the next press is not refused by it", (await run(next, async () => reply(["Dinosaurs"]))).kind, "read");
    const reaped = await readRow(stranded);
    check("the stranded read failed as interrupted, its unit refunded", [reaped.status, reaped.error_class, reaped.unit], ["failed", "interrupted", "refunded"]);

    console.log("\n6. A refused press still frees a stranded read");
    // Spend the rest of the day's allowance, strand a read, then press: the reservation is refused,
    // and the reap must not have been rolled back with it.
    while ((await run(randomUUID(), async () => reply(["Dinosaurs"]))).kind === "read") { /* spend a unit */ }
    const stranded2 = randomUUID();
    await fixture.execute(sql`insert into model_calls (user_id, feature, status, model, created_at)
      values (${USER}, 'intake', 'reserved', ${INTAKE_MODEL}, ${past}) returning id`);
    const [{ id: strandedCall }] = (await fixture.execute(sql`select id from model_calls where user_id = ${USER} and created_at = ${past} and status = 'reserved' limit 1`)).rows as { id: string }[];
    await fixture.execute(sql`insert into intake_reads (id, user_id, words_hash, model, model_call_id, status, created_at)
      values (${stranded2}, ${USER}, 'x', ${INTAKE_MODEL}, ${strandedCall}, 'pending', ${past})`);
    check("a settle carrying another player's id writes nothing to this one's read",
      [await store.settleRead({ readId: stranded2, callId: strandedCall, userId: OTHER }, { kind: "failed", errorClass: "timeout" }),
        (await readRow(stranded2)).status], [false, "pending"]);
    check("with the allowance spent, the press is refused", (await run(randomUUID(), async () => reply(["Dinosaurs"]))).kind, "allowance");
    const after = await readRow(stranded2);
    check("the stranded read was reaped all the same", [after.status, after.error_class, after.unit], ["failed", "interrupted", "refunded"]);

    console.log("\n7. One ask, one read, even in a race");
    // Another request holds the player's ask lock and settles a read of the same ask. A press that
    // starts meanwhile must wait for it and come back with that read, never reserve a second unit.
    const raceHash = store.wordsHash("the race", controls);
    const holder = await pool.connect();
    try {
      await holder.query("begin");
      await holder.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`intake-read:${OTHER}`]);
      const { rows: [call] } = await holder.query(
        "insert into model_calls (user_id, feature, status, model) values ($1, 'intake', 'spent', $2) returning id", [OTHER, INTAKE_MODEL]);
      await holder.query(
        "insert into intake_reads (user_id, words_hash, model, model_call_id, status, chips) values ($1, $2, $3, $4, 'ok', $5)",
        [OTHER, raceHash, INTAKE_MODEL, call.id, JSON.stringify({ chips: [], notUsed: [], notUnderstood: [] })]);
      const racing = store.startRead(OTHER, raceHash, INTAKE_MODEL, { readId: randomUUID() });
      await new Promise((r) => setTimeout(r, 1_500));
      await holder.query("commit");
      check("a press racing a settle of the same ask gets that read back", (await racing).kind, "stored");
      check("and holds no second unit", await units(OTHER), 1);

      // A Stop that arrives while a start is still inserting waits for it, and stops that read.
      const stopId = randomUUID();
      await holder.query("begin");
      await holder.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`intake-read:${OTHER}`]);
      const { rows: [unit] } = await holder.query(
        "insert into model_calls (user_id, feature, status, model) values ($1, 'intake', 'reserved', $2) returning id", [OTHER, INTAKE_MODEL]);
      await holder.query(
        "insert into intake_reads (id, user_id, words_hash, model, model_call_id, status) values ($1, $2, 'stop-race', $3, $4, 'pending')",
        [stopId, OTHER, INTAKE_MODEL, unit.id]);
      const stopping = store.cancelRead(stopId, OTHER);
      await new Promise((r) => setTimeout(r, 1_500));
      await holder.query("commit");
      check("a Stop racing a start waits for it, and stops that read", await stopping, true);
    } finally {
      holder.release();
    }
  } finally {
    await fixture.execute(sql`delete from intake_reads where user_id in (${USER}, ${OTHER})`);
    await fixture.execute(sql`delete from model_calls where user_id in (${USER}, ${OTHER})`);
    await pool.end();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
