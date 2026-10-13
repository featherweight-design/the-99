import { and, eq, gt, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { modelCalls } from "../../db/schema";
import { dailyLimitsFor, modelOwnerUserId, ownerShareMicro, readAllowance } from "../model/allowance";
import { ALLOWANCE_WINDOW_MS, type LedgerRow } from "../model/allowance-rule";
import { explainForAccounts, hubForAccount } from "../switches/explain";
import { readSwitchSnapshot } from "../switches/snapshot";
import { listAccounts, type Account } from "./accounts";
import {
  accountRows,
  accountTiles,
  creditsNow,
  featureSpend,
  featureTotal,
  initials,
  roleLine,
  switchGroups,
  utcMonthName,
  type AccountRow,
  type FeatureSpend,
  type SwitchGroups,
  type Tile,
} from "./account-page-rule";
import { monthOf, monthStart, shiftMonth } from "./costs-rule";
import { loadGroupHeads } from "./groups";
import { accountName } from "./names";

/**
 * The Accounts pages' reads (admin STATES A1 to A7, plan 9b). SERVER-ONLY. Every read is independent,
 * so they run in parallel; none is a transaction, so Clerk (`listAccounts`) is never called while a
 * connection is held. Spend and presses are the player's own presses (`origin = 'player'`) in this UTC
 * calendar month, refunds included, as the Costs page's per-account table counts them. Overrides and
 * memberships are read fresh, never through the 30-second memo, so a page drawn after a move shows it.
 */

/** This UTC calendar month, as the Costs page and the spend cap count it. */
function monthBounds(now: Date) {
  const month = monthOf(now);
  return { start: monthStart(month), end: monthStart(shiftMonth(month, 1)) };
}

const playerInMonth = (start: Date, end: Date) =>
  and(eq(modelCalls.origin, "player"), gte(modelCalls.createdAt, start), lt(modelCalls.createdAt, end));

/** The free window's rows for every account at once: what `readAllowance` counts, the paid lots aside. */
async function windowRows(now: Date): Promise<(LedgerRow & { userId: string })[]> {
  const rows = await db
    .select({ userId: modelCalls.userId, status: modelCalls.status, createdAt: modelCalls.createdAt })
    .from(modelCalls)
    .where(and(
      eq(modelCalls.origin, "player"),
      gt(modelCalls.createdAt, new Date(now.getTime() - ALLOWANCE_WINDOW_MS)),
      inArray(modelCalls.status, ["reserved", "spent"]),
      isNull(modelCalls.creditGrantId),
    ));
  return rows as (LedgerRow & { userId: string })[];
}

/** `overridesRead` is false when `readSwitchSnapshot()` failed: groups and switches then read as the env alone, and the page says so. */
export type AccountsListData = { rows: AccountRow[]; clerk: "ok" | "down"; overridesRead: boolean; month: string };

/** `/admin/accounts` (A1 to A3). */
export async function loadAccountsList(now: Date = new Date()): Promise<AccountsListData> {
  const { start, end } = monthBounds(now);
  const [{ accounts, clerk }, snapshot, heads, spendRows, ledger] = await Promise.all([
    listAccounts(),
    readSwitchSnapshot(),
    loadGroupHeads(),
    db
      .select({ userId: modelCalls.userId, micro: sql<string>`coalesce(sum(${modelCalls.costMicroUsd}), 0)` })
      .from(modelCalls)
      .where(playerInMonth(start, end))
      .groupBy(modelCalls.userId),
    windowRows(now),
  ]);
  const ids = accounts.map((a) => a.id);
  const limits = await dailyLimitsFor(db, ids);
  return {
    rows: accountRows({
      accounts,
      groupOf: snapshot?.groupOf ?? new Map(),
      groupNames: new Map(heads.map((g) => [g.id, g.name])),
      credits: creditsNow(ids, ledger, limits, now),
      spend: new Map(spendRows.map((r) => [r.userId, Number(r.micro)])),
    }),
    clerk,
    overridesRead: snapshot !== null,
    month: utcMonthName(now),
  };
}

export type AccountPage = {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  role: string;
  tiles: Tile[];
  group: { id: string; name: string } | null;
  groups: { id: string; name: string }[];
  switches: SwitchGroups;
  features: FeatureSpend[];
  featureTotal: { presses: number; spent: string };
  month: string;
  clerk: "ok" | "down";
  overridesRead: boolean;
};

/**
 * `/admin/accounts/<clerkId>` (A4 to A7). Null when the id is no account this environment knows: not
 * in the universe, and named by no membership, override or `model_calls` row.
 */
export async function loadAccountPage(userId: string, now: Date = new Date()): Promise<AccountPage | null> {
  // `system` is the batch spend's sentinel (`scripts/lib/system-spend.ts`), never an account, though
  // it has `model_calls` rows; the list leaves it out too (`accounts.ts`).
  if (userId === "system") return null;
  const { start, end } = monthBounds(now);
  const [{ accounts, clerk }, snapshot, heads, allowance, featureRows, called] = await Promise.all([
    listAccounts(),
    readSwitchSnapshot(),
    loadGroupHeads(),
    readAllowance(userId, now),
    db
      .select({ feature: modelCalls.feature, presses: sql<string>`count(*)`, micro: sql<string>`coalesce(sum(${modelCalls.costMicroUsd}), 0)` })
      .from(modelCalls)
      .where(and(eq(modelCalls.userId, userId), playerInMonth(start, end)))
      .groupBy(modelCalls.feature),
    db.select({ one: sql<number>`1` }).from(modelCalls).where(eq(modelCalls.userId, userId)).limit(1),
  ]);
  const listed: Account | undefined = accounts.find((a) => a.id === userId);
  const named = !!snapshot && (snapshot.groupOf.has(userId) || snapshot.overrides.some((o) => o.userId === userId));
  if (!listed && !named && called.length === 0) return null;
  const account: Account = listed ?? { id: userId, name: null, email: null };

  const groupNames = new Map(heads.map((g) => [g.id, g.name]));
  const groupId = snapshot?.groupOf.get(userId);
  const owner = modelOwnerUserId() === userId;
  const shareMicro = ownerShareMicro();
  const features = featureRows.map((r) => ({ feature: r.feature, presses: Number(r.presses), micro: Number(r.micro) }));
  const month = utcMonthName(now);
  return {
    id: userId,
    name: accountName(account),
    email: account.email,
    initials: initials(account),
    role: roleLine(owner, allowance.limit, shareMicro),
    tiles: accountTiles({
      credits: allowance,
      owner,
      shareMicro,
      spentMicro: features.reduce((n, f) => n + f.micro, 0),
      presses: features.reduce((n, f) => n + f.presses, 0),
      hub: hubForAccount(snapshot, userId),
      month,
    }),
    group: groupId ? { id: groupId, name: groupNames.get(groupId) ?? groupId } : null,
    groups: heads.map((g) => ({ id: g.id, name: g.name })).sort((a, b) => a.name.localeCompare(b.name, "en-US")),
    switches: switchGroups(explainForAccounts(snapshot, [userId]).get(userId)!, (id) => groupNames.get(id) ?? id),
    features: featureSpend(features),
    featureTotal: featureTotal(features),
    month,
    clerk,
    overridesRead: snapshot !== null,
  };
}
