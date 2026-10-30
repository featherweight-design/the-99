// The model SPEND RULES that remain, proved against a real Postgres by calling the real
// `reserveModelCall`, `settleModelCall` and `readAllowance`: per-account daily allowances, the
// owner's monthly testing share, and the meters a settle writes. There is no app-wide monthly
// limit (2026-10-17); case k proves nothing app-wide holds a friend.
//
// Every rule here is a fact about what a transaction read or wrote: a sum over the owner's month,
// a reservation priced at its worst case, a refund's recorded cost in the sum, a settle's meters.
// The arithmetic is unit tested in `spend-rule.test.ts` and `prices.test.ts`; only a database can
// say the SQL around it counts the right rows. The model is never called.
//
// Cases:
//   a  a player on the default gets MODEL_DEFAULT_DAILY_ALLOWANCE a day: that many reserves pass, the next is refused `allowance`
//   b  the owner (MODEL_OWNER_USER_ID) gets 10: ten pass, the eleventh is refused
//   c  with the variable unset, the would-be owner gets the default
//   g  a settle writes tokens, model and cost; a refund writes them too, and its cost is counted;
//      a settle with no usage writes no meters
//   i  the owner's month one worst case under their share still reserves; that reservation fills
//      it, and the owner's next press is refused `ownerShare`. A STOPPED call (refunded at once, no
//      meters yet) still counts at its worst case, since its upstream call keeps billing; a
//      refunded row with no cost stops counting past its TTL
//   j  a LATE OUTCOME writes its meters onto the refunded row, its real bill replaces its worst
//      case, and a second write changes nothing
//   e  a refunded call's RECORDED cost counts toward the owner's month and can refuse them
//      `ownerShare`: credits count successes, dollars count everything billed
//   f  the owner's share: the owner is refused `ownerShare` while a friend still reserves
//   k  no monthly figure holds a friend: with the app's month-to-date at $25 or more, and one
//      friend's own month past the owner's whole share, both friends still reserve
// The tuning and synopsis LATE-OUTCOME paths (an outcome landing after a Stop or the reaper) are
// proved where those writers are: `probe:tuning-run` cases 1 and 2, `probe:synopsis` 8b.
//
// THE OWNER'S MONTH-TO-DATE IS THE OWNER'S OWN, so cases i, j, e and f make a per-run id the owner
// (`MODEL_OWNER_USER_ID`, in this process only) and seed relative to `ownerShareMicro()` from a
// month that starts at zero; the share is pinned to its default so the seeds stay a few dollars.
// Case k alone reads the app-wide figure, to seed past $25 relative to it, and its rows are
// deleted as soon as it ends, again in the `finally`.
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run,
// restored by copying back), and each fails it:
//   - the owner's daily limit (`dailyLimitsFor` passes `owner: false`): fails b "the owner's ten
//     reserve" and b "and reads a limit of ten".
//   - the owner share (`spendRefusal`'s share comparison replaced by `false`): fails f "then the
//     owner is refused ownerShare", f "readAllowance says ownerShare for the owner", and every i
//     and e check that expects `ownerShare`.
//   - a refunded call's recorded cost counted (`ownerMonthMicro`'s priced sum narrowed to `spent`
//     rows): fails e "a refunded call's recorded cost counts toward the owner's month".
//   - a refunded call with no cost counted at worst case (`countsAtWorstCase` admits `reserved`
//     alone): fails i "a Stopped call ... still counts at its worst case" (and, downstream, j, i
//     and e, since the reservation it let through is never settled).
//   - a friend held to a monthly figure (`ownerMonthMicro`'s `isOwner` guard removed): fails k
//     "the friend who paid it still reserves" and k "and neither reads a share refusal".
//   - the null guard (`recordModelUsage` updates by id alone): fails j "and a second write does
//     not change them" (and the checks after it, on the inflated bill).
//   - settle sharing the meter writer (`settleModelCall` never calls `recordModelUsage`): fails
//     g's three meter checks (and, downstream, i and e).
//
// It writes `model_calls` rows under per-run `user_id`s and deletes them in a `finally`. Point it
// at `local-dev` or a scratch Neon branch, NEVER staging or production: it refuses staging's branch.
// Prefer a scratch branch while any other checkout on the target runs a build older than
// 2026-10-17: case k's $25 seed stands on the shared ledger for the length of that case.
//
//   pnpm probe:spend-cap
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { dailyLimitFor, ownerShareMicro, readAllowance, recordModelUsage, reserveModelCall, settleModelCall } from "../src/lib/model/allowance";
import type { ModelUsage } from "../src/lib/model/client";
import { costMicroUsd, featureWorstCaseMicroUsd } from "../src/lib/model/prices";
import {
  monthStartUtc,
  unpricedWorstCaseMicro,
  usdToMicro,
  type UnpricedCall,
} from "../src/lib/model/spend-rule";
import { MODEL_DEFAULT_DAILY_ALLOWANCE as D, RESERVATION_TTL_MS } from "../src/lib/model/allowance-rule";
import { TUNING_MODEL } from "../src/lib/tuning/limits";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const PREFIX = `probe-spend-cap-${Date.now()}`;
let users = 0;
const newUser = () => `${PREFIX}-${++users}`;
const ownerBefore = process.env.MODEL_OWNER_USER_ID;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};

const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> =>
  (await fixture.execute(text)).rows as T[];

/** One reserve, in its own transaction, as a feature's `startRun` makes it. */
const reserve = (userId: string) =>
  db.transaction((tx) => reserveModelCall(tx, userId, "tuning", TUNING_MODEL));
const kindOf = (r: { id: string } | { refused: string }) => ("refused" in r ? r.refused : "reserved");
const settle = (id: string, to: "spent" | "refunded", usage?: ModelUsage) =>
  db.transaction((tx) => settleModelCall(tx, id, to, usage ? { model: TUNING_MODEL, usage } : undefined, new Date(), null));

/** Refund every reservation a user still holds, so it stops counting toward the month. */
const refundAll = (userId: string) => fixture.execute(sql`
  update model_calls set status = 'refunded' where user_id = ${userId} and status = 'reserved'`);

/** A row the probe writes directly, this month. Returns its id so the case can delete it. */
async function seed(userId: string, status: "spent" | "refunded", costMicro: number | null): Promise<string> {
  const [row] = await rows<{ id: string }>(sql`
    insert into model_calls (user_id, feature, status, model, cost_micro_usd)
    values (${userId}, 'tuning', ${status}, ${TUNING_MODEL}, ${costMicro}) returning id`);
  return row.id;
}
const unseed = (ids: string[]) => ids.length
  ? fixture.execute(sql`delete from model_calls where id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`)
  : Promise.resolve();

/** App-wide BILLED cost this month, micro-dollars: every recorded cost, spent or refunded. */
async function billedMonth(): Promise<number> {
  const [r] = await rows<{ s: string }>(sql`
    select coalesce(sum(cost_micro_usd), 0)::text as s from model_calls
    where cost_micro_usd is not null and created_at >= ${monthStartUtc(new Date()).toISOString()}::timestamp`);
  return Number(r.s);
}

/** App-wide month-to-date as the cap reads it: billed cost plus the unpriced calls' worst case,
 *  through the real rule (`unpricedWorstCaseMicro`), so a seed relative to it lands where meant. */
async function monthToDate(): Promise<number> {
  const now = new Date();
  const live = await rows<{ status: "reserved" | "spent" | "refunded"; feature: "tuning" | "synopsis"; model: string | null; created_at: string }>(sql`
    select status, feature, model, created_at::text from model_calls
    where cost_micro_usd is null and created_at >= ${monthStartUtc(now).toISOString()}::timestamp`);
  const unpriced: UnpricedCall[] = live.map((r) => ({
    status: r.status, feature: r.feature, model: r.model, createdAt: new Date(`${r.created_at.replace(" ", "T")}Z`),
  }));
  return (await billedMonth()) + unpricedWorstCaseMicro(unpriced, now);
}

const W = featureWorstCaseMicroUsd("tuning");

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (branch === STAGING_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to run against ${branch}: this probe writes the ledger. Point it at local-dev.`);
  }
  console.log(`branch ${branch}; one tuning call's worst case is ${W} micro-dollars`);
  delete process.env.MODEL_OWNER_USER_ID;

  // a · A player on the default gets the default (MODEL_DAILY_ALLOWANCE unset here, as on local-dev).
  const defaultRun = [...Array.from({ length: D }, () => "reserved"), "allowance"];
  {
    const u = newUser();
    const got = [];
    for (let i = 0; i <= D; i++) got.push(kindOf(await reserve(u)));
    check("a · the default's reserves pass, the next is refused", got, defaultRun);
    check("a · and reads the default limit", (await readAllowance(u)).limit, D);
    await refundAll(u);
  }

  // b · The owner gets ten.
  {
    const owner = newUser();
    process.env.MODEL_OWNER_USER_ID = owner;
    const got = [];
    for (let i = 0; i < 11; i++) got.push(kindOf(await reserve(owner)));
    check("b · the owner's ten reserve", got.slice(0, 10).every((k) => k === "reserved"), true);
    check("b · the eleventh is refused", got[10], "allowance");
    check("b · and reads a limit of ten", (await readAllowance(owner)).limit, 10);
    await refundAll(owner);

    // c · The same account, with the variable unset, is on the default.
    delete process.env.MODEL_OWNER_USER_ID;
    const again = newUser();
    const unset = [];
    for (let i = 0; i <= D; i++) unset.push(kindOf(await reserve(again)));
    check("c · unset, the would-be owner's limit is the default", [await dailyLimitFor(db, owner), await dailyLimitFor(db, again)], [D, D]);
    check("c · the default's reserves pass and the next is refused", unset, defaultRun);
    process.env.MODEL_OWNER_USER_ID = "   ";
    check("c · a blank variable names no owner either", await dailyLimitFor(db, "   "), D);
    delete process.env.MODEL_OWNER_USER_ID;
    await refundAll(again);
  }

  // g · A settle's meters.
  {
    const u = newUser();
    const usage: ModelUsage = { inputTokens: 4_000, outputTokens: 1_500, cacheReadTokens: 100, cacheWriteTokens: 40 };
    const meters = async (id: string) => (await rows<Record<string, unknown>>(sql`
      select status, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, model, cost_micro_usd::text as cost
      from model_calls where id = ${id}::uuid`))[0];

    const spent = await reserve(u);
    if (!("id" in spent)) throw new Error(`g · reserve refused: ${spent.refused}`);
    check("g · a reservation records its model", (await meters(spent.id)).model, TUNING_MODEL);
    await settle(spent.id, "spent", usage);
    check("g · a spent settle writes tokens, model and cost", await meters(spent.id), {
      status: "spent", input_tokens: 4_000, output_tokens: 1_500, cache_read_tokens: 100, cache_write_tokens: 40,
      model: TUNING_MODEL, cost: String(costMicroUsd(TUNING_MODEL, usage)),
    });

    const refunded = await reserve(u);
    if (!("id" in refunded)) throw new Error(`g · reserve refused: ${refunded.refused}`);
    const before = await billedMonth();
    await settle(refunded.id, "refunded", usage);
    const m = await meters(refunded.id);
    check("g · a refund writes tokens and cost too", [m.status, m.input_tokens, m.cost],
      ["refunded", 4_000, String(costMicroUsd(TUNING_MODEL, usage))]);
    check("g · and its cost IS counted toward the month's billed spend", await billedMonth() - before,
      costMicroUsd(TUNING_MODEL, usage));

    const bare = await reserve(u);
    if (!("id" in bare)) throw new Error(`g · reserve refused: ${bare.refused}`);
    await settle(bare.id, "refunded");
    const b = await meters(bare.id);
    check("g · a settle with no usage writes no meters", [b.status, b.input_tokens, b.cost], ["refunded", null, null]);
  }

  // i, j, e · The owner's month-to-date: a Stopped call counting at its worst case until its TTL
  // or its meters; a late outcome's meters; and a refund's recorded cost counting toward it. The
  // owner is a per-run id, so their month starts at zero and every seed below is under them.
  {
    const owner = newUser();
    process.env.MODEL_OWNER_USER_ID = owner;
    // Pinned to the default share so the seeded rows stay a few dollars, whatever the target's
    // override says; every seed is still sized from `ownerShareMicro()`.
    const shareOverride = process.env.MODEL_OWNER_MONTHLY_USD;
    delete process.env.MODEL_OWNER_MONTHLY_USD;
    // Room for one call and SLACK more: a late outcome's small bill must still leave one call's room.
    const SLACK = 1_000;
    const tiny: ModelUsage = { inputTokens: 0, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const meterOf = async (id: string) => (await rows<{ status: string; output_tokens: number | null; cost: string | null }>(sql`
      select status, output_tokens, cost_micro_usd::text as cost from model_calls where id = ${id}::uuid`))[0];
    try {
      const fill = ownerShareMicro() - W - SLACK;
      if (fill < 0) throw new Error(`i · the owner's share (${ownerShareMicro()}) is under one call (${W})`);
      await seed(owner, "spent", fill);

      const held = await reserve(owner);
      check("i · the owner reserves while one worst case still fits their share", kindOf(held), "reserved");
      if (!("id" in held)) throw new Error("i · the fixture reservation was refused");
      check("i · that reservation fills the share: the owner's next press is refused ownerShare",
        kindOf(await reserve(owner)), "ownerShare");

      // i · A Stop refunds the credit at once, with no meters: the call is still billing.
      await settle(held.id, "refunded");
      check("i · a Stopped call, refunded with no meters, still counts at its worst case",
        kindOf(await reserve(owner)), "ownerShare");

      // j · Its outcome lands late, and records what it billed.
      await db.transaction((tx) => recordModelUsage(tx, held.id, { model: TUNING_MODEL, usage: tiny }));
      check("j · a late outcome writes its meters onto the refunded row", await meterOf(held.id),
        { status: "refunded", output_tokens: 10, cost: String(costMicroUsd(TUNING_MODEL, tiny)) });
      await db.transaction((tx) => recordModelUsage(tx, held.id, {
        model: TUNING_MODEL, usage: { inputTokens: 9_000, outputTokens: 8_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
      }));
      check("j · and a second write does not change them", await meterOf(held.id),
        { status: "refunded", output_tokens: 10, cost: String(costMicroUsd(TUNING_MODEL, tiny)) });
      const reopened = await reserve(owner);
      check("j · with its real bill in place of its worst case, the owner reserves again", kindOf(reopened), "reserved");
      if ("id" in reopened) await settle(reopened.id, "refunded", tiny);

      // i · A Stopped call with no meters counts only inside its TTL.
      const stopped = await seed(owner, "refunded", null);
      check("i · a refunded row with no cost, inside its TTL, fills the share", kindOf(await reserve(owner)), "ownerShare");
      await fixture.execute(sql`
        update model_calls set created_at = created_at - (${RESERVATION_TTL_MS + 60_000} || ' milliseconds')::interval
        where id = ${stopped}::uuid`);
      const aged = await reserve(owner);
      check("i · past its TTL it stops counting", kindOf(aged), "reserved");
      if ("id" in aged) await settle(aged.id, "refunded", tiny);

      // e · A refunded call's RECORDED cost counts: credits count successes, dollars everything billed.
      check("e · before the refund's cost, the owner reads no share refusal", (await readAllowance(owner, new Date(), "tuning")).ownerShare, undefined);
      await seed(owner, "refunded", SLACK * 2);
      check("e · a refunded call's recorded cost counts toward the owner's month", kindOf(await reserve(owner)), "ownerShare");
      check("e · and readAllowance says ownerShare for the same call", (await readAllowance(owner, new Date(), "tuning")).ownerShare, true);
    } finally {
      delete process.env.MODEL_OWNER_USER_ID;
      if (shareOverride !== undefined) process.env.MODEL_OWNER_MONTHLY_USD = shareOverride;
      await fixture.execute(sql`delete from model_calls where user_id = ${owner}`);
    }
  }

  // f · The owner's share.
  {
    const owner = newUser();
    const friend = newUser();
    process.env.MODEL_OWNER_USER_ID = owner;
    const shareOverride = process.env.MODEL_OWNER_MONTHLY_USD;
    delete process.env.MODEL_OWNER_MONTHLY_USD;
    const seeded: string[] = [];
    try {
      seeded.push(await seed(owner, "spent", ownerShareMicro() - W));
      check("f · the owner reserves while one call still fits their share", kindOf(await reserve(owner)), "reserved");
      check("f · then the owner is refused ownerShare", kindOf(await reserve(owner)), "ownerShare");
      check("f · readAllowance says ownerShare for the owner", (await readAllowance(owner)).ownerShare, true);
      check("f · a friend at the same moment still reserves", kindOf(await reserve(friend)), "reserved");
      check("f · and reads no share", (await readAllowance(friend)).ownerShare, undefined);
    } finally {
      delete process.env.MODEL_OWNER_USER_ID;
      if (shareOverride !== undefined) process.env.MODEL_OWNER_MONTHLY_USD = shareOverride;
      await unseed(seeded);
      await fixture.execute(sql`delete from model_calls where user_id in (${owner}, ${friend})`);
    }
  }

  // k · No monthly figure holds a friend: with the app's month-to-date at $25 or more, and one
  // friend's own month past the owner's whole share, both friends still reserve.
  {
    const payer = newUser();
    const friend = newUser();
    const BIG = usdToMicro(25);
    try {
      const m = await monthToDate();
      await seed(payer, "spent", Math.max(BIG - m, 0) + ownerShareMicro() + W);
      check("k · the app's month-to-date stands at $25 or more", (await monthToDate()) >= BIG, true);
      check("k · the friend who paid it still reserves", kindOf(await reserve(payer)), "reserved");
      check("k · another friend still reserves", kindOf(await reserve(friend)), "reserved");
      check("k · and neither reads a share refusal",
        [(await readAllowance(payer)).ownerShare, (await readAllowance(friend)).ownerShare], [undefined, undefined]);
    } finally {
      // Real spend on the month: it goes now, not at the end.
      await fixture.execute(sql`delete from model_calls where user_id in (${payer}, ${friend})`);
    }
  }
}

async function main() {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  } finally {
    if (ownerBefore === undefined) delete process.env.MODEL_OWNER_USER_ID;
    else process.env.MODEL_OWNER_USER_ID = ownerBefore;
    try {
      await fixture.execute(sql`delete from model_calls where user_id like ${`${PREFIX}-%`}`);
    } catch (error) {
      console.error("cleanup:", error);
    }
    await pool.end();
  }
  // Reported AFTER the `finally`, never from inside it: an exit there swallows the throw and
  // prints a pass over a case that never ran.
  if (thrown) {
    console.error(thrown);
    process.exit(1);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

void main();
