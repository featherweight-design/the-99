import { and, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { adminSettings, modelCalls } from "../../db/schema";
import { modelOwnerUserId, ownerShareMicro, readAllowance } from "../model/allowance";
import {
  costSummary,
  settingsForMonth,
  monthStart,
  sameMonth,
  monthOf,
  shiftMonth,
  type CostRows,
  type CostSummary,
  type DayRow,
  type MonthKey,
  type SettingKey,
} from "./costs-rule";

/**
 * The Costs core's reads (admin STATES C1 to C6). SERVER-ONLY: it imports the database. Read only:
 * every figure is `model_calls` (locked rule 11) plus the settings the admin enters. The month is a
 * UTC calendar month, and a row belongs to the month its `created_at` falls in, as the spend cap
 * counts it. Card labels and the eval ledgers are read by the detail build, not here.
 */

// Drizzle drops the table from a column interpolated into a single-table select's projection
// (AGENTS.md). Harmless here, with no subquery, but every column in a projection is written out
// qualified so the emitted SQL says what it reads.
const col = (name: string) => sql`${modelCalls}.${sql.identifier(name)}`;

/** Runs and dollars per UTC day and origin. Every status counts as a run; dollars are what was recorded. */
export function dayRowsQuery(start: Date, end: Date) {
  const day = sql<number>`extract(day from ${col("created_at")})::int`;
  const origin = sql<string>`${col("origin")}`;
  return db
    .select({
      day,
      origin,
      runs: sql<number>`count(*)::int`,
      micro: sql<string>`coalesce(sum(${col("cost_micro_usd")}), 0)`,
    })
    .from(modelCalls)
    .where(and(gte(modelCalls.createdAt, start), lt(modelCalls.createdAt, end)))
    .groupBy(day, origin);
}

/**
 * The month's player accounts and the owner's own player spend, and the previous month's runs and
 * dollars, in one pass over the two months. Filters, not a `where` on origin: the previous month
 * counts every origin.
 */
export function monthFiguresQuery(previousStart: Date, start: Date, end: Date, ownerId: string | null) {
  const inMonth = sql`${col("created_at")} >= ${start}`;
  const before = sql`${col("created_at")} < ${start}`;
  const player = sql`${col("origin")} = 'player'`;
  return db
    .select({
      playerAccounts: sql<number>`(count(distinct ${col("user_id")}) filter (where ${inMonth} and ${player}))::int`,
      ownerMicro: sql<string>`coalesce(sum(${col("cost_micro_usd")}) filter (where ${inMonth} and ${player} and ${col("user_id")} = ${ownerId ?? ""}), 0)`,
      previousRuns: sql<number>`(count(*) filter (where ${before}))::int`,
      previousMicro: sql<string>`coalesce(sum(${col("cost_micro_usd")}) filter (where ${before}), 0)`,
    })
    .from(modelCalls)
    .where(and(gte(modelCalls.createdAt, previousStart), lt(modelCalls.createdAt, end)));
}

export async function loadCosts(month: MonthKey, adminId: string, now: Date = new Date()): Promise<CostSummary> {
  const start = monthStart(month);
  const end = monthStart(shiftMonth(month, 1));
  const ownerId = modelOwnerUserId();
  const current = sameMonth(month, monthOf(now));
  const [days, [figures], settingRows, allowance] = await Promise.all([
    dayRowsQuery(start, end),
    monthFiguresQuery(monthStart(shiftMonth(month, -1)), start, end, ownerId),
    db.select().from(adminSettings),
    // The pause is the allowance's own verdict, with no feature named: no press at all fits.
    current ? readAllowance(adminId, now) : null,
  ]);

  const rows: CostRows = {
    days: days.map((d): DayRow => ({
      day: Number(d.day),
      origin: d.origin === "system" ? "system" : "player",
      runs: Number(d.runs),
      micro: Number(d.micro),
    })),
    playerAccounts: Number(figures?.playerAccounts ?? 0),
    ownerMicro: ownerId ? Number(figures?.ownerMicro ?? 0) : null,
    // The share the allowance enforces, env var included, never the bare constant.
    ownerShareMicro: ownerShareMicro(),
    previous: { runs: Number(figures?.previousRuns ?? 0), micro: Number(figures?.previousMicro ?? 0) },
    settings: settingsForMonth(
      settingRows.map((r) => ({ key: r.key as SettingKey, month: r.month, micro: r.valueMicroUsd, asOf: r.asOf, note: r.note })),
      month,
    ),
    paused: !!allowance?.paused,
  };
  return costSummary(rows, month, now);
}
