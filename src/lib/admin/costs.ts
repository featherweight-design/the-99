import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { adminSettings, cardLabelBatches, modelCallParts, modelCalls } from "../../db/schema";
import { modelOwnerUserId, ownerShareMicro, readAllowance } from "../model/allowance";
import { costDetail, type CallRow, type CostDetail, type LedgerEntry, type LedgerFile } from "./costs-detail-rule";
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
 * The Costs reads (admin STATES C1 to C6, and the detail of PR 3). SERVER-ONLY: it imports the
 * database. Read only. The model-call figures are `model_calls` (locked rule 11); beside them sit
 * the settings the admin enters, the month's runs and their parts, `card_label_batches` grouped by
 * run, and the committed eval ledgers. The batch labels and the ledgers also reach the summary, as
 * its `outside` (spend no `model_calls` row carries), so its System figure and split are not
 * `model_calls` alone. The month is a UTC calendar month, and a row belongs to the month its
 * `created_at` (or a ledger entry's `at`) falls in, as the spend cap counts it.
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

/** The month's runs, one row each: the detail aggregates them (`costDetail`), at a personal app's scale. */
export function callRowsQuery(start: Date, end: Date) {
  return db
    .select({
      id: sql<string>`${col("id")}`,
      userId: sql<string>`${col("user_id")}`,
      feature: sql<string>`${col("feature")}`,
      origin: sql<string>`${col("origin")}`,
      status: sql<string>`${col("status")}`,
      model: sql<string | null>`${col("model")}`,
      micro: sql<number | null>`${col("cost_micro_usd")}`.mapWith(modelCalls.costMicroUsd),
      // Through the column's own decoder: a bare `timestamp` string would parse as local time.
      createdAt: sql<Date>`${col("created_at")}`.mapWith(modelCalls.createdAt),
    })
    .from(modelCalls)
    .where(and(gte(modelCalls.createdAt, start), lt(modelCalls.createdAt, end)));
}

/** The provider calls under the month's runs. A part belongs to its run's month, not its own stamp. */
export function partRowsQuery(start: Date, end: Date) {
  return db
    .select({
      callId: modelCallParts.callId,
      step: modelCallParts.step,
      model: modelCallParts.model,
      effort: modelCallParts.effort,
      micro: modelCallParts.costMicroUsd,
    })
    .from(modelCallParts)
    .innerJoin(modelCalls, eq(modelCalls.id, modelCallParts.callId))
    .where(and(gte(modelCalls.createdAt, start), lt(modelCalls.createdAt, end)));
}

const lcol = (name: string) => sql`${cardLabelBatches}.${sql.identifier(name)}`;

/**
 * The month's label chunks by run and model (admin audit finding 9: group by `run_id`). Tokens are
 * summed over the chunks that have collected; dollars are computed from them, never stored.
 */
export function labelRunsQuery(start: Date, end: Date) {
  const runId = sql<string>`${lcol("run_id")}`;
  const model = sql<string>`${lcol("model")}`;
  const sum = (name: string) => sql<string>`coalesce(sum(${lcol(name)}), 0)`;
  return db
    .select({
      runId,
      model,
      batches: sql<number>`count(*)::int`,
      collected: sql<number>`count(${lcol("in_tokens")})::int`,
      inTokens: sum("in_tokens"),
      outTokens: sum("out_tokens"),
      cacheWriteTokens: sum("cache_write_tokens"),
      cacheReadTokens: sum("cache_read_tokens"),
      firstAt: sql<Date>`min(${lcol("intended_at")})`.mapWith(cardLabelBatches.intendedAt),
    })
    .from(cardLabelBatches)
    .where(and(gte(cardLabelBatches.intendedAt, start), lt(cardLabelBatches.intendedAt, end)))
    .groupBy(runId, model);
}

/**
 * The committed eval ledgers, as the deploy carries them: `next.config.ts` traces
 * `docs/superpowers/eval/ledger*.jsonl` into the `/admin` function, so they move only with a merge.
 * A file that cannot be read or parsed is left out rather than taking the page down.
 */
export function readEvalLedgers(dir = join(process.cwd(), "docs/superpowers/eval")): LedgerFile[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => /^ledger.*\.jsonl$/.test(f)).sort();
  } catch {
    return [];
  }
  return files.flatMap((file) => {
    try {
      const entries = readFileSync(join(dir, file), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as LedgerEntry);
      return [{ file, entries }];
    } catch {
      return [];
    }
  });
}

export async function loadCosts(month: MonthKey, adminId: string, now: Date = new Date()): Promise<{ summary: CostSummary; detail: CostDetail }> {
  const start = monthStart(month);
  const end = monthStart(shiftMonth(month, 1));
  const ownerId = modelOwnerUserId();
  const current = sameMonth(month, monthOf(now));
  const [days, [figures], settingRows, allowance, callRows, partRows, labelRows] = await Promise.all([
    dayRowsQuery(start, end),
    monthFiguresQuery(monthStart(shiftMonth(month, -1)), start, end, ownerId),
    db.select().from(adminSettings),
    // The pause is the allowance's own verdict, with no feature named: no press at all fits.
    current ? readAllowance(adminId, now) : null,
    callRowsQuery(start, end),
    partRowsQuery(start, end),
    labelRunsQuery(start, end),
  ]);

  const detail = costDetail({
    calls: callRows.map((c): CallRow => ({
      id: c.id,
      userId: c.userId,
      feature: c.feature,
      origin: c.origin === "system" ? "system" : "player",
      status: c.status === "spent" || c.status === "refunded" ? c.status : "reserved",
      model: c.model,
      micro: c.micro === null ? null : Number(c.micro),
      createdAt: c.createdAt,
    })),
    parts: partRows.map((p) => ({ ...p, micro: Number(p.micro) })),
    labelRuns: labelRows.map((r) => ({
      runId: r.runId,
      model: r.model,
      batches: Number(r.batches),
      collected: Number(r.collected),
      inTokens: Number(r.inTokens),
      outTokens: Number(r.outTokens),
      cacheWriteTokens: Number(r.cacheWriteTokens),
      cacheReadTokens: Number(r.cacheReadTokens),
      firstAt: r.firstAt,
    })),
    ledgers: readEvalLedgers(),
  }, month);

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
      settingRows.map((r) => ({ key: r.key as SettingKey, month: r.month, micro: r.valueMicroUsd, asOf: r.asOf, note: r.note, by: r.updatedBy })),
      month,
    ),
    paused: !!allowance?.paused,
    outside: { batchMicro: detail.series.labels - detail.labelCallsMicro, evalsMicro: detail.series.evals, labelCallsMicro: detail.labelCallsMicro, labelsIncomplete: detail.labelsIncomplete },
  };
  return { summary: costSummary(rows, month, now), detail };
}
