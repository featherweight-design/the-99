import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { dailyLimitFor } from "../model/allowance";
import { featureWorstCaseMicroUsd } from "../model/prices";
import type { ModelFeature } from "../model/allowance-rule";
import { riseForAccounts, switchEnvValues } from "../switches/explain";
import type { ModelCapabilityKey } from "../switches/flags";
import { isSwitchName } from "../switches/registry";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";
import { clearSwitchSnapshot, SNAPSHOT_SQL } from "../switches/snapshot";
import { listAccounts, type Account } from "./accounts";
import { applyWrite, isNoop, validate, type Op, type Refusal, type Write, type WriteInput } from "./switch-writes-rule";

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
export type CapabilityCost = { key: ModelCapabilityKey; reserveMicroUsd: number; meanMicroUsd: number | null };
export type ConfirmPreview = {
  /** The accounts that gain a model capability, as named on the page. */
  names: string[];
  count: number;
  costs: CapabilityCost[];
  /** The distinct rolling-24-hour credit limits of those accounts, low to high. */
  credits: number[];
  /** How many accounts' What's new sheet gains an entry. */
  whatsNew: number;
};
export type WriteResult =
  | { ok: true }
  | { ok: false; error: Refusal | "group" | "failed" }
  | { ok: false; error: "confirm"; preview: ConfirmPreview };

export const SWITCH_WRITE_LOCK = "admin_switches";

// The Overview v2 changes the synopsis's model and method, so it is priced as the synopsis.
const featureOf = (key: ModelCapabilityKey): ModelFeature => (key === "overview_v2" ? "synopsis" : key);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readSnapshotIn(tx: Tx): Promise<SwitchSnapshot> {
  const { rows } = await tx.execute<{ overrides: OverrideRow[]; members: { userId: string; groupId: string }[] }>(sql.raw(SNAPSHOT_SQL));
  const [row] = rows;
  return { overrides: row.overrides.filter((o) => isSwitchName(o.switchName)), groupOf: new Map(row.members.map((m) => [m.userId, m.groupId])) };
}

async function preview(tx: Tx, rise: { accounts: string[]; capabilities: ModelCapabilityKey[]; whatsNew: string[] }, accounts: readonly Account[]): Promise<ConfirmPreview> {
  const features = [...new Set(rise.capabilities.map(featureOf))];
  const { rows } = await tx.execute<{ feature: string; mean: number | null }>(sql`
    select feature, avg(cost_micro_usd)::float8 as mean from model_calls
    where feature in (${sql.join(features.map((f) => sql`${f}`), sql`, `)}) and origin = 'player' and cost_micro_usd is not null
    group by feature`);
  // The Costs page's own mean (`costs-detail-rule.ts`): a player's priced presses. A free method-change
  // rewrite (origin system) is not a press.
  const mean = new Map(rows.map((r) => [r.feature, r.mean === null ? null : Math.round(r.mean)]));
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return {
    names: rise.accounts.map((id) => byId.get(id)?.name ?? byId.get(id)?.email ?? id),
    count: rise.accounts.length,
    costs: rise.capabilities.map((key) => ({ key, reserveMicroUsd: featureWorstCaseMicroUsd(featureOf(key)), meanMicroUsd: mean.get(featureOf(key)) ?? null })),
    credits: [...new Set(rise.accounts.map(dailyLimitFor))].sort((a, b) => a - b),
    whatsNew: rise.whatsNew.length,
  };
}

/** Raised inside the transaction to end it with nothing written and hand back a result. */
class Abort {
  constructor(readonly result: WriteResult) {}
}

async function writeIn(tx: Tx, actorId: string, w: Write, accounts: readonly Account[], riseOf: WriteDeps["rise"]): Promise<{ wrote: boolean }> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${SWITCH_WRITE_LOCK}, 0))`);
  if (w.scope === "group") {
    const { rows } = await tx.execute(sql`select id from flag_groups where id = ${w.groupId} for share`);
    if (rows.length === 0) throw new Abort({ ok: false, error: "group" });
  }
  const before = await readSnapshotIn(tx);
  const { rows: current } = await tx.execute<{ value: string; note: string | null }>(sql`
    select value, note from flag_overrides
    where "switch" = ${w.name} and scope = ${w.scope}
      and group_id is not distinct from ${w.groupId}::uuid and user_id is not distinct from ${w.userId}
    for update`);
  const row = current[0] ?? null;
  if (isNoop(row, w)) return { wrote: false };

  const rise = riseOf(before, applyWrite(before, w), accounts.map((a) => a.id));
  if (rise.accounts.length > 0 && w.confirmed !== rise.accounts.length) {
    throw new Abort({ ok: false, error: "confirm", preview: await preview(tx, rise, accounts) });
  }

  if (w.op === "set") {
    await tx.execute(sql`
      insert into flag_overrides ("switch", scope, group_id, user_id, value, note, updated_by, updated_at)
      values (${w.name}, ${w.scope}, ${w.groupId}::uuid, ${w.userId}, ${w.value}, ${w.note}, ${actorId}, now())
      on conflict on constraint flag_overrides_target_key
      do update set value = excluded.value, note = excluded.note, updated_by = excluded.updated_by, updated_at = excluded.updated_at`);
  } else {
    await tx.execute(sql`
      delete from flag_overrides
      where "switch" = ${w.name} and scope = ${w.scope}
        and group_id is not distinct from ${w.groupId}::uuid and user_id is not distinct from ${w.userId}`);
  }
  await tx.execute(sql`
    insert into admin_events (actor_id, kind, "switch", scope, group_id, user_id, old_value, new_value, note)
    values (${actorId}, ${w.op === "set" ? "override_set" : "override_cleared"}, ${w.name}, ${w.scope}, ${w.groupId}::uuid, ${w.userId},
      ${row?.value ?? null}, ${w.value}, ${w.note})`);
  return { wrote: true };
}

export type WriteDeps = {
  accounts: () => Promise<{ accounts: Account[] }>;
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
    revalidatePath("/admin/switches");
    revalidatePath("/admin/switches/[name]", "page");
  },
};

export async function writeOverride(actorId: string, op: Op, input: WriteInput, deps: WriteDeps = DEPS): Promise<WriteResult> {
  const { accounts } = await deps.accounts();
  const checked = validate(op, input, deps.env(), new Set(accounts.map((a) => a.id)));
  if (!checked.ok) return checked;
  let wrote: boolean;
  try {
    ({ wrote } = await deps.transaction((tx) => writeIn(tx, actorId, checked.write, accounts, deps.rise)));
  } catch (error) {
    if (error instanceof Abort) return error.result;
    console.error(`admin: the override write on ${checked.write.name} failed`);
    return { ok: false, error: "failed" };
  }
  if (wrote) deps.afterCommit();
  return { ok: true };
}
