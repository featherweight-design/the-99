// Find a deck read's store and press, proved against a real Postgres. The model is NEVER called:
// the read runs on its stub (`FITS_READ_LIVE` unset), which the ledger prices at nothing.
//
// What only a database can answer, and a test with a mocked store cannot:
//   startFitsRead: one unit reserved with the pending row; a second press for the same reader and
//     card is `in_flight` (the partial unique index) and reserves nothing.
//   finishFitsRead: the outcome and the unit in one transaction, spent or refunded; a write to a row
//     that is no longer pending changes nothing.
//   reapFitsReads: a pending read past FITS_READ_REAP_MS is failed and its unit refunded.
//   pressFitsRead end to end, on a real reader's decks: the stub's read is stored, shown as current,
//     and a second press is refused as `current` without reserving.
//
// It writes rows for a per-run probe user, and for `PROBE_FITS_USER` (default the local fixture
// account) in the end-to-end step, and deletes every row it wrote in a `finally`. It refuses staging
// and production by `neon.branch_id`: point `.env`'s DATABASE_URL at local-dev or a scratch branch.
//
//   pnpm probe:fits-read-state
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

process.env.FIND_A_DECK_READ_ENABLED = "true";
process.env.SWAP_TOOLS_ENABLED = "true";
delete process.env.FITS_READ_LIVE;
// `fitsReadLive` is also true in production, whatever FITS_READ_LIVE says: a probe never is.
(process.env as Record<string, string>).NODE_ENV = "development";

requireEnv(["DATABASE_URL"]);
const { sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const store = await import("../src/lib/swaps/fits-read-store");
const { fitsReadView } = await import("../src/lib/swaps/fits-read-state");
const { pressFitsRead, readFitsRead } = await import("../src/lib/swaps/fits-read-run");
const { STUB_MODEL } = await import("../src/lib/swaps/fits-read-stub");
const { FITS_READ_REAP_MS } = await import("../src/lib/swaps/fits-read-limits");

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const FIXTURE = process.env.PROBE_FITS_USER ?? "user_3HdjdocERCjunk0zJQFDWyHkTd4";
const PROBE = `probe-fits-read-${Date.now()}`;

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) failures += 1;
}
const unitStatus = async (callId: string) =>
  (await db.execute<{ status: string }>(sql`select status from model_calls where id = ${callId}::uuid`)).rows[0]?.status;

const readIds: string[] = [];
/** The fixture reader and card the end-to-end step presses, and the rows that existed before it:
 *  cleanup deletes every row for them that is not in this set, whatever the press threw. */
let e2e: { user: string; card: string; before: Set<string> } | null = null;
const { rows: [{ branch }] } = await db.execute<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
  throw new Error(`probe:fits-read-state refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`);
}

try {
  const { rows: [{ oracle_id: card }] } = await db.execute<{ oracle_id: string }>(sql`select oracle_id from cards order by oracle_id limit 1`);
  const now = new Date();

  // 1. Start, and a second press while it runs.
  const s1 = await store.startFitsRead(PROBE, card, { d: "h" }, STUB_MODEL, now);
  if (s1.kind !== "started") throw new Error(`start refused: ${s1.kind}`);
  readIds.push(s1.readId);
  check("a press reserves one unit with its pending row", await unitStatus(s1.callId), "reserved");
  check("a second press for the same card while one runs is in_flight", (await store.startFitsRead(PROBE, card, { d: "h" }, STUB_MODEL, now)).kind, "in_flight");
  const { rows: [{ n: units }] } = await db.execute<{ n: number }>(sql`select count(*)::int as n from model_calls where user_id = ${PROBE}`);
  check("and reserves nothing", units, 1);

  // 2. Settle it, spent.
  check("a read that held up settles", await store.finishFitsRead(s1, { status: "done", outcome: "picks", picks: [], refunded: false, returned: 1, drops: {} }), true);
  check("and spends its unit", await unitStatus(s1.callId), "spent");
  check("a second write to a settled read changes nothing", await store.finishFitsRead(s1, { status: "failed", errorClass: "timeout" }), false);
  // A press that passed its checks before the first one finished, starting after it: current, no unit.
  check("a start over hashes a done read already holds is current", (await store.startFitsRead(PROBE, card, { d: "h" }, STUB_MODEL, now)).kind, "current");
  const { rows: [{ n: unitsAfter }] } = await db.execute<{ n: number }>(sql`select count(*)::int as n from model_calls where user_id = ${PROBE}`);
  check("and reserves nothing", unitsAfter, 1);

  // 3. A failure refunds.
  const s2 = await store.startFitsRead(PROBE, card, { d: "h2" }, STUB_MODEL, new Date(now.getTime() + 1000));
  if (s2.kind !== "started") throw new Error(`start refused: ${s2.kind}`);
  readIds.push(s2.readId);
  await store.finishFitsRead(s2, { status: "failed", errorClass: "timeout" });
  check("a failure refunds its unit", await unitStatus(s2.callId), "refunded");

  // 4. An abandoned run is reaped.
  const old = new Date(now.getTime() - FITS_READ_REAP_MS - 60_000);
  const s3 = await store.startFitsRead(PROBE, card, { d: "h3" }, STUB_MODEL, old);
  if (s3.kind !== "started") throw new Error(`start refused: ${s3.kind}`);
  readIds.push(s3.readId);
  check("a pending read past the reap age is reaped", await store.reapFitsReads(PROBE, card, now), 1);
  check("and its unit refunded", await unitStatus(s3.callId), "refunded");

  // 5. The view over the real rows: the done read stands, the newer failure is reported beside it.
  const view = fitsReadView(await store.readFitsReadRows(PROBE, card), { d: "h" });
  check("the view keeps the done read as the stored read, current", [view.stored?.readId, view.stored?.current], [s1.readId, true]);
  check("and reports the newer failure", view.failed?.errorClass, "timeout");

  // 5b. A long run of failures after the done read never pushes it out of the panel.
  for (let i = 0; i < 12; i += 1) {
    const f = await store.startFitsRead(PROBE, card, { d: `f${i}` }, STUB_MODEL, new Date(now.getTime() + 2000 + i * 1000));
    if (f.kind !== "started") throw new Error(`start refused: ${f.kind}`);
    readIds.push(f.readId);
    await store.finishFitsRead(f, { status: "failed", errorClass: "upstream_busy" });
  }
  const after = fitsReadView(await store.readFitsReadRows(PROBE, card), { d: "h" });
  check("twelve failures later the stored read still stands", after.stored?.readId, s1.readId);

  // 6. End to end on a real reader's decks, through the stub.
  const { rows: [pick] } = await db.execute<{ oracle_id: string }>(sql`
    select c.oracle_id from cards c
    where c.name in ('Tangle Wire', 'Ajani Unrelenting', 'Throes of Chaos') and c.commander_legal
    order by c.name desc limit 1`);
  const { rows: existing } = await db.execute<{ id: string }>(sql`
    select id from fits_reads where user_id = ${FIXTURE} and oracle_id = ${pick.oracle_id}::uuid`);
  e2e = { user: FIXTURE, card: pick.oracle_id, before: new Set(existing.map((r) => r.id)) };
  const before = await readFitsRead(FIXTURE, pick.oracle_id, undefined, process.env);
  if (!before || before.candidates === 0) throw new Error(`${FIXTURE} has no candidate deck for the end-to-end card`);
  const pressed = await pressFitsRead(FIXTURE, pick.oracle_id, undefined, process.env);
  if (!pressed.ok) throw new Error(`press refused: ${pressed.reason}`);
  check("a press on real decks stores the read as current", [pressed.panel.view.stored?.outcome, pressed.panel.view.stored?.current], ["picks", true]);
  check("with the stub's picks, each with a cut", pressed.panel.view.stored?.picks.every((p) => p.cut !== null), true);
  check("a second press is refused as current, reserving nothing", await pressFitsRead(FIXTURE, pick.oracle_id, undefined, process.env), { ok: false, reason: "current" });
} finally {
  if (e2e) {
    const { rows } = await db.execute<{ id: string }>(sql`
      select id from fits_reads where user_id = ${e2e.user} and oracle_id = ${e2e.card}::uuid`);
    for (const r of rows) if (!e2e.before.has(r.id)) readIds.push(r.id);
  }
  if (readIds.length > 0) {
    const { rows } = await db.execute<{ model_call_id: string }>(sql`
      delete from fits_reads where id = any(${sql.param(readIds)}::uuid[]) returning model_call_id`);
    const calls = rows.map((r) => r.model_call_id);
    if (calls.length > 0) await db.execute(sql`delete from model_calls where id = any(${sql.param(calls)}::uuid[])`);
    console.log(`  cleaned up ${readIds.length} read(s)`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
process.exit(0);
