import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { riseForAccounts } from "../switches/explain";
import { clearSwitchSnapshot } from "../switches/snapshot";
import { listAccounts, type Account } from "./accounts";
import { groupEvents, isGroupId, memberDiff, validateGroup, type Desired, withMembership, type GroupInput, type GroupRefusal, type SavedGroup } from "./groups-rule";
import { Abort, checkRise, lockSwitchWrites, readSnapshotIn, type ConfirmPreview, type RiseOf, type Tx } from "./rise-confirm";

/**
 * A group's create or save (admin plan 9a; STATES G2 to G4, G7). Only `src/app/admin/**` may import
 * this (`group-writes.test.ts` pins it), so no module can reach it past `requireAdmin()`.
 *
 * 1. Outside any transaction: the account universe (Clerk is never called while a connection is
 *    held) and `validateGroup`. A refusal writes nothing.
 * 2. One transaction, under the switch writes' advisory lock, because a membership move changes who
 *    a group override reaches: the group row `for update` (a save), the overrides and memberships
 *    read inside it, the membership diff against those rows, then the rise, confirmed exactly as an
 *    override write's is. A name another group holds is refused; the lock serializes every group
 *    write, so the check cannot race. A save that changes nothing writes nothing. Then the writes and
 *    their `admin_events` rows.
 * 3. After the commit only: the memo clear and the revalidation of every admin page, since the head
 *    names the group (`revalidatePath("/admin", "layout")`).
 */
export type GroupWriteResult =
  | { ok: true; id: string }
  | { ok: false; error: GroupRefusal | "name" | "group" | "accounts" | "failed" }
  | { ok: false; error: "confirm"; preview: ConfirmPreview };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;
}

async function writeIn(
  tx: Tx,
  actorId: string,
  id: string | null,
  desired: Desired,
  accounts: readonly Account[],
  clerkDown: boolean,
  riseOf: RiseOf,
  newId: () => string,
): Promise<{ id: string; wrote: boolean }> {
  await lockSwitchWrites(tx);
  let saved: SavedGroup | null = null;
  if (id !== null) {
    const { rows } = await tx.execute<{ id: string; name: string; description: string | null; daily_allowance: number | null }>(sql`
      select id, name, description, daily_allowance from flag_groups where id = ${id}::uuid for update`);
    const [row] = rows;
    if (!row) throw new Abort<GroupWriteResult>({ ok: false, error: "group" });
    saved = { id: row.id, name: row.name, description: row.description, dailyAllowance: row.daily_allowance };
  }
  const groupId = saved?.id ?? newId();

  const before = await readSnapshotIn(tx);
  // A member must be an account this environment lists, or one the group already holds (Clerk down).
  const allowed = new Set(accounts.map((a) => a.id));
  for (const [u, g] of before.groupOf) if (g === groupId) allowed.add(u);
  if (desired.members.some((m) => !allowed.has(m))) throw new Abort<GroupWriteResult>({ ok: false, error: "members" });

  const diff = memberDiff(groupId, desired.members, before.groupOf);
  const events = groupEvents(groupId, saved, desired, diff);
  if (events.length === 0) return { id: groupId, wrote: false };

  if (desired.name !== saved?.name) {
    const { rows } = await tx.execute(sql`select 1 from flag_groups where name = ${desired.name} and id <> ${groupId}::uuid`);
    if (rows.length > 0) throw new Abort<GroupWriteResult>({ ok: false, error: "name" });
  }

  if (saved === null) {
    await tx.execute(sql`
      insert into flag_groups (id, name, description, daily_allowance, created_by)
      values (${groupId}::uuid, ${desired.name}, ${desired.description}, ${desired.dailyAllowance}, ${actorId})`);
  } else if (saved.name !== desired.name || saved.description !== desired.description || saved.dailyAllowance !== desired.dailyAllowance) {
    await tx.execute(sql`
      update flag_groups set name = ${desired.name}, description = ${desired.description}, daily_allowance = ${desired.dailyAllowance}
      where id = ${groupId}::uuid`);
  }
  for (const userId of diff.removes) {
    await tx.execute(sql`delete from flag_group_members where user_id = ${userId} and group_id = ${groupId}::uuid`);
  }
  // One row per account (the key is `user_id`), so a move replaces the row it had.
  for (const { userId } of diff.adds) {
    await tx.execute(sql`
      insert into flag_group_members (user_id, group_id, added_by, added_at) values (${userId}, ${groupId}::uuid, ${actorId}, now())
      on conflict (user_id) do update set group_id = excluded.group_id, added_by = excluded.added_by, added_at = excluded.added_at`);
  }
  // The rise is checked AFTER the group row and memberships are written, inside this transaction, so the
  // confirm's credits read each account's limit as the save leaves it (a new group's allowance, or the
  // allowance of the group an account moves to). A refusal throws, and the transaction writes nothing.
  const refusal = await checkRise(tx, { before, after: withMembership(before, groupId, diff), accounts, clerkDown, confirmed: desired.confirmed, rise: riseOf });
  if (refusal) throw new Abort<GroupWriteResult>(refusal);
  for (const e of events) {
    await tx.execute(sql`
      insert into admin_events (actor_id, kind, group_id, user_id, old_value, new_value)
      values (${actorId}, ${e.kind}, ${e.groupId}::uuid, ${e.userId}, ${e.oldValue}, ${e.newValue})`);
  }
  return { id: groupId, wrote: true };
}

export type GroupWriteDeps = {
  accounts: () => Promise<{ accounts: Account[]; clerk?: "ok" | "down" }>;
  rise: RiseOf;
  transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  afterCommit: () => void;
  newId: () => string;
};

const DEPS: GroupWriteDeps = {
  accounts: listAccounts,
  rise: riseForAccounts,
  transaction: (fn) => db.transaction(fn),
  afterCommit: () => {
    clearSwitchSnapshot();
    revalidatePath("/admin", "layout");
  },
  newId: randomUUID,
};

/** Create a group (`id` null) or save one, from its whole desired state. */
export async function writeGroup(actorId: string, id: string | null, input: GroupInput, deps: GroupWriteDeps = DEPS): Promise<GroupWriteResult> {
  // Format first, so a refusal costs no Clerk read.
  if (id !== null && !isGroupId(id)) return { ok: false, error: "group" };
  const checked = validateGroup(input);
  if (!checked.ok) return checked;
  const { accounts, clerk } = await deps.accounts();
  let out: { id: string; wrote: boolean };
  try {
    out = await deps.transaction((tx) => writeIn(tx, actorId, id, checked.desired, accounts, clerk === "down", deps.rise, deps.newId));
  } catch (error) {
    if (error instanceof Abort) return error.result as GroupWriteResult;
    if (isUniqueViolation(error)) return { ok: false, error: "name" };
    console.error(`admin: the group ${id === null ? "create" : "save"} failed`);
    return { ok: false, error: "failed" };
  }
  if (out.wrote) deps.afterCommit();
  return { ok: true, id: out.id };
}

/**
 * An account's move from the Accounts page (admin plan 9b, STATES G7): into a group, between groups or
 * out of every group, through the group writes' own path. One transaction under the switch writes'
 * lock: the target group `for update` (it must still exist), the memberships read inside it, then the
 * one membership row written, the rise checked AFTER that write (so the confirm's credits read the
 * limit the move leaves) and confirmed exactly as a group save's is, and the events: `member_removed`
 * on the group left, then `member_added` on the group joined. A move to where the account already is
 * writes nothing. The memo clear and the revalidation run after the commit only.
 */
export type MoveResult =
  | { ok: true }
  | { ok: false; error: "group" | "account" | "accounts" | "failed" }
  | { ok: false; error: "confirm"; preview: ConfirmPreview };

export async function moveAccount(
  actorId: string,
  userId: string,
  groupId: string | null,
  confirmed: number | null = null,
  deps: GroupWriteDeps = DEPS,
): Promise<MoveResult> {
  if (typeof userId !== "string" || userId === "" || userId === "system") return { ok: false, error: "account" };
  if (groupId !== null && (typeof groupId !== "string" || !isGroupId(groupId))) return { ok: false, error: "group" };
  const { accounts, clerk } = await deps.accounts();
  let wrote: boolean;
  try {
    wrote = await deps.transaction(async (tx) => {
      await lockSwitchWrites(tx);
      if (groupId !== null) {
        const { rows } = await tx.execute(sql`select id from flag_groups where id = ${groupId}::uuid for update`);
        if (rows.length === 0) throw new Abort<MoveResult>({ ok: false, error: "group" });
      }
      const before = await readSnapshotIn(tx);
      // The account must be one this environment lists, or one a membership or an override already names (Clerk down).
      const known = accounts.some((a) => a.id === userId) || before.groupOf.has(userId) || before.overrides.some((o) => o.userId === userId);
      if (!known) throw new Abort<MoveResult>({ ok: false, error: "account" });
      const from = before.groupOf.get(userId) ?? null;
      if (from === groupId) return false;

      const groupOf = new Map(before.groupOf);
      if (groupId === null) {
        await tx.execute(sql`delete from flag_group_members where user_id = ${userId}`);
        groupOf.delete(userId);
      } else {
        // One row per account (the key is `user_id`), so a move replaces the row it had.
        await tx.execute(sql`
          insert into flag_group_members (user_id, group_id, added_by, added_at) values (${userId}, ${groupId}::uuid, ${actorId}, now())
          on conflict (user_id) do update set group_id = excluded.group_id, added_by = excluded.added_by, added_at = excluded.added_at`);
        groupOf.set(userId, groupId);
      }
      const refusal = await checkRise(tx, { before, after: { ...before, groupOf }, accounts, clerkDown: clerk === "down", confirmed, rise: deps.rise });
      if (refusal) throw new Abort<MoveResult>(refusal);
      const events = [...(from ? [{ kind: "member_removed", group: from }] : []), ...(groupId ? [{ kind: "member_added", group: groupId }] : [])];
      for (const e of events) {
        await tx.execute(sql`
          insert into admin_events (actor_id, kind, group_id, user_id, old_value, new_value)
          values (${actorId}, ${e.kind}, ${e.group}::uuid, ${userId}, ${null}, ${null})`);
      }
      return true;
    });
  } catch (error) {
    if (error instanceof Abort) return error.result as MoveResult;
    console.error("admin: an account's move failed");
    return { ok: false, error: "failed" };
  }
  if (wrote) deps.afterCommit();
  return { ok: true };
}
