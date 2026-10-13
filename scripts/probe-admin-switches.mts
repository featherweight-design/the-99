// Proves the admin's override writes (admin plan 8c) against a real database: the switch constraint,
// a set and its event, a second set that updates rather than inserts, a clear with its old value, the
// refusals and the unconfirmed model rise that write nothing, a group that does not exist, and that a
// snapshot read after the commit carries the change.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. It writes as made-up accounts and removes every
// row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:admin-switches
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const ADMIN = `probe_admin_${run}`;
const U1 = `probe_sw_a_${run}`;
const U2 = `probe_sw_b_${run}`;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:admin-switches: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:admin-switches: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:admin-switches: database reports ${rows[0]?.b}, not ${named}`);

  const { writeOverride } = await import("../src/lib/admin/switch-writes");
  const { riseForAccounts, switchEnvValues } = await import("../src/lib/switches/explain");
  const { readSwitchSnapshot } = await import("../src/lib/switches/snapshot");
  const { SWITCH_NAMES } = await import("../src/lib/switches/registry");
  let cleared = 0;
  // The probe's own universe, so Clerk is never asked; the rest is the shipped path.
  const deps = {
    accounts: async () => ({ accounts: [U1, U2].map((id) => ({ id, name: id, email: null })) }),
    env: switchEnvValues,
    rise: riseForAccounts,
    transaction: <T,>(fn: Parameters<typeof db.transaction<T>>[0]) => db.transaction(fn),
    afterCommit: () => void cleared++,
  };
  const count = async (q: ReturnType<typeof sql>) => Number((await db.execute<{ n: number }>(q)).rows[0].n);
  const rowsFor = (name: string) => count(sql`select count(*)::int as n from flag_overrides where "switch" = ${name}`);
  const events = (kind: string) => count(sql`select count(*)::int as n from admin_events where actor_id = ${ADMIN} and kind = ${kind}`);
  const S = "DECK_NOTES_ENABLED";
  const before = await rowsFor(S);
  let group: string | null = null;

  try {
    // The constraint takes every registry name and refuses another.
    const accepted = await db.transaction(async (tx) => {
      for (const n of SWITCH_NAMES) await tx.execute(sql`insert into flag_overrides ("switch", scope, user_id, value, updated_by) values (${n}, 'user', ${U1}, 'on', ${ADMIN})`);
      await tx.execute(sql`delete from flag_overrides where updated_by = ${ADMIN}`);
      return true;
    }).catch(() => false);
    check(`the constraint accepts all ${SWITCH_NAMES.length} names`, accepted);
    const refused = await db.execute(sql`insert into flag_overrides ("switch", scope, value, updated_by) values ('NOPE_ENABLED', 'app', 'on', ${ADMIN})`).then(() => false, () => true);
    check("the constraint refuses another name", refused);

    // A set: one row, one override_set, the memo cleared once.
    check("an account set is ok", (await writeOverride(ADMIN, "set", { switchName: S, scope: "user", targetUserId: U1, value: "on", note: "probe" }, deps)).ok);
    check("it writes one row and one override_set", (await rowsFor(S)) === before + 1 && (await events("override_set")) === 1);
    check("the memo is cleared after the commit", cleared === 1);
    const snap = await readSwitchSnapshot();
    check("a snapshot read after the commit carries it", !!snap?.overrides.some((o) => o.switchName === S && o.userId === U1 && o.value === "on"));

    // A second set updates.
    check("a second set is ok", (await writeOverride(ADMIN, "set", { switchName: S, scope: "user", targetUserId: U1, value: "off" }, deps)).ok);
    check("it updates rather than inserts", (await rowsFor(S)) === before + 1 && (await events("override_set")) === 2);
    const { rows: old } = await db.execute<{ old_value: string | null }>(sql`select old_value from admin_events where actor_id = ${ADMIN} order by id desc limit 1`);
    check("the second event records the old value", old[0]?.old_value === "on");

    // A no-op writes nothing.
    await writeOverride(ADMIN, "set", { switchName: S, scope: "user", targetUserId: U1, value: "off" }, deps);
    check("a no-op records no event", (await events("override_set")) === 2);

    // Clear.
    check("a clear is ok", (await writeOverride(ADMIN, "clear", { switchName: S, scope: "user", targetUserId: U1 }, deps)).ok);
    const { rows: cl } = await db.execute<{ old_value: string | null }>(sql`select old_value from admin_events where actor_id = ${ADMIN} and kind = 'override_cleared'`);
    check("it deletes the row and records override_cleared with its old value", (await rowsFor(S)) === before && cl[0]?.old_value === "off");

    // Refusals write nothing.
    const total = await count(sql`select count(*)::int as n from admin_events where actor_id = ${ADMIN}`);
    const saved = process.env[S];
    process.env[S] = "off";
    const killed = await writeOverride(ADMIN, "set", { switchName: S, scope: "app", value: "on" }, deps);
    if (saved === undefined) delete process.env[S];
    else process.env[S] = saved;
    check("a set under a kill is refused", !killed.ok && killed.error === "killed");
    const plumbing = await writeOverride(ADMIN, "set", { switchName: "LIST_CACHE_ENABLED", scope: "user", targetUserId: U1, value: "on" }, deps);
    check("a plumbing account override is refused", !plumbing.ok && plumbing.error === "plumbing");
    const nogroup = await writeOverride(ADMIN, "set", { switchName: S, scope: "group", groupId: "00000000-0000-4000-8000-000000000000", value: "on" }, deps);
    check("a group that does not exist is refused", !nogroup.ok && nogroup.error === "group");
    check("no refusal wrote an event", (await count(sql`select count(*)::int as n from admin_events where actor_id = ${ADMIN}`)) === total);

    // A real group's override.
    const { rows: g } = await db.execute<{ id: string }>(sql`insert into flag_groups (name, created_by) values (${`probe-${run}`}, ${ADMIN}) returning id`);
    group = g[0].id;
    check("a group set is ok", (await writeOverride(ADMIN, "set", { switchName: S, scope: "group", groupId: group, value: "on" }, deps)).ok);
    check("it is written", (await count(sql`select count(*)::int as n from flag_overrides where group_id = ${group}`)) === 1);

    // An unconfirmed model rise writes nothing; the confirmed count writes.
    const H = "HELP_ME_CHOOSE_ENABLED";
    const savedH = process.env[H];
    process.env[H] = "true";
    await db.execute(sql`insert into flag_overrides ("switch", scope, value, updated_by) values (${H}, 'app', 'off', ${ADMIN})
      on conflict on constraint flag_overrides_target_key do nothing`);
    const appRow = await count(sql`select count(*)::int as n from flag_overrides where "switch" = ${H} and scope = 'app' and updated_by = ${ADMIN}`);
    if (appRow === 1) {
      const r = await writeOverride(ADMIN, "clear", { switchName: H, scope: "app" }, deps);
      check("clearing an app-wide off over an env var that is true asks to confirm", !r.ok && r.error === "confirm" && r.preview.count === 2);
      check("and writes nothing", (await count(sql`select count(*)::int as n from flag_overrides where "switch" = ${H} and scope = 'app'`)) === 1);
      const c = await writeOverride(ADMIN, "clear", { switchName: H, scope: "app", confirmed: 2 }, deps);
      check("the confirmed count writes it", c.ok && (await count(sql`select count(*)::int as n from flag_overrides where "switch" = ${H} and scope = 'app'`)) === 0);
    } else {
      check("the branch already held an app-wide Help me choose row; the rise check needs a clean branch", false);
    }
    if (savedH === undefined) delete process.env[H];
    else process.env[H] = savedH;
  } finally {
    await db.execute(sql`delete from flag_overrides where updated_by = ${ADMIN}`);
    if (group) await db.execute(sql`delete from flag_groups where id = ${group}`);
    await db.execute(sql`delete from admin_events where actor_id = ${ADMIN}`);
  }
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
