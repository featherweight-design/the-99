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
// Its own player, with its allowance untouched: a press refused for a spent allowance also reserves
// nothing, and would pass the early Stop's checks for the wrong reason.
const EARLY = `${USER}-early`;

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
  const extraUsers: string[] = [];
  try {
    const { deeperStatus, runDeeperRead } = await import("../src/lib/intake/deeper-read");
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
    check("under the stored read's own id, which the results page can verify", again.kind === "read" ? again.readId : null, ok);
    check("and reserves nothing", await units(USER), unitsBefore);

    console.log("\n2. Nothing valid came back: refunded (F4)");
    const nothing = randomUUID();
    check("the outcome says nothing held up", (await run(nothing, async () => reply(["Pirates"]))).kind, "nothing");
    const nothingRow = await readRow(nothing);
    check("the read failed as nothing_valid, its unit refunded", [nothingRow.status, nothingRow.error_class, nothingRow.unit], ["failed", "nothing_valid", "refunded"]);
    check("a refund still records what the call burned", (nothingRow.cost ?? 0) > 0, true);
    // Its answer stands for the ask: the same words again never call the model a second time.
    const callsBefore = Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${USER}`)).rows[0] as { n: number }).n);
    let askedAgain = false;
    const repeat = await run(randomUUID(), async () => { askedAgain = true; return reply(["Dinosaurs"]); }, `big dumb lizards ${nothing}`);
    check("the same ask again gets that outcome back, under its own id, and never asks", [repeat.kind, repeat.kind === "nothing" ? repeat.readId : null, askedAgain], ["nothing", nothing, false]);
    check("and reserves nothing at all", Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${USER}`)).rows[0] as { n: number }).n), callsBefore);

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
    // That refused press waits on this read by asking where its own ask stands (close-out gap 6).
    const waiting = { words: "a different ask entirely", controls };
    check("the waiting press reads the other look as running", (await deeperStatus(USER, waiting)).kind, "running");
    // Another reader's Stop by this id is a stop for THEIR press, if they have one; this read stays.
    await store.cancelRead(stopped, OTHER);
    check("another reader's Stop cancels nothing", [(await readRow(stopped)).status, (await readRow(stopped)).unit], ["pending", "reserved"]);
    check("the reader's Stop cancels it", await store.cancelRead(stopped, USER), true);
    const mid = await readRow(stopped);
    check("the read is cancelled, its unit refunded, no bill yet", [mid.status, mid.unit, mid.cost], ["cancelled", "refunded", null]);
    release();
    check("the late answer reports stopped", (await pending).kind, "stopped");
    const late = await readRow(stopped);
    check("the late answer wrote no chip and moved no credit", [late.status, late.chips, late.unit], ["cancelled", null, "refunded"]);
    check("the late answer's bill landed on the ledger", (late.cost ?? 0) > 0, true);
    check("the refused second press holds no unit", await units(USER), before);
    check("once that look is over without answering its ask, the waiting press reads idle", (await deeperStatus(USER, waiting)).kind, "idle");
    const answered = await deeperStatus(USER, { words: `big dumb lizards ${ok}`, controls });
    check("and an ask already read reads as that read, under its own id",
      [answered.kind, answered.kind === "read" ? answered.readId : null], ["read", ok]);
    check("asking reserves nothing", await units(USER), before);

    check("a press reusing a settled read's id is refused as a reuse, not as in flight",
      (await store.startRead(USER, "again", INTAKE_MODEL, { readId: ok })).kind, "reused");

    console.log("\n4b. A settle landing between a waiting press's two reads");
    // The waiting press reads "is this ask stored?" then "is anything pending?". A settle committing
    // between the two must not read as idle, which would drop the answer the press waited for.
    const racing = randomUUID();
    const racingWords = `big dumb lizards ${racing}`;
    let letGo!: () => void;
    const hold = new Promise<void>((r) => { letGo = r; });
    let calledIn!: () => void;
    const calling = new Promise<void>((r) => { calledIn = r; });
    const settling = run(racing, async () => { calledIn(); await hold; return reply(["Dinosaurs"]); }, racingWords);
    await calling;
    const raced = await store.readStatus(USER, store.wordsHash(racingWords, controls), new Date(), async () => {
      letGo();
      await settling;
    });
    check("a settle committing between the reads leaves the snapshot reading it as running, never idle", raced.kind, "running");
    check("and the next ask finds the stored read", (await store.readStatus(USER, store.wordsHash(racingWords, controls))).kind, "stored");

    console.log("\n5. The reaper frees a stranded read");
    const stranded = randomUUID();
    const past = new Date(Date.now() - INTAKE_REAPER_CUTOFF_MS - 60_000);
    const start = await store.startRead(USER, "stranded", INTAKE_MODEL, { readId: stranded, now: past });
    check("a read started past the cutoff is pending", [start.kind, (await readRow(stranded)).status], ["started", "pending"]);
    check("but a waiting press does not read it as running: nothing will settle it", (await deeperStatus(USER, { words: "a stranded wait", controls })).kind, "idle");
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

    console.log("\n9. An early Stop is never charged (PR 6)");
    // The panel chooses the id before its press, so its Stop can reach the database before the
    // start has even taken the lock. It must still win: the press that follows reserves nothing.
    const earlyId = randomUUID();
    const unitsEarly = await units(EARLY);
    check("a Stop for a read not yet started is taken", await store.cancelRead(earlyId, EARLY), true);
    let earlyAsked = false;
    const afterStop = await runDeeperRead(EARLY, { readId: earlyId, words: `big dumb lizards ${earlyId}`, controls }, deps(async () => { earlyAsked = true; return reply(["Dinosaurs"]); }));
    check("the press that follows it stops before anything is reserved", afterStop.kind, "stopped");
    check("and never asks", earlyAsked, false);
    check("so no unit is reserved, let alone spent", await units(EARLY), unitsEarly);
    const rowsFor = async (id: string) =>
      Number(((await fixture.execute(sql`select count(*)::int as n from intake_reads where id = ${id}`)).rows[0] as { n: number }).n);
    check("and no read is written", await rowsFor(earlyId), 0);
    const stopsFor = async (id: string) =>
      Number(((await fixture.execute(sql`select count(*)::int as n from intake_read_stops where read_id = ${id}`)).rows[0] as { n: number }).n);
    check("a Stop for a read that already settled is refused, and leaves nothing behind", [await store.cancelRead(ok, USER), await stopsFor(ok)], [false, 0]);
    // A stop is scoped to the player who left it: another player's press with that id is not
    // stopped by it. (Whether that press then starts turns on its own allowance, not on this.)
    const shared = randomUUID();
    await store.cancelRead(shared, EARLY);
    const theirs = await store.startRead(OTHER, store.wordsHash("someone else's stop", controls), INTAKE_MODEL, { readId: shared });
    if (theirs.kind === "started") await store.cancelRead(theirs.readId, OTHER);
    check("an early Stop names only its own player's press", theirs.kind !== "stopped", true);
    // The id is the client's, so two players can name one: each player's stop must stand for their
    // own press. Keyed by id alone, the second insert met the first and did nothing, the Stop still
    // reported it took, and that player's start reserved a unit.
    const both = randomUUID();
    await store.cancelRead(both, OTHER);
    const unitsBoth = await units(EARLY);
    check("a Stop is taken even when another player's stop names the same id", await store.cancelRead(both, EARLY), true);
    const mine = await store.startRead(EARLY, store.wordsHash(`both ${both}`, controls), INTAKE_MODEL, { readId: both });
    check("and that player's press is still refused, reserving nothing", [mine.kind, await units(EARLY)], ["stopped", unitsBoth]);
    // Another player's READ with the id says nothing about this press either: the Stop's own
    // existence check is this player's, as every other step of it is.
    const theirRead = randomUUID();
    const started = await store.startRead(OTHER, store.wordsHash(`their read ${theirRead}`, controls), INTAKE_MODEL, { readId: theirRead });
    if (started.kind === "started") await store.cancelRead(theirRead, OTHER);
    check("a Stop is taken though another player's read has that id", await store.cancelRead(theirRead, EARLY), true);
    const mineToo = await store.startRead(EARLY, store.wordsHash(`their read, mine ${theirRead}`, controls), INTAKE_MODEL, { readId: theirRead });
    check("and this player's press with it is refused", mineToo.kind, "stopped");
    // A stop its press claimed is consumed, so the cap counts only stops no press ever claimed:
    // a player who Stops early more times than the cap in a day is still never charged.
    check("the stop its press claimed is consumed", await stopsFor(earlyId), 0);
    const CYCLER = `probe-cycle-${randomUUID()}`;
    extraUsers.push(CYCLER);
    let cyclesTaken = 0;
    for (let i = 0; i <= store.EARLY_STOPS_MAX; i += 1) {
      const id = randomUUID();
      const took = await store.cancelRead(id, CYCLER);
      const press = await store.startRead(CYCLER, store.wordsHash(`cycle ${id}`, controls), INTAKE_MODEL, { readId: id });
      if (took && press.kind === "stopped") cyclesTaken += 1;
    }
    check("more early Stops than the cap, each claimed by its press, all take", cyclesTaken, store.EARLY_STOPS_MAX + 1);
    // Bounded per player: the route takes any id a signed-in caller sends, so a caller minting ids
    // stops at the cap rather than growing the table.
    const CAPPED = `probe-cap-${randomUUID()}`;
    extraUsers.push(CAPPED);
    await fixture.execute(sql`insert into intake_read_stops (read_id, user_id)
      select gen_random_uuid(), ${CAPPED} from generate_series(1, ${store.EARLY_STOPS_MAX})`);
    const overCap = randomUUID();
    check("a Stop past the per-player cap is not taken, and records nothing", [await store.cancelRead(overCap, CAPPED), await stopsFor(overCap)], [false, 0]);
    // Purged at the Stop as well: a player who never starts another look leaves none behind.
    const stale = randomUUID();
    await fixture.execute(sql`insert into intake_read_stops (read_id, user_id, created_at) values (${stale}, ${EARLY}, now() - interval '25 hours')`);
    await store.cancelRead(randomUUID(), EARLY);
    check("a Stop purges that player's stops past keeping", await stopsFor(stale), 0);
  } finally {
    await fixture.execute(sql`delete from intake_read_stops where user_id in (${USER}, ${OTHER}, ${EARLY})`);
    // The per-case fixture players, registered before their first write so a throw cannot strand them.
    for (const id of extraUsers) {
      await fixture.execute(sql`delete from intake_read_stops where user_id = ${id}`);
      await fixture.execute(sql`delete from intake_reads where user_id = ${id}`);
      await fixture.execute(sql`delete from model_calls where user_id = ${id}`);
    }
    await fixture.execute(sql`delete from intake_reads where user_id in (${USER}, ${OTHER}, ${EARLY})`);
    await fixture.execute(sql`delete from model_calls where user_id in (${USER}, ${OTHER}, ${EARLY})`);
    await pool.end();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
