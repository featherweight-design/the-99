import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { riseForAccounts, switchEnvValues } from "../switches/explain";
import { isSwitchName } from "../switches/registry";
import { isKilled, KILLED } from "../switches/resolve";
import { clearSwitchSnapshot } from "../switches/snapshot";
import { listAccounts, type Account } from "./accounts";
import { Abort, checkRise, lockSwitchWrites, readSnapshotIn, type ConfirmPreview, type Tx } from "./rise-confirm";
import { applyWrite, isNoop, validate, type Op, type Refusal, type Write, type WriteInput } from "./switch-writes-rule";

export { SWITCH_WRITE_LOCK, type CapabilityCost, type ConfirmPreview } from "./rise-confirm";

/**
 * An admin override write (admin plan 8c, "The write, in order"). Only `src/app/admin/**` may import
 * this (`switch-writes.test.ts` pins it), so no module can reach it past `requireAdmin()`.
 *
 * 1. Outside any transaction: the account universe (Clerk is never called while a connection is
 *    held), the env values, and `validate`. A refusal writes nothing.
 * 2. One transaction: one advisory lock for every switch write (a parent's write moves its
 *    children's rise), the group `for share`, the overrides and memberships read inside it, the
 *    target row `for update`, then the rise. A write that raises a model capability for N accounts
 *    needs `confirmed === N`; anything else returns the preview and writes nothing, so a stale
 *    confirm gets a fresh one. A no-op writes nothing. Then the mutate and its `admin_events` row.
 * 3. After the commit only: the memo clear and the revalidations. Clearing inside the transaction
 *    would let a concurrent request re-read the old rows and hold them for 30 seconds.
 */
export type WriteResult =
  | { ok: true }
  | { ok: false; error: Refusal | "group" | "accounts" | "failed" | "stale" }
  | { ok: false; error: "confirm"; preview: ConfirmPreview };

async function writeIn(tx: Tx, actorId: string, w: Write, accounts: readonly Account[], clerkDown: boolean, riseOf: WriteDeps["rise"]): Promise<{ wrote: boolean }> {
  await lockSwitchWrites(tx);
  if (w.scope === "group") {
    const { rows } = await tx.execute(sql`select id from flag_groups where id = ${w.groupId} for share`);
    if (rows.length === 0) throw new Abort<WriteResult>({ ok: false, error: "group" });
  }
  const before = await readSnapshotIn(tx);
  const { rows: current } = await tx.execute<{ value: string; note: string | null }>(sql`
    select value, note from flag_overrides
    where "switch" = ${w.name} and scope = ${w.scope}
      and group_id is not distinct from ${w.groupId}::uuid and user_id is not distinct from ${w.userId}
    for update`);
  const row = current[0] ?? null;
  // A database kill (`killed`, app row only) is set and lifted on the app row itself, by the App-wide control (plan
  // PR 3): its write carries the value the admin saw (`expected`), and is refused when the locked row reads otherwise.
  // A group or account Set under a kill would be served to nobody, so it is refused, as under the env stop (`validate`);
  // a clear of one is allowed. A kill written by SQL takes no advisory lock, so the snapshot can miss one that commits
  // after it: the app row's own lock (`row`) and the mutation's guard (`guard`) catch that one.
  const refused = new Abort<WriteResult>({ ok: false, error: "killed" });
  const stale = new Abort<WriteResult>({ ok: false, error: "stale" });
  if (w.scope !== "app" && w.op === "set" && isSwitchName(w.name) && isKilled(w.name, {} as NodeJS.ProcessEnv, before.overrides)) throw refused;
  if (w.scope === "app") {
    // No `expected`: a write that never saw a kill, refused over one as before this control existed.
    if (w.expected === undefined ? row?.value === KILLED : (row?.value ?? null) !== w.expected) throw w.expected === undefined ? refused : stale;
  }
  if (isNoop(row, w)) return { wrote: false };

  const refusal = await checkRise(tx, { before, after: applyWrite(before, w), accounts, clerkDown, confirmed: w.confirmed, rise: riseOf });
  if (refusal) throw new Abort<WriteResult>(refusal);

  // The row the mutation may touch: the value the admin saw on the app row, else any but a kill. A row that appeared
  // after the locked read (a SQL kill's insert) fails it, so the upsert returns nothing and the write is refused.
  const guard = w.scope === "app" && w.expected !== undefined ? sql`flag_overrides.value is not distinct from ${w.expected}::text` : sql`flag_overrides.value <> 'killed'`;
  if (w.op === "set") {
    const wrote = await tx.execute(sql`
      insert into flag_overrides ("switch", scope, group_id, user_id, value, note, updated_by, updated_at)
      values (${w.name}, ${w.scope}, ${w.groupId}::uuid, ${w.userId}, ${w.value}, ${w.note}, ${actorId}, now())
      on conflict on constraint flag_overrides_target_key
      do update set value = excluded.value, note = excluded.note, updated_by = excluded.updated_by, updated_at = excluded.updated_at
      where ${guard}
      returning id`);
    if (wrote.rows.length === 0) throw w.scope === "app" && w.expected !== undefined ? stale : refused;
  } else {
    await tx.execute(sql`
      delete from flag_overrides
      where "switch" = ${w.name} and scope = ${w.scope}
        and group_id is not distinct from ${w.groupId}::uuid and user_id is not distinct from ${w.userId}
        and ${guard}`);
  }
  await tx.execute(sql`
    insert into admin_events (actor_id, kind, "switch", scope, group_id, user_id, old_value, new_value, note)
    values (${actorId}, ${w.op === "set" ? "override_set" : "override_cleared"}, ${w.name}, ${w.scope}, ${w.groupId}::uuid, ${w.userId},
      ${row?.value ?? null}, ${w.value}, ${w.note})`);
  return { wrote: true };
}

export type WriteDeps = {
  accounts: () => Promise<{ accounts: Account[]; clerk?: "ok" | "down" }>;
  env: typeof switchEnvValues;
  rise: typeof riseForAccounts;
  transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  afterCommit: () => void;
};

const DEPS: WriteDeps = {
  accounts: listAccounts,
  env: switchEnvValues,
  rise: riseForAccounts,
  transaction: (fn) => db.transaction(fn),
  afterCommit: () => {
    clearSwitchSnapshot();
    // Every admin page draws the switch state (the Groups pages carry overrides and their effects), so
    // the whole admin layout is revalidated, as a group write does.
    revalidatePath("/admin", "layout");
  },
};

export async function writeOverride(actorId: string, op: Op, input: WriteInput, deps: WriteDeps = DEPS): Promise<WriteResult> {
  const { accounts, clerk } = await deps.accounts();
  const checked = validate(op, input, deps.env(), new Set(accounts.map((a) => a.id)));
  if (!checked.ok) return checked;
  let wrote: boolean;
  try {
    ({ wrote } = await deps.transaction((tx) => writeIn(tx, actorId, checked.write, accounts, clerk === "down", deps.rise)));
  } catch (error) {
    if (error instanceof Abort) return error.result as WriteResult;
    console.error(`admin: the override write on ${checked.write.name} failed`);
    return { ok: false, error: "failed" };
  }
  if (wrote) deps.afterCommit();
  return { ok: true };
}
