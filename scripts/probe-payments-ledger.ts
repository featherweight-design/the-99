// PAID CREDITS in the allowance ledger (payments plan, PR L), proved against a real Postgres by
// calling the real `reserveModelCall`, `settleModelCall`, `readAllowance` and `purgeAccount`.
//
// The arithmetic (what a lot has left, which lot goes first) is unit tested in `credit-rule.test.ts`;
// only a database can say the SQL around it reads the right rows, and only concurrent transactions
// can say the per-player lock covers the paid lots. The model is never called.
//
// Cases:
//   a  with no lot, the free allowance's five reserve and the sixth is refused, as before payments;
//      readAllowance carries no plan or pack figure
//   b  the allowance goes first: with a pack of two, five allowance runs name no lot, the next two
//      name the pack, the eighth is refused
//   c  plan before pack: an older pack and a newer plan lot, the plan lot is spent first
//   d  a refunded run returns its credit to the lot that funded it
//   e  a reservation stranded past its TTL returns its credit; a late success on it is refunded
//   f  an expired plan lot is skipped; a revoked one is spent only to its unrevoked units
//   g  two concurrent presses at a balance of one: exactly one reserves
//   h  readAllowance reports what each source has left
//   i  the purge removes the account's lots and the runs that named them, with no FK refusal
//   j  a paid run never counts toward the free window
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run,
// restored by copying back), and each fails it:
//   - the window's `credit_grant_id is null` filter removed (`ledgerRows`): fails j.
//   - the per-player lock removed (`reserveModelCall`): fails g.
//   - `pickGrant` ordering pack before plan: fails c and h.
//   - a refunded run read as spend (`grantBalances` counting every row it reads, refunded included):
//     fails d.
//
// It writes `model_calls` and `credit_grants` rows under per-run `user_id`s and deletes them in a
// `finally`, so it fails closed: `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and
// staging and production are refused by id. Point it at a scratch branch or local-dev.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:payments-ledger
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { readAllowance, reserveModelCall, settleModelCall } from "../src/lib/model/allowance";
import { MODEL_FRIEND_DAILY_ALLOWANCE, RESERVATION_TTL_MS } from "../src/lib/model/allowance-rule";
import { purgeAccount } from "../src/lib/account/purge";
import { TUNING_MODEL } from "../src/lib/tuning/limits";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const PREFIX = `probe-payments-ledger-${Date.now()}`;
let users = 0;
const made: string[] = [];
const newUser = () => { const u = `${PREFIX}-${++users}`; made.push(u); return u; };

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

type Got = { id: string } | { refused: string };
const reserve = (userId: string, now = new Date()) =>
  db.transaction((tx) => reserveModelCall(tx, userId, "tuning", TUNING_MODEL, now));
const kindOf = (r: Got) => ("refused" in r ? r.refused : "reserved");
const idOf = (r: Got) => ("id" in r ? r.id : null);
const fundedBy = async (r: Got): Promise<string | null> => {
  const id = idOf(r);
  if (!id) return "refused";
  const [row] = await rows<{ g: string | null }>(sql`select credit_grant_id::text as g from model_calls where id = ${id}::uuid`);
  return row.g;
};

/** The free allowance used up, by seeding spent rows that name no lot. */
async function spendAllowance(userId: string) {
  for (let i = 0; i < MODEL_FRIEND_DAILY_ALLOWANCE; i++) {
    await fixture.execute(sql`insert into model_calls (user_id, feature, status, model) values (${userId}, 'tuning', 'spent', ${TUNING_MODEL})`);
  }
}

async function grant(userId: string, source: "plan" | "pack", units: number, opts: { createdAt?: Date; expiresAt?: Date; revoked?: number } = {}) {
  const [row] = await rows<{ id: string }>(sql`
    insert into credit_grants (user_id, source, units, revoked_units, expires_at, created_at)
    values (${userId}, ${source}, ${units}, ${opts.revoked ?? 0},
      ${opts.expiresAt ? opts.expiresAt.toISOString() : null}::timestamp,
      ${(opts.createdAt ?? new Date()).toISOString()}::timestamp)
    returning id::text as id`);
  return row.id;
}

async function cleanup() {
  for (const u of made) {
    await fixture.execute(sql`delete from model_call_parts where call_id in (select id from model_calls where user_id = ${u})`);
    await fixture.execute(sql`delete from model_calls where user_id = ${u}`);
    await fixture.execute(sql`delete from credit_grants where user_id = ${u}`);
  }
}

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes the ledger. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  delete process.env.MODEL_OWNER_USER_ID;

  // a · No lot: exactly as before payments.
  {
    const u = newUser();
    const got = [];
    for (let i = 0; i < 6; i++) got.push(kindOf(await reserve(u)));
    check("a · five reserve and the sixth is refused", got, ["reserved", "reserved", "reserved", "reserved", "reserved", "allowance"]);
    const a = await readAllowance(u);
    check("a · readAllowance carries no paid figure", ["plan" in a, "pack" in a], [false, false]);
  }

  // b · The allowance first, then the pack.
  {
    const u = newUser();
    const pack = await grant(u, "pack", 2);
    const funded = [];
    for (let i = 0; i < 8; i++) funded.push(await fundedBy(await reserve(u)));
    check("b · five allowance runs name no lot", funded.slice(0, 5), [null, null, null, null, null]);
    check("b · the next two name the pack", funded.slice(5, 7), [pack, pack]);
    check("b · the eighth is refused", funded[7], "refused");
  }

  // c · Plan before pack, even an older pack.
  {
    const u = newUser();
    await spendAllowance(u);
    await grant(u, "pack", 5, { createdAt: new Date(Date.now() - 30 * 86_400_000) });
    const plan = await grant(u, "plan", 5);
    check("c · the plan lot is spent before an older pack", await fundedBy(await reserve(u)), plan);
  }

  // d · A refunded run returns its credit to its lot.
  {
    const u = newUser();
    await spendAllowance(u);
    const pack = await grant(u, "pack", 1);
    const first = await reserve(u);
    check("d · the pack funds the run", await fundedBy(first), pack);
    check("d · a second press is refused while it is in flight", kindOf(await reserve(u)), "allowance");
    await db.transaction((tx) => settleModelCall(tx, idOf(first)!, "refunded", undefined, new Date(), "failed"));
    check("d · after the refund the same lot funds the next press", await fundedBy(await reserve(u)), pack);
  }

  // e · A stranded reservation returns its credit; a late success on it is not charged.
  {
    const u = newUser();
    await spendAllowance(u);
    const pack = await grant(u, "pack", 1);
    const stranded = await reserve(u);
    const later = new Date(Date.now() + RESERVATION_TTL_MS + 1000);
    const next = await reserve(u, later);
    check("e · past the TTL the lot funds another press", await fundedBy(next), pack);
    const ended = await db.transaction((tx) => settleModelCall(tx, idOf(stranded)!, "spent", undefined, later));
    check("e · and a late success on the stranded run is refunded", ended, "refunded");
  }

  // f · An expired plan lot is skipped; a revoked lot spends only what is left.
  {
    const u = newUser();
    await spendAllowance(u);
    await grant(u, "plan", 10, { expiresAt: new Date(Date.now() - 1000) });
    check("f · an expired plan lot funds nothing", kindOf(await reserve(u)), "allowance");
    const v = newUser();
    await spendAllowance(v);
    await grant(v, "pack", 3, { revoked: 2 });
    check("f · a lot of three with two revoked funds one press", [kindOf(await reserve(v)), kindOf(await reserve(v))], ["reserved", "allowance"]);
  }

  // g · Two concurrent presses at a balance of one.
  {
    const u = newUser();
    await spendAllowance(u);
    await grant(u, "pack", 1);
    const got = (await Promise.all([reserve(u), reserve(u)])).map(kindOf).sort();
    check("g · exactly one of two concurrent presses reserves", got, ["allowance", "reserved"]);
  }

  // h · What readAllowance reports.
  {
    const u = newUser();
    await grant(u, "plan", 60);
    await grant(u, "pack", 40);
    await spendAllowance(u);
    await reserve(u);
    const a = await readAllowance(u);
    check("h · plan and pack left, after one plan-funded press", [a.plan, a.pack], [59, 40]);
  }

  // j · A paid run never fills the free window: with five lot-funded runs today, the allowance still
  //     funds the next press.
  {
    const u = newUser();
    const pack = await grant(u, "pack", 10);
    for (let i = 0; i < MODEL_FRIEND_DAILY_ALLOWANCE; i++) {
      await fixture.execute(sql`insert into model_calls (user_id, feature, status, model, credit_grant_id)
        values (${u}, 'tuning', 'spent', ${TUNING_MODEL}, ${pack}::uuid)`);
    }
    check("j · five paid runs today leave the free allowance whole", await fundedBy(await reserve(u)), null);
  }

  // i · The purge takes the lots and the runs that named them.
  {
    const u = newUser();
    await spendAllowance(u);
    await grant(u, "pack", 2);
    await reserve(u);
    const report = await purgeAccount(u);
    check("i · the purge deleted the lot", report.rows.credit_grants, 1);
    const [left] = await rows<{ n: string }>(sql`
      select ((select count(*) from credit_grants where user_id = ${u}) + (select count(*) from model_calls where user_id = ${u}))::text as n`);
    check("i · and nothing of the account is left in either table", left.n, "0");
  }
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    await cleanup().catch((err) => console.error("cleanup failed", err));
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
