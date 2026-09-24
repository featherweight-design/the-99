// The model SPEND CAP, proved against a real Postgres by calling the real `reserveModelCall`,
// `settleModelCall` and `readAllowance`.
//
// Every rule here is a fact about what a transaction read or wrote: a sum over the month's
// ledger, a reservation priced at its worst case, a refund left out of the sum, a settle's meters.
// The arithmetic is unit tested in `spend-rule.test.ts` and `prices.test.ts`; only a database can
// say the SQL around it counts the right rows. The model is never called.
//
// Cases:
//   a  a friend gets 3 a day: three reserves pass, the fourth is refused `allowance`
//   b  the owner (MODEL_OWNER_USER_ID) gets 10: ten pass, the eleventh is refused
//   c  with the variable unset, the would-be owner gets 3
//   d  the hard stop: app-wide month-to-date one worst case under $20 still reserves; that
//      reservation reaches $20, and the next press, anyone's, is refused `paused`
//   e  a refunded call does not count: a $50 refund leaves the app unpaused
//   f  the owner's share: the owner is refused `ownerShare` while a friend still reserves
//   g  a settle writes tokens, model and cost; a refund writes them too, and its cost counts for
//      nothing; a settle with no usage writes no meters
//   h  the alarm: a settle carrying app-wide spend over a line reports it exactly once, and a
//      settle that crosses nothing reports nothing
//
// MONTH-TO-DATE IS APP-WIDE, so every row on the database counts, not only this run's. The
// seeded cases read the current figure first and seed RELATIVE to it, and every seeded row is
// deleted as soon as its case ends, again in the `finally`.
//
// Five mutations, each run against this probe (file copied to the scratchpad, broken by an exact
// replace, run, restored by copying back), and each fails it:
//   - the friend/owner limit (`dailyLimitFor` returns the friend's 3 for everyone): fails
//     b "the owner's ten reserve" and b "and reads a limit of ten".
//   - the hard stop (`spendRefusal` never returns "paused"): fails d "the next press is refused
//     paused" and d "readAllowance says paused".
//   - excluding refunded rows (the month's spent sum in `monthSpend` reads `refunded` too): fails
//     e "a $50 refund does not pause the app", d "one worst case under $20 still reserves" and
//     d "refunding the reservation reopens it".
//   - the owner share (`spendRefusal` ignores `ownerMonthMicro`): fails f "then the owner is
//     refused ownerShare" and f "readAllowance says ownerShare for the owner".
//   - the alarm crossing (`crossedAlarms` drops its `before < line` half): fails h "a settle past
//     the line reports nothing".
//
// It writes `model_calls` rows under per-run `user_id`s and deletes them in a `finally`. Point it
// at `local-dev` or a scratch Neon branch, NEVER staging or production: it refuses staging's branch.
//
//   pnpm probe:spend-cap
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { dailyLimitFor, readAllowance, reserveModelCall, settleModelCall } from "../src/lib/model/allowance";
import type { ModelUsage } from "../src/lib/model/client";
import { costMicroUsd, featureWorstCaseMicroUsd } from "../src/lib/model/prices";
import {
  HARD_STOP_USD,
  monthStartUtc,
  OWNER_SHARE_USD,
  reservedWorstCaseMicro,
  usdToMicro,
  type LiveReservation,
} from "../src/lib/model/spend-rule";
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
  db.transaction((tx) => settleModelCall(tx, id, to, usage ? { model: TUNING_MODEL, usage } : undefined));

/** Refund every reservation a user still holds, so it stops counting toward the month. */
const refundAll = (userId: string) => fixture.execute(sql`
  update model_calls set status = 'refunded' where user_id = ${userId} and status = 'reserved'`);

/** A row the probe writes directly, this month. Returns its id so the case can delete it. */
async function seed(userId: string, status: "spent" | "refunded", costMicro: number): Promise<string> {
  const [row] = await rows<{ id: string }>(sql`
    insert into model_calls (user_id, feature, status, model, cost_micro_usd)
    values (${userId}, 'tuning', ${status}, ${TUNING_MODEL}, ${costMicro}) returning id`);
  return row.id;
}
const unseed = (ids: string[]) => ids.length
  ? fixture.execute(sql`delete from model_calls where id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`)
  : Promise.resolve();

/** App-wide spent cost this month, micro-dollars. */
async function spentMonth(): Promise<number> {
  const [r] = await rows<{ s: string }>(sql`
    select coalesce(sum(cost_micro_usd), 0)::text as s from model_calls
    where status = 'spent' and created_at >= ${monthStartUtc(new Date()).toISOString()}::timestamp`);
  return Number(r.s);
}

/** App-wide month-to-date as the cap reads it: spent cost plus live reservations' worst case. */
async function monthToDate(): Promise<number> {
  const now = new Date();
  const live = await rows<{ feature: "tuning" | "synopsis"; model: string | null; created_at: string }>(sql`
    select feature, model, created_at::text from model_calls
    where status = 'reserved' and created_at >= ${monthStartUtc(now).toISOString()}::timestamp`);
  const reservations: LiveReservation[] = live.map((r) => ({
    feature: r.feature, model: r.model, createdAt: new Date(`${r.created_at.replace(" ", "T")}Z`),
  }));
  return (await spentMonth()) + reservedWorstCaseMicro(reservations, now);
}

const W = featureWorstCaseMicroUsd("tuning");

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (branch === STAGING_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to run against ${branch}: this probe writes the ledger. Point it at local-dev.`);
  }
  console.log(`branch ${branch}; one tuning call's worst case is ${W} micro-dollars`);
  delete process.env.MODEL_OWNER_USER_ID;

  // a · A friend gets three.
  {
    const u = newUser();
    const got = [];
    for (let i = 0; i < 4; i++) got.push(kindOf(await reserve(u)));
    check("a · a friend's three reserve, the fourth is refused", got, ["reserved", "reserved", "reserved", "allowance"]);
    check("a · and reads a limit of three", (await readAllowance(u)).limit, 3);
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

    // c · The same account, with the variable unset, is a friend.
    delete process.env.MODEL_OWNER_USER_ID;
    const again = newUser();
    const unset = [];
    for (let i = 0; i < 4; i++) unset.push(kindOf(await reserve(again)));
    check("c · unset, the would-be owner's limit is three", [dailyLimitFor(owner), dailyLimitFor(again)], [3, 3]);
    check("c · three reserve and the fourth is refused", unset, ["reserved", "reserved", "reserved", "allowance"]);
    process.env.MODEL_OWNER_USER_ID = "   ";
    check("c · a blank variable names no owner either", dailyLimitFor("   "), 3);
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
    const before = await spentMonth();
    await settle(refunded.id, "refunded", usage);
    const m = await meters(refunded.id);
    check("g · a refund writes tokens and cost too", [m.status, m.input_tokens, m.cost],
      ["refunded", 4_000, String(costMicroUsd(TUNING_MODEL, usage))]);
    check("g · and its cost moves no month-to-date", await spentMonth(), before);

    const bare = await reserve(u);
    if (!("id" in bare)) throw new Error(`g · reserve refused: ${bare.refused}`);
    await settle(bare.id, "refunded");
    const b = await meters(bare.id);
    check("g · a settle with no usage writes no meters", [b.status, b.input_tokens, b.cost], ["refunded", null, null]);
  }

  // h · The alarm.
  {
    const u = newUser();
    const seeded: string[] = [];
    try {
      const s = await spentMonth();
      const line = [5, 8].map(usdToMicro).find((l) => l > s);
      if (line === undefined) {
        check("h · local-dev's month-to-date leaves an alarm line to cross", s < usdToMicro(8), true);
      } else {
        const pct = line === usdToMicro(5) ? 50 : 80;
        // Just under the line; the settle below costs 10,000 micro-dollars and carries it over.
        seeded.push(await seed(u, "spent", line - s - 1_000));
        const warned: unknown[][] = [];
        const warn = console.warn;
        console.warn = (...args: unknown[]) => { warned.push(args); };
        try {
          const crossing = await reserve(u);
          if (!("id" in crossing)) throw new Error(`h · reserve refused: ${crossing.refused}`);
          await settle(crossing.id, "spent", { inputTokens: 0, outputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 0 });
          const said = warned.map((w) => String(w[0]));
          check(`h · a settle crossing ${pct}% reports it exactly once`,
            [said.length, said.every((line) => line.includes(`crossed ${pct}%`))], [1, true]);
          warned.length = 0;
          const past = await reserve(u);
          if (!("id" in past)) throw new Error(`h · reserve refused: ${past.refused}`);
          await settle(past.id, "spent", { inputTokens: 0, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 });
          check("h · a settle past the line reports nothing", warned.length, 0);
        } finally {
          console.warn = warn;
        }
      }
    } finally {
      // This case's spent rows are real spend on the month: they go now, not at the end.
      await fixture.execute(sql`delete from model_calls where user_id = ${u}`);
      await unseed(seeded);
    }
  }

  // d + e · The hard stop, and a refund that does not count toward it.
  {
    const payer = newUser();
    const [first, second] = [newUser(), newUser()];
    const seeded: string[] = [];
    try {
      const m = await monthToDate();
      const stop = usdToMicro(HARD_STOP_USD);
      const fill = stop - m - W;
      if (fill < 0) throw new Error(`d · local-dev's month-to-date (${m}) already leaves no room under $${HARD_STOP_USD}`);
      seeded.push(await seed(payer, "spent", fill));
      // e · A refund far past the stop, which must count for nothing.
      seeded.push(await seed(payer, "refunded", usdToMicro(50)));
      check("e · a $50 refund does not pause the app", (await readAllowance(first)).paused, undefined);
      check("d · one worst case under $20 still reserves", kindOf(await reserve(first)), "reserved");
      check("d · that reservation reaches $20: the next press is refused paused", kindOf(await reserve(second)), "paused");
      const read = await readAllowance(second);
      check("d · readAllowance says paused, until the 1st of next month", read.paused?.until.toISOString() ?? null,
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString());
      await refundAll(first);
      check("d · refunding the reservation reopens it", kindOf(await reserve(second)), "reserved");
      await refundAll(second);
    } finally {
      await unseed(seeded);
      await fixture.execute(sql`delete from model_calls where user_id in (${first}, ${second})`);
    }
  }

  // f · The owner's share.
  {
    const owner = newUser();
    const friend = newUser();
    process.env.MODEL_OWNER_USER_ID = owner;
    const seeded: string[] = [];
    try {
      seeded.push(await seed(owner, "spent", usdToMicro(OWNER_SHARE_USD) - W));
      check("f · the owner reserves while one call still fits his share", kindOf(await reserve(owner)), "reserved");
      check("f · then the owner is refused ownerShare", kindOf(await reserve(owner)), "ownerShare");
      check("f · readAllowance says ownerShare for the owner", (await readAllowance(owner)).ownerShare, true);
      check("f · a friend at the same moment still reserves", kindOf(await reserve(friend)), "reserved");
      check("f · and reads no share", (await readAllowance(friend)).ownerShare, undefined);
    } finally {
      delete process.env.MODEL_OWNER_USER_ID;
      await unseed(seeded);
      await fixture.execute(sql`delete from model_calls where user_id in (${owner}, ${friend})`);
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
