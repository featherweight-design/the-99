// Proves the admin's group writes (admin plan 9a) against a real database: a create and its event, a
// taken name refused, a rename, a description and daily credits set and cleared with their events, a
// plain add, a move from another group (removed there, then added here, and one membership row), a
// removal, and a membership change that raises model access asking to confirm before it writes.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. It writes as made-up accounts and removes every
// row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:admin-groups
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const ADMIN = `probe_admin_${run}`;
const U1 = `probe_gr_a_${run}`;
const U2 = `probe_gr_b_${run}`;
const U3 = `probe_gr_c_${run}`;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:admin-groups: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:admin-groups: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:admin-groups: database reports ${rows[0]?.b}, not ${named}`);

  const { writeGroup } = await import("../src/lib/admin/group-writes");
  const { riseForAccounts } = await import("../src/lib/switches/explain");
  const { randomUUID } = await import("node:crypto");
  let cleared = 0;
  // The probe's own universe, so Clerk is never asked; the rest is the shipped path.
  const deps = {
    accounts: async () => ({ accounts: [U1, U2, U3].map((id) => ({ id, name: id, email: null })) }),
    rise: riseForAccounts,
    transaction: <T,>(fn: Parameters<typeof db.transaction<T>>[0]) => db.transaction(fn),
    afterCommit: () => void cleared++,
    newId: randomUUID,
  };
  const count = async (q: ReturnType<typeof sql>) => Number((await db.execute<{ n: number }>(q)).rows[0].n);
  const eventsOf = async (groupId: string) =>
    (
      await db.execute<{ kind: string; user_id: string | null; old_value: string | null; new_value: string | null }>(
        sql`select kind, user_id, old_value, new_value from admin_events where actor_id = ${ADMIN} and group_id = ${groupId}::uuid order by id`,
      )
    ).rows;
  const groupOf = async (userId: string) =>
    (await db.execute<{ group_id: string }>(sql`select group_id from flag_group_members where user_id = ${userId}`)).rows.map((r) => r.group_id);
  const nameA = `probe-a-${run}`;
  const nameB = `probe-b-${run}`;
  const H = "HELP_ME_CHOOSE_ENABLED";
  const savedH = process.env[H];

  try {
    // Create, with one member.
    const a = await writeGroup(ADMIN, null, { name: nameA, members: [U1] }, deps);
    check("a create is ok", a.ok);
    if (!a.ok) throw new Error("the create failed; nothing further can be proved");
    const A = a.id;
    check("it records group_created with the name, then member_added", JSON.stringify((await eventsOf(A)).map((e) => [e.kind, e.new_value ?? e.user_id])) === JSON.stringify([["group_created", nameA], ["member_added", U1]]));
    check("the memo is cleared after the commit", cleared === 1);

    // A taken name.
    const dup = await writeGroup(ADMIN, null, { name: nameA }, deps);
    check("a name another group holds is refused", !dup.ok && dup.error === "name");
    check("and nothing is written", (await count(sql`select count(*)::int as n from flag_groups where name = ${nameA}`)) === 1);

    // Rename, describe and set credits in one save, then clear the credits.
    const renamed = `probe-a2-${run}`;
    check("a rename, a description and daily credits save", (await writeGroup(ADMIN, A, { name: renamed, description: "probe group", dailyAllowance: 7, members: [U1] }, deps)).ok);
    const fields = (await eventsOf(A)).slice(2);
    check(
      "they record group_renamed, group_described and group_allowance_set",
      JSON.stringify(fields.map((e) => [e.kind, e.old_value, e.new_value])) ===
        JSON.stringify([["group_renamed", nameA, renamed], ["group_described", null, "probe group"], ["group_allowance_set", null, "7"]]),
    );
    check("the row holds them", (await count(sql`select count(*)::int as n from flag_groups where id = ${A}::uuid and name = ${renamed} and daily_allowance = 7`)) === 1);
    check("clearing the credits saves", (await writeGroup(ADMIN, A, { name: renamed, description: "probe group", dailyAllowance: null, members: [U1] }, deps)).ok);
    const last = (await eventsOf(A)).at(-1);
    check("and records group_allowance_set from 7 to null", last?.kind === "group_allowance_set" && last.old_value === "7" && last.new_value === null);
    const n = (await eventsOf(A)).length;
    check("a save that changes nothing is ok", (await writeGroup(ADMIN, A, { name: renamed, description: "probe group", members: [U1] }, deps)).ok);
    check("and records nothing", (await eventsOf(A)).length === n);

    // A second group, then a move from it and a plain add.
    const b = await writeGroup(ADMIN, null, { name: nameB, members: [U2] }, deps);
    if (!b.ok) throw new Error("the second create failed");
    const B = b.id;
    check("a move and an add save", (await writeGroup(ADMIN, A, { name: renamed, description: "probe group", members: [U1, U2, U3] }, deps)).ok);
    const fromB = (await eventsOf(B)).at(-1);
    check("the move records member_removed on the group it leaves", fromB?.kind === "member_removed" && fromB.user_id === U2);
    const added = (await eventsOf(A)).slice(n);
    check("then member_added here, for the move and the add", JSON.stringify(added.map((e) => [e.kind, e.user_id])) === JSON.stringify([["member_added", U2], ["member_added", U3]]));
    check("the moved account has one membership row, in the new group", JSON.stringify(await groupOf(U2)) === JSON.stringify([A]));

    // A removal.
    check("a removal saves", (await writeGroup(ADMIN, A, { name: renamed, description: "probe group", members: [U1, U2] }, deps)).ok);
    const removed = (await eventsOf(A)).at(-1);
    check("it records member_removed and deletes the row", removed?.kind === "member_removed" && removed.user_id === U3 && (await groupOf(U3)).length === 0);

    // A membership change that raises model access asks to confirm first.
    process.env[H] = "false";
    await db.execute(sql`insert into flag_overrides ("switch", scope, group_id, value, updated_by) values (${H}, 'group', ${A}::uuid, 'on', ${ADMIN})`);
    const before = (await eventsOf(A)).length;
    const r = await writeGroup(ADMIN, A, { name: renamed, description: "probe group", members: [U1, U2, U3] }, deps);
    check("adding an account to a group that turns a model feature on asks to confirm", !r.ok && r.error === "confirm" && r.preview.count === 1);
    check("and writes nothing", (await groupOf(U3)).length === 0 && (await eventsOf(A)).length === before);
    const c = await writeGroup(ADMIN, A, { name: renamed, description: "probe group", members: [U1, U2, U3], confirmed: 1 }, deps);
    check("the confirmed count writes it", c.ok && JSON.stringify(await groupOf(U3)) === JSON.stringify([A]));
  } finally {
    if (savedH === undefined) delete process.env[H];
    else process.env[H] = savedH;
    await db.execute(sql`delete from flag_overrides where updated_by = ${ADMIN}`);
    // Members go with their groups (on delete cascade).
    await db.execute(sql`delete from flag_groups where created_by = ${ADMIN}`);
    await db.execute(sql`delete from admin_events where actor_id = ${ADMIN}`);
  }
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
