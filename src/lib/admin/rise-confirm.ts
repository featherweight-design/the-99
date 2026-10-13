import { sql } from "drizzle-orm";
import type { db } from "../../db";
import { dailyLimitsFor } from "../model/allowance";
import { featureWorstCaseMicroUsd } from "../model/prices";
import type { ModelFeature } from "../model/allowance-rule";
import type { SwitchRise } from "../switches/explain";
import type { ModelCapabilityKey } from "../switches/flags";
import { isSwitchName } from "../switches/registry";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";
import { SNAPSHOT_SQL } from "../switches/snapshot";
import type { Account } from "./accounts";

/**
 * What every admin write that can move a switch shares (admin plan 8c and 9a): the one advisory lock,
 * the snapshot read inside the transaction, and the rise check with its confirm preview. An override
 * write moves a switch directly; a group save moves one by changing who is in a group. Both run
 * `checkRise` on the snapshot before and after, so a membership move that raises model access is
 * confirmed exactly as an override that does.
 *
 * Reached only through `switch-writes.ts` and `group-writes.ts`, which only `src/app/admin/**` imports.
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
export type RiseRefusal = { ok: false; error: "accounts" } | { ok: false; error: "confirm"; preview: ConfirmPreview };

/** One advisory lock for every switch write and every group save: either can move another's rise. */
export const SWITCH_WRITE_LOCK = "admin_switches";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Raised inside a transaction to end it with nothing written and hand back a result. */
export class Abort<R> {
  constructor(readonly result: R) {}
}

/** An id no override or membership can name: the stand-in for an account a partial list leaves out. */
export const UNLISTED = "\u0000unlisted";

export async function lockSwitchWrites(tx: Tx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${SWITCH_WRITE_LOCK}, 0))`);
}

export async function readSnapshotIn(tx: Tx): Promise<SwitchSnapshot> {
  const { rows } = await tx.execute<{ overrides: OverrideRow[]; members: { userId: string; groupId: string }[] }>(sql.raw(SNAPSHOT_SQL));
  const [row] = rows;
  return { overrides: row.overrides.filter((o) => isSwitchName(o.switchName)), groupOf: new Map(row.members.map((m) => [m.userId, m.groupId])) };
}

// The Overview v2 changes the synopsis's model and method, so it is priced as the synopsis.
const featureOf = (key: ModelCapabilityKey): ModelFeature => (key === "overview_v2" ? "synopsis" : key);

async function preview(tx: Tx, rise: SwitchRise, accounts: readonly Account[]): Promise<ConfirmPreview> {
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
    // Each account's own limit (`dailyLimit`: its group's allowance, the owner's own, or the
    // default), read in one statement in this transaction. A group save checks after its own writes,
    // so this reads the limit the save leaves.
    credits: [...new Set((await dailyLimitsFor(tx, rise.accounts)).values())].sort((a, b) => a - b),
    whatsNew: rise.whatsNew.length,
  };
}

export type RiseOf = (before: SwitchSnapshot, after: SwitchSnapshot, userIds: readonly string[]) => SwitchRise;

/**
 * Null when the write may go ahead; otherwise what to hand back with nothing written.
 *
 * With Clerk down the list is the stored ids alone, so an account that never pressed is missing
 * from it. One unlisted account (no row of its own, no group) stands for every such account: a
 * write that raises model access for it is refused rather than counted short. Every account the
 * overrides and memberships name joins it too, so a group member who never pressed is counted and
 * confirmed, not missed. A write that raises model access for N accounts needs `confirmed === N`;
 * anything else gets a fresh preview, so a stale confirm is asked again.
 */
export async function checkRise(
  tx: Tx,
  args: { before: SwitchSnapshot; after: SwitchSnapshot; accounts: readonly Account[]; clerkDown: boolean; confirmed: number | null; rise: RiseOf },
): Promise<RiseRefusal | null> {
  const { before, after, accounts, clerkDown, confirmed } = args;
  const ids = accounts.map((a) => a.id);
  const named = [...before.overrides, ...after.overrides].flatMap((o) => (o.userId ? [o.userId] : [])).concat([...before.groupOf.keys(), ...after.groupOf.keys()]);
  const rise = args.rise(before, after, clerkDown ? [...new Set([...ids, ...named]), UNLISTED] : ids);
  if (rise.accounts.includes(UNLISTED)) return { ok: false, error: "accounts" };
  if (rise.accounts.length > 0 && confirmed !== rise.accounts.length) {
    return { ok: false, error: "confirm", preview: await preview(tx, rise, accounts) };
  }
  return null;
}
