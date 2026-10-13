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
      return runTheRead(USER, { readId: current, words: "scary horrors", filters }, d, inputs(fingerprint));
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

    // ---- hardening: nothing is read for a press that cannot be served -------------------------
    const { beginTheRead } = await import("../src/lib/intake/the-read-run");
    const SPENT = `${USER}-spent`;
    // A loader the probe can count and slow, so presses overlap inside the pool read.
    const counted = (fingerprint: string, holdMs = 0) => {
      const loader = Object.assign(async () => { loader.calls += 1; if (holdMs) await new Promise((r) => setTimeout(r, holdMs)); return inputs(fingerprint); }, { calls: 0 });
      return loader;
    };
    const begin = (user: string, loader: ReturnType<typeof counted>, d = deps(pick)) =>
      beginTheRead(user, { readId: randomUUID(), words: "scary horrors", filters }, d, loader);

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

    console.log("\n5. A player with no credit left reads no pool");
    for (let i = 0; i < 5; i++) {
      await fixture.execute(sql`insert into model_calls (user_id, feature, model, origin, status) values (${SPENT}, 'intake', 'stub', 'player', 'spent')`);
    }
    const spentLoader = counted("fp-spent");
    const spentUnits = Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${SPENT}`)).rows[0] as { n: number }).n);
    check("the press is refused for the allowance, and the pool was never read", [(await begin(SPENT, spentLoader)).kind, spentLoader.calls], ["allowance", 0]);
    check("and no read or reservation was written", [
      Number(((await fixture.execute(sql`select count(*)::int as n from intake_reads where user_id = ${SPENT}`)).rows[0] as { n: number }).n),
      Number(((await fixture.execute(sql`select count(*)::int as n from model_calls where user_id = ${SPENT}`)).rows[0] as { n: number }).n),
    ], [0, spentUnits]);

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
