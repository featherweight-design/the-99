// Help me choose PR 1's plumbing, proved against a real Postgres: the migration's constraints and
// the per-feature owner-share check.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE.
//   THE MIGRATION'S RULES. A budget answer is whole dollars of at least $1 (stored as cents, a
//   multiple of 100), a bracket answer is 1 to 5, a build-around card must be a card the catalog
//   holds, and a player holds at most ONE pending read. `model_calls` accepts the `intake`
//   feature since PR 4 registered its `FEATURE_CALLS` entry, and refuses a feature the code cannot
//   price. Each is a constraint or a partial index, which no
//   unit test here can reach.
//   "OWNER SHARE" IS JUDGED PER FEATURE. `readAllowance` compares the owner's own month-to-date
//   plus one call against the owner's share, and the call it adds is the named feature's own
//   worst case. An owner month with room for the cheaper feature's call and not the dearer one's
//   must read `ownerShare` for the dearer feature only. The rule is `callMicroFor`, unit tested;
//   what this proves is that `readAllowance` hands it the feature over the real ledger query.
//
// THE OWNER-SHARE CASE makes this run's per-run user the owner (`MODEL_OWNER_USER_ID`, in this
// process only) and writes ONE spent `model_calls` row under it, costed to leave that owner's
// month between the two calls' worst cases. The owner's figure is the owner's own rows, so no
// other account reads anything different while it stands. Every row it writes is under the
// per-run `user_id` and is deleted in a `finally`. Point it at `local-dev` or a scratch branch,
// never staging or production.
//
//   PROBE_TARGET_URL=<database> pnpm probe:help-me-choose-plumbing
//
// The target is its own variable and is REQUIRED: `.env` is loaded with override, so a
// `DATABASE_URL=` prefix would be discarded and the run would land wherever `.env` points.
// `src/db` reads `DATABASE_URL` at module scope, so the modules that use it are imported only
// after it is set.
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import type { ModelFeature } from "../src/lib/model/allowance-rule";
import { FEATURE_CALLS, featureWorstCaseMicroUsd } from "../src/lib/model/prices";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.PROBE_TARGET_URL;
if (!DATABASE_URL) throw new Error("PROBE_TARGET_URL is not set: name the database to write to");
process.env.DATABASE_URL = DATABASE_URL;
let allowance: typeof import("../src/lib/model/allowance");

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-hmc-plumbing-${Date.now()}`;

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

/** The Postgres error code a statement raised, or null when it succeeded. */
async function refusal(text: ReturnType<typeof sql>): Promise<string | null> {
  try {
    await fixture.execute(text);
    return null;
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    return code ?? "unknown";
  }
}

async function migration() {
  console.log("\n1. The migration's constraints");
  const [card] = await rows<{ oracle_id: string }>(sql`select oracle_id from cards order by oracle_id limit 1`);
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id) values (${USER}, 'probe', ${card.oracle_id}::uuid) returning id`);

  check("a fresh deck carries no answers", await rows(sql`
    select answer_budget_cents, answer_bracket, answer_card_oracle_id
    from decks where id = ${deck.id}`), [{ answer_budget_cents: null, answer_bracket: null, answer_card_oracle_id: null }]);
  check("a whole-dollar budget is stored", await refusal(sql`update decks set answer_budget_cents = 20000 where id = ${deck.id}`), null);
  check("a budget of cents is refused", await refusal(sql`update decks set answer_budget_cents = 150 where id = ${deck.id}`), "23514");
  check("a budget under $1 is refused", await refusal(sql`update decks set answer_budget_cents = 0 where id = ${deck.id}`), "23514");
  check("bracket 5 is stored", await refusal(sql`update decks set answer_bracket = 5 where id = ${deck.id}`), null);
  check("bracket 6 is refused", await refusal(sql`update decks set answer_bracket = 6 where id = ${deck.id}`), "23514");
  check("a catalog card is a build-around answer", await refusal(sql`update decks set answer_card_oracle_id = ${card.oracle_id}::uuid where id = ${deck.id}`), null);
  check("a card the catalog does not hold is refused", await refusal(sql`
    update decks set answer_card_oracle_id = '00000000-0000-0000-0000-000000000000'::uuid where id = ${deck.id}`), "23503");

  check("model_calls accepts intake, which the code prices", await refusal(sql`
    insert into model_calls (user_id, feature, status) values (${USER}, 'intake', 'refunded')`), null);
  check("model_calls refuses a feature the code cannot price", await refusal(sql`
    insert into model_calls (user_id, feature, status) values (${USER}, 'unpriced', 'refunded')`), "23514");

  const [call] = await rows<{ id: string }>(sql`
    insert into model_calls (user_id, feature, status) values (${USER}, 'tuning', 'refunded') returning id`);
  const read = (status: string) => sql`
    insert into intake_reads (user_id, words_hash, model, model_call_id, status)
    values (${USER}, 'h', 'claude-sonnet-5', ${call.id}::uuid, ${status})`;
  check("a first pending read is written", await refusal(read("pending")), null);
  check("a second pending read for the same player is refused", await refusal(read("pending")), "23505");
  check("a settled read beside the pending one is written", await refusal(read("ok")), null);
  check("an unknown read status is refused", await refusal(read("done")), "23514");
}

async function ownerShare() {
  console.log("\n2. The owner's share is judged per feature");
  const features = Object.keys(FEATURE_CALLS) as ModelFeature[];
  // Sized from the prices, never through `callMicroFor`: that is the rule under test, and a
  // fixture sized by it agrees with it whatever it does.
  const sized = features.map((f) => ({ f, micro: featureWorstCaseMicroUsd(f) })).sort((a, b) => a.micro - b.micro);
  const small = sized[0];
  const big = sized[sized.length - 1];
  if (small.micro === big.micro) {
    check("two features with different worst cases exist", `${small.f} ${small.micro}, ${big.f} ${big.micro}`, "different");
    return;
  }

  // Section 1's refunded calls carry no cost, and an unpriced call counts at its worst case while
  // its TTL runs, so they would move the month this section measures. They go first, which
  // leaves this run's owner a month of exactly the sentinel below.
  await fixture.execute(sql`delete from intake_reads where user_id = ${USER}`);
  await fixture.execute(sql`delete from model_calls where user_id = ${USER}`);
  const ownerBefore = process.env.MODEL_OWNER_USER_ID;
  const shareBefore = process.env.MODEL_OWNER_MONTHLY_USD;
  process.env.MODEL_OWNER_USER_ID = USER;
  // The default share keeps the sentinel a few dollars; it is sized from `ownerShareMicro()` all the same.
  delete process.env.MODEL_OWNER_MONTHLY_USD;
  try {
    const now = new Date();
    // Leave the owner's month with room for the small call and not the big one: halfway between them.
    const room = Math.round((small.micro + big.micro) / 2);
    const sentinel = allowance.ownerShareMicro() - room;
    if (sentinel < 0) {
      check("the owner's share has room for a sentinel", allowance.ownerShareMicro(), `at least ${room}`);
      return;
    }
    await fixture.execute(sql`
      insert into model_calls (user_id, feature, status, model, cost_micro_usd)
      values (${USER}, 'synopsis', 'spent', 'claude-sonnet-5', ${sentinel})`);

    const read = allowance.readAllowance;
    const reads = await Promise.all([read(USER, now, big.f), read(USER, now, small.f), read(USER, now)]);
    check(`${big.f}, the dearer call (${big.micro}), reads ownerShare`, reads[0].ownerShare, true);
    check(`${small.f}, the cheaper call (${small.micro}), does not`, reads[1].ownerShare, undefined);
    check("no feature named reads as the cheapest call, no ownerShare", reads[2].ownerShare, undefined);
  } finally {
    if (ownerBefore === undefined) delete process.env.MODEL_OWNER_USER_ID;
    else process.env.MODEL_OWNER_USER_ID = ownerBefore;
    if (shareBefore !== undefined) process.env.MODEL_OWNER_MONTHLY_USD = shareBefore;
  }
}

async function main() {
  try {
    allowance = await import("../src/lib/model/allowance");
    await migration();
    await ownerShare();
  } finally {
    await fixture.execute(sql`delete from intake_reads where user_id = ${USER}`);
    await fixture.execute(sql`delete from model_calls where user_id = ${USER}`);
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await pool.end();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
