// Help me choose's two-step read (rework plan PR 1), proved against a real Postgres by calling the
// real `runTheRead`, `startRead`, `setReadPhase` and `settleTheRead`.
//
// WHAT ONLY A DATABASE CAN ANSWER. The runner's branches are unit tested with the store mocked;
// what those tests cannot see is what the read WROTE:
//  - a read with a pick is `ok`, stores its picks in `result`, clears its phase, SPENDS its unit,
//    and records BOTH calls' bills on the one ledger row, each priced on its own model;
//  - while a call runs, the row names its phase, so the waiting panel can read it (F2);
//  - the same ask again is answered from the store under the read's own id, reserving nothing;
//  - a read that finds nothing is refunded, and still records what its calls burned.
// There is no Stop (removed 2026-10-12): a read always runs to its end.
//
// THE MODELS ARE INJECTED AND SPEND NOTHING; the usages they report are made up and priced at the
// real models' rates, so the cost column has something to show. The commander list is a fixture,
// so no catalog is read.
//
//   PROBE_TARGET_URL=<local-dev or a scratch branch> pnpm probe:the-read
//
// The target must already carry migration 0090 (`intake_reads.phase` and `result`).
import "./lib/env.mjs";
import { randomUUID } from "node:crypto";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { READ_JUDGE_MODEL, READ_SHORTLIST_MODEL } from "../src/lib/intake/limits";
import type { JudgeReply, ShortlistReply } from "../src/lib/intake/the-read";
import type { ModelOutcome } from "../src/lib/model/client";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.PROBE_TARGET_URL;
if (!DATABASE_URL) throw new Error("PROBE_TARGET_URL is not set: name local-dev or a scratch branch");
process.env.DATABASE_URL = DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-the-read-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
async function refuseSharedDatabase() {
  const [r] = (await fixture.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string | null }[];
  const branch = r?.branch ?? null;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    await pool.end();
    throw new Error(`probe:the-read writes fixture rows and refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
}

const shortUsage = { inputTokens: 2_000, outputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 140_000 };
const judgeUsage = { inputTokens: 9_000, outputTokens: 2_500, cacheReadTokens: 0, cacheWriteTokens: 0 };
const commander = (id: string, name: string) => ({ oracleId: id, name, colorIdentity: ["B"], typeLine: "Legendary Creature — Horror", tags: [] });

type Row = { status: string; error_class: string | null; phase: string | null; result: unknown; unit: string; model: string; cost: number | null };
async function readRow(readId: string): Promise<Row> {
  const [r] = (await fixture.execute(sql`
    select r.status, r.error_class, r.phase, r.result, m.status as unit, m.model, m.cost_micro_usd as cost
    from intake_reads r join model_calls m on m.id = r.model_call_id where r.id = ${readId}`)).rows as Row[];
  return r;
}
const units = async () => Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${USER}`)).rows[0] as { n: number }).n);

async function main() {
  await refuseSharedDatabase();
  try {
    const { runTheRead } = await import("../src/lib/intake/the-read-run");
    // Imported here, not at the top: both import `src/db`, which must see the target first.
    const { joinBilled } = await import("../src/lib/model/allowance");
    const { formatPoolList } = await import("../src/lib/intake/pool-list");
    // Real commanders are not needed: the judgement's candidates come from the database, so the
    // list names two real-shaped ids the probe never asks the database about, and the judgement
    // reads none. `loadJudgeCandidates` is exercised by the eval against staging.
    const list = formatPoolList([commander(randomUUID(), "Alpha"), commander(randomUUID(), "Beta")], "probe");
    const inputs = (fingerprint: string) => ({ list, pool: new Set([1, 2]), narrowed: false, decks: [], cards: [], collection: "", fingerprint });
    const filters = { colors: [], match: "contains" as const, themes: [], budgetDollars: null, bracket: null };
    let phaseSeen: string | null = null;
    const deps = (judge: () => Promise<ModelOutcome<JudgeReply>>, onShortlist?: (readId: string) => Promise<void>) => ({
      modelName: `${READ_SHORTLIST_MODEL}+${READ_JUDGE_MODEL}`,
      shortlistModel: READ_SHORTLIST_MODEL,
      judgeModel: READ_JUDGE_MODEL,
      shortlist: async (): Promise<ModelOutcome<ShortlistReply>> => {
        await onShortlist?.(current);
        return { ok: true, value: { keys: [2, 1] }, usage: shortUsage };
      },
      judge: async () => judge(),
      now: () => Date.now(),
    });
    let current = "";
    const press = (fingerprint: string, d: ReturnType<typeof deps>) => {
      current = randomUUID();
      return runTheRead(USER, { readId: current, words: "scary horrors", filters, env: process.env, ask: "w=scary+horrors&v=results" }, d, inputs(fingerprint));
    };
    const pick = async (): Promise<ModelOutcome<JudgeReply>> => ({ ok: true, value: { picks: [{ key: 2, reason: "Its horrors drain every opponent." }] }, usage: judgeUsage });

    console.log("\n1. A read with a pick spends, stores its picks and bills both calls");
    const watch = async (readId: string) => { phaseSeen = (await readRow(readId)).phase; };
    const out = await press("fp-pick", deps(pick, watch));
    const row = await readRow(current);
    check("the outcome is the read", [out.kind, out.kind === "read" ? out.repeat : null], ["read", false]);
    check("while the shortlist ran, the row named its phase", phaseSeen, "shortlist");
    // jsonb keeps keys in its own order, so the pick is compared field by field.
    const stored = (row.result as { picks: { oracleId: string; reason: unknown }[] } | null)?.picks ?? [];
    check("the read is ok, its phase cleared", [row.status, row.phase], ["ok", null]);
    check("its picks are stored, by oracle id, with the reason's parts", stored.map((p) => [p.oracleId, p.reason]), [[list.idOf.get(2), [{ text: "Its horrors drain every opponent." }]]]);
    check("its unit is spent", row.unit, "spent");
    check("the ask it was made from is stored on the row", ((await fixture.execute(sql`select ask from intake_reads where id = ${current}`)).rows[0] as { ask: string | null }).ask, "w=scary+horrors&v=results");
    const both = joinBilled([{ model: READ_SHORTLIST_MODEL, usage: shortUsage }, { model: READ_JUDGE_MODEL, usage: judgeUsage }]);
    // `cost_micro_usd` is a bigint, which the driver returns as a string.
    check("both calls' bills are on the one row, each priced on its own model", [row.model, Number(row.cost)], [both.model, both.costMicroUsd]);

    console.log("\n2. The same ask again is answered from the store");
    const before = await units();
    const again = await press("fp-pick", deps(pick));
    check("it is the stored read, a repeat, under the first read's id", [again.kind, again.kind === "read" ? again.repeat : null], ["read", true]);
    check("and reserves nothing", await units(), before);

    console.log("\n3. A read that finds nothing is refunded and still billed");
    await press("fp-nothing", deps(async () => ({ ok: true, value: { picks: [{ key: 1, reason: "Makes 3 tokens." }] }, usage: judgeUsage })));
    const nothing = await readRow(current);
    check("it failed as nothing_valid, its unit refunded", [nothing.status, nothing.error_class, nothing.unit], ["failed", "nothing_valid", "refunded"]);
    check("its calls' cost is recorded", (nothing.cost ?? 0) > 0, true);

    // ---- hardening: one press at a time, a free repeat, and a limit a burst cannot pass ----------
    const { beginTheRead } = await import("../src/lib/intake/the-read-run");
    const SPENT = `${USER}-spent`;
    // A loader the probe can count and slow, so presses overlap inside the pool read.
    const counted = (fingerprint: string, holdMs = 0) => {
      const loader = Object.assign(async () => { loader.calls += 1; if (holdMs) await new Promise((r) => setTimeout(r, holdMs)); return inputs(fingerprint); }, { calls: 0 });
      return loader;
    };
    const begin = (user: string, loader: ReturnType<typeof counted>, d = deps(pick)) =>
      beginTheRead(user, { readId: randomUUID(), words: "scary horrors", filters, env: process.env }, d, loader);

    console.log("\n4. A burst of presses by one player reads the pool once");
    const burstLoader = counted("fp-burst", 500);
    const unitsBefore = await units();
    const burst = await Promise.all(Array.from({ length: 8 }, () => begin(USER, burstLoader)));
    const kinds = burst.map((b) => b.kind).sort();
    check("exactly one press was admitted; the other seven were told a read is in flight", kinds, ["in_flight", "in_flight", "in_flight", "in_flight", "in_flight", "in_flight", "in_flight", "started"]);
    check("the pool was read ONCE for the eight presses", burstLoader.calls, 1);
    check("one credit was reserved", (await units()) - unitsBefore, 1);
    // The admission is released once the winner has reserved: a later press meets the pending read.
    const lateLoader = counted("fp-late");
    check("a press after it, while the read runs, is refused without reading the pool", [(await begin(USER, lateLoader)).kind, lateLoader.calls], ["in_flight", 0]);
    const winner = burst.find((b) => b.kind === "started");
    if (winner && winner.kind === "started") await winner.finish();
    check("the admitted read settled", (await readRow(winner && winner.kind === "started" ? winner.readId : "")).status, "ok");

    console.log("\n5. A player with no credit left: a repeat is free, a fresh ask is refused at the reservation");
    // Hugh, 2026-10-14: a repeat of the same read is free. The player reads once while they have
    // credit, spends the rest of the allowance, and asks the same thing again.
    const spentCount = async () => Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${SPENT}`)).rows[0] as { n: number }).n);
    const first = await begin(SPENT, counted("fp-spent"));
    if (first.kind === "started") await first.finish();
    check("the first ask was read and settled", first.kind === "started" ? (await readRow(first.readId)).status : first.kind, "ok");
    for (let i = 0; i < 4; i++) {
      await fixture.execute(sql`insert into model_calls (user_id, feature, model, origin, status) values (${SPENT}, 'intake', 'stub', 'player', 'spent')`);
    }
    const spentUnits = await spentCount();
    const repeatLoader = counted("fp-spent");
    const repeat = await begin(SPENT, repeatLoader);
    check("the same ask again is answered from the store, with the allowance spent", [repeat.kind, "repeat" in repeat ? repeat.repeat : null], ["read", true]);
    check("and reserves nothing", await spentCount(), spentUnits);
    const freshLoader = counted("fp-spent-fresh");
    check("a fresh ask is refused for the allowance at the reservation", (await begin(SPENT, freshLoader)).kind, "allowance");
    check("it read the pool (the only way to its fingerprint) and wrote no read or reservation", [
      freshLoader.calls,
      Number(((await fixture.execute(sql`select count(*)::int as n from intake_reads where user_id = ${SPENT}`)).rows[0] as { n: number }).n),
      await spentCount(),
    ], [1, 1, spentUnits]);

    console.log("\n5b. A burst at the last credit charges once and never passes the limit");
    const LAST = `${USER}-last`;
    for (let i = 0; i < 4; i++) {
      await fixture.execute(sql`insert into model_calls (user_id, feature, model, origin, status) values (${LAST}, 'intake', 'stub', 'player', 'spent')`);
    }
    // Eight presses at once, each a DIFFERENT ask, so no stored answer and no shared fingerprint helps.
    const lastBurst = await Promise.all(Array.from({ length: 8 }, (_, i) => begin(LAST, counted(`fp-last-${i}`, 200))));
    const lastKinds = lastBurst.map((b) => b.kind);
    check("one press started; none was charged beyond it", [lastKinds.filter((k) => k === "started").length, lastKinds.filter((k) => k !== "started" && k !== "in_flight" && k !== "allowance").length], [1, 0]);
    check("the player holds exactly the five-credit limit", Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${LAST} and status in ('reserved','spent')`)).rows[0] as { n: number }).n), 5);
    const lastWinner = lastBurst.find((b) => b.kind === "started");
    if (lastWinner && lastWinner.kind === "started") await lastWinner.finish();
    check("and a press after it settles is refused for the allowance", (await begin(LAST, counted("fp-last-after"))).kind, "allowance");

    console.log("\n6. A press that fails in the pool read does not keep the admission");
    const failing = Object.assign(async () => { failing.calls += 1; throw new Error("pool read failed"); }, { calls: 0 });
    // Settle the earlier reads first: only a pending read may refuse a press now.
    const failedPress = await begin(USER, failing as never).then(() => "returned", (e: Error) => e.message);
    check("the failure reaches the caller", failedPress, "pool read failed");
    const afterFail = counted("fp-after-fail");
    check("the next press is admitted and reads the pool", [(await begin(USER, afterFail)).kind, afterFail.calls], ["started", 1]);

    console.log("\n7. A credit held by an abandoned read does not refuse the press that would reap it");
    const STRANDED = `${USER}-stranded`;
    for (let i = 0; i < 4; i++) {
      await fixture.execute(sql`insert into model_calls (user_id, feature, model, origin, status) values (${STRANDED}, 'intake', 'stub', 'player', 'spent')`);
    }
    // The fifth credit is reserved by a read whose process died seven minutes ago: past the reaper's five-minute cutoff and inside the reservation's ten, so its credit still counts.
    const [held] = (await fixture.execute(sql`insert into model_calls (user_id, feature, model, origin, status, created_at) values (${STRANDED}, 'intake', 'stub', 'player', 'reserved', now() - interval '7 minutes') returning id`)).rows as { id: string }[];
    await fixture.execute(sql`insert into intake_reads (user_id, words_hash, model, model_call_id, status, created_at) values (${STRANDED}, 'stranded', 'stub', ${held.id}, 'pending', now() - interval '7 minutes')`);
    const strandedLoader = counted("fp-stranded");
    const strandedPress = await begin(STRANDED, strandedLoader);
    check("the abandoned read is reaped and the press is admitted, reading the pool once", [strandedPress.kind, strandedLoader.calls], ["started", 1]);
    check("the abandoned read failed as interrupted, its credit refunded", (await fixture.execute(sql`select r.status, r.error_class, m.status as unit from intake_reads r join model_calls m on m.id = r.model_call_id where r.words_hash = 'stranded' and r.user_id = ${STRANDED}`)).rows[0], { status: "failed", error_class: "interrupted", unit: "refunded" });

    console.log("\n8. History lists the player's own runs from the stored ask, and no one else's");
    const { loadChooseHistory, hasListableRun } = await import("../src/lib/intake/history-read");
    const HIST = `${USER}-history`;
    const OTHER = `${USER}-history-other`;
    const unit = async (user: string, status: string) => ((await fixture.execute(sql`insert into model_calls (user_id, feature, model, origin, status) values (${user}, 'intake', 'stub', 'player', ${status}) returning id`)).rows[0] as { id: string }).id;
    const result = JSON.stringify({ picks: [1, 2, 3, 4].map((n) => ({ oracleId: randomUUID(), reason: [{ text: `Reason ${n}` }] })), pool: 164, weighed: 9 });
    const at = (minutesAgo: number) => sql`now() - ${`${minutesAgo} minutes`}::interval`;
    const insertRun = async (user: string, o: { status: string; error?: string; ask: string | null; res?: string | null; ago: number }) => {
      const id = randomUUID();
      await fixture.execute(sql`insert into intake_reads (id, user_id, words_hash, model, model_call_id, status, error_class, ask, result, created_at)
        values (${id}, ${user}, ${`h-${id}`}, 'stub', ${await unit(user, o.status === "ok" ? "spent" : o.status === "pending" ? "reserved" : "refunded")}, ${o.status}, ${o.error ?? null}, ${o.ask}, ${o.res ?? null}::jsonb, ${at(o.ago)})`);
      return id;
    };
    const ok1 = await insertRun(HIST, { status: "ok", ask: "w=scary+horrors&v=results", res: result, ago: 60 });
    const none = await insertRun(HIST, { status: "failed", error: "nothing_valid", ask: "w=a+deck+of+nothing&v=results", res: JSON.stringify({ picks: [], pool: 3445, weighed: 0 }), ago: 50 });
    await insertRun(HIST, { status: "ok", ask: null, res: result, ago: 40 });
    await insertRun(HIST, { status: "failed", error: "timeout", ask: "w=timed+out&v=results", ago: 30 });
    const ok2 = await insertRun(HIST, { status: "ok", ask: "w=third&v=results", res: result, ago: 20 });
    await insertRun(OTHER, { status: "ok", ask: "w=someone+else&v=results", res: result, ago: 10 });
    const all = await loadChooseHistory(HIST);
    check("it lists the answered runs and the one that found nothing, newest first", all.rows.map((r) => [r.id, r.state]), [[ok2, "ok"], [none, "nothing"], [ok1, "ok"]]);
    check("a run with no stored ask, a failed read and another player's run are not listed", all.rows.map((r) => r.words), ["third", "a deck of nothing", "scary horrors"]);
    check("a row carries its pick count, its first three picks and its stored pool", [all.rows[0].picks, all.rows[0].thumbs.length, all.rows[0].pool], [4, 3, 164]);
    check("a run that found nothing keeps its stored pool and shows no picks", [all.rows[1].picks, all.rows[1].pool], [0, 3445]);
    check("its link is the ask, the run's id and the past-run mark", all.rows[2].href, `/decks/new/choose?w=scary+horrors&v=results&r=${ok1}&h=1`);
    const p1 = await loadChooseHistory(HIST, { limit: 2 });
    const p2 = await loadChooseHistory(HIST, { limit: 2, cursor: p1.nextCursor });
    check("the keyset pages with no row twice and none dropped", [p1.rows.length, p1.nextCursor !== null, p2.rows.length, p2.nextCursor], [2, true, 1, null]);
    check("the door's question is yes for a player with a run and no for one with none", [await hasListableRun(HIST), await hasListableRun(`${USER}-nobody`)], [true, false]);
    const stale = await insertRun(HIST, { status: "pending", ask: "w=abandoned&v=results", ago: 7 });
    const afterReap = await loadChooseHistory(HIST);
    check("a run abandoned past the reaper's cutoff is reaped, its credit returned, and never listed as reading", [afterReap.rows.some((r) => r.id === stale), (await readRow(stale)).unit], [false, "refunded"]);
    const live = await insertRun(HIST, { status: "pending", ask: "w=in+flight&v=results", ago: 1 });
    check("a run in flight is listed on top as reading", [(await loadChooseHistory(HIST)).rows[0]].map((r) => [r.id, r.state, r.picks]), [[live, "reading", 0]]);
  } finally {
    await fixture.execute(sql`delete from intake_reads where user_id like ${`${USER}%`}`);
    await fixture.execute(sql`delete from model_calls where user_id like ${`${USER}%`}`);
    await pool.end();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
