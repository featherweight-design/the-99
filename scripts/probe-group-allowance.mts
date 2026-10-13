// Proves the per-group daily allowance (payments scope Q16) against a real database: a member takes
// their group's allowance, through the same read a reservation makes, a player in no group takes the
// default, and the owner in no group keeps their own; a group without an allowance changes nothing,
// and the column refuses 0.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. It writes as made-up accounts and removes every
// row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:group-allowance
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const MEMBER = `probe_ga_member_${run}`;
const LONER = `probe_ga_loner_${run}`;
const OWNER = `probe_ga_owner_${run}`;
const PLAIN = `probe_ga_plain_${run}`;

let failed = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : ` (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:group-allowance: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:group-allowance: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:group-allowance: database reports ${rows[0]?.b}, not ${named}`);
  const { dailyLimitFor, readAllowance } = await import("../src/lib/model/allowance");

  process.env.MODEL_OWNER_USER_ID = OWNER;
  delete process.env.MODEL_OWNER_DAILY_ALLOWANCE;
  const groups: string[] = [];
  try {
    // Each id is kept as soon as its insert returns, so a later insert that throws still leaves it to clean up.
    const { rows: g } = await db.execute<{ id: string }>(sql`insert into flag_groups (name, created_by, daily_allowance) values (${`probe-ga-${run}`}, 'probe', 3) returning id`);
    groups.push(g[0].id);
    const { rows: p } = await db.execute<{ id: string }>(sql`insert into flag_groups (name, created_by) values (${`probe-ga-plain-${run}`}, 'probe') returning id`);
    groups.push(p[0].id);
    await db.execute(sql`insert into flag_group_members (user_id, group_id, added_by) values (${MEMBER}, ${g[0].id}, 'probe'), (${PLAIN}, ${p[0].id}, 'probe')`);

    delete process.env.MODEL_DAILY_ALLOWANCE;
    check("unset: a player in no group keeps five", await dailyLimitFor(db, LONER), 5);
    check("unset: the owner in no group keeps ten", await dailyLimitFor(db, OWNER), 10);
    check("a group with no allowance changes nothing", await dailyLimitFor(db, PLAIN), 5);
    check("a member takes the group's allowance", await dailyLimitFor(db, MEMBER), 3);
    check("the allowance a panel reads is the member's", (await readAllowance(MEMBER)).limit, 3);

    process.env.MODEL_DAILY_ALLOWANCE = "1";
    check("with the default at 1, a player in no group takes 1", await dailyLimitFor(db, LONER), 1);
    check("the owner in no group keeps their own", await dailyLimitFor(db, OWNER), 10);
    check("a member still takes the group's", await dailyLimitFor(db, MEMBER), 3);

    await db.execute(sql`insert into flag_group_members (user_id, group_id, added_by) values (${OWNER}, ${g[0].id}, 'probe')`);
    check("the owner placed in the group takes the group's", await dailyLimitFor(db, OWNER), 3);

    const zero = await db.execute(sql`update flag_groups set daily_allowance = 0 where id = ${g[0].id}`).then(() => "accepted", () => "refused");
    check("the column refuses 0", zero, "refused");
  } finally {
    await db.execute(sql`delete from flag_group_members where user_id in (${MEMBER}, ${PLAIN}, ${OWNER})`);
    for (const id of groups) await db.execute(sql`delete from flag_groups where id = ${id}`);
  }
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
