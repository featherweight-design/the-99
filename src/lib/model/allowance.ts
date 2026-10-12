import { and, eq, gt, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "../../db";
import { modelCallParts, modelCalls } from "../../db/schema";
import {
  ALLOWANCE_WINDOW_MS,
  MODEL_FRIEND_DAILY_ALLOWANCE,
  MODEL_OWNER_DAILY_ALLOWANCE,
  RESERVATION_TTL_MS,
  allowanceFrom,
  type Allowance,
  type LedgerRow,
  type ModelFeature,
} from "./allowance-rule";
import type { ModelUsage } from "./client";
import { costMicroUsd, featureWorstCaseMicroUsd, FEATURE_CALLS } from "./prices";
import { reportSpendThreshold } from "./spend-alerts";
import {
  BUDGET_USD,
  crossedAlarms,
  microToUsd,
  monthStartUtc,
  nextMonthStartUtc,
  spendRefusal,
  unpricedWorstCaseMicro,
  type UnpricedCall,
  type SpendRefusal,
} from "./spend-rule";

/**
 * The allowance ledger's only reader and writer. SERVER-ONLY: it imports the database.
 *
 * A unit is RESERVED when a run starts, SPENT when the run ends with an answer the player sees,
 * and REFUNDED on any failure or Stop. `reserved` counts, because it is a run in flight — not
 * counting it is exactly how two concurrent presses would both take the last unit — but only for
 * `RESERVATION_TTL_MS`: past that nothing can still be running, and a unit left reserved (a crash,
 * a deck deleted mid-run, which cascades its run away) stops counting on its own.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Why a reservation was refused: the player's own allowance, or the app-wide spend cap. */
export type ReserveRefusal = "allowance" | SpendRefusal;

/** Thrown inside a caller's transaction to roll back a run whose reservation was refused. */
export class AllowanceSpentError extends Error {
  constructor(readonly refused: ReserveRefusal = "allowance") {
    super(`model call refused: ${refused}`);
    this.name = "AllowanceSpentError";
  }
}

/**
 * The player's rolling-24-hour limit. THE ONE PLACE `MODEL_OWNER_USER_ID` is read (a Clerk user
 * id): that account gets the owner's ten, everyone else the friend's five. Unset or empty, no
 * account is the owner and everyone gets five — the limit fails closed.
 */
export function dailyLimitFor(userId: string): number {
  return isOwner(userId) ? MODEL_OWNER_DAILY_ALLOWANCE : MODEL_FRIEND_DAILY_ALLOWANCE;
}

function isOwner(userId: string): boolean {
  const owner = process.env.MODEL_OWNER_USER_ID?.trim();
  return !!owner && owner === userId;
}

/**
 * Month-to-date PLAYER-ORIGIN spend, app-wide and this player's, in micro-dollars. A `system` row
 * (a batch job's summary) is a different budget and never counts against this cap.
 *
 * CREDITS COUNT SUCCESSES; DOLLARS COUNT EVERYTHING BILLED. The allowance ignores refunded rows;
 * this does not. It is the recorded cost of EVERY call this UTC month, spent or refunded, plus the
 * worst case of every call this month with no recorded cost still inside its TTL, reserved or
 * refunded — a Stopped call is refunded at once but keeps billing until its outcome lands.
 * `spend-rule.ts` holds the rule for the second half (`countsAtWorstCase`); the SQL here only
 * narrows the rows it is asked about.
 */
async function monthSpend(q: Tx | typeof db, userId: string, now: Date): Promise<{ app: number; user: number }> {
  const start = monthStartUtc(now);
  const [priced] = await q
    .select({
      app: sql<string>`coalesce(sum(${modelCalls.costMicroUsd}), 0)`,
      user: sql<string>`coalesce(sum(${modelCalls.costMicroUsd}) filter (where ${modelCalls.userId} = ${userId}), 0)`,
    })
    .from(modelCalls)
    .where(and(eq(modelCalls.origin, "player"), isNotNull(modelCalls.costMicroUsd), gte(modelCalls.createdAt, start)));
  const unpriced = await q
    .select({
      userId: modelCalls.userId, status: modelCalls.status, feature: modelCalls.feature,
      model: modelCalls.model, createdAt: modelCalls.createdAt,
    })
    .from(modelCalls)
    .where(and(
      eq(modelCalls.origin, "player"),
      isNull(modelCalls.costMicroUsd),
      gte(modelCalls.createdAt, start),
      gt(modelCalls.createdAt, new Date(now.getTime() - RESERVATION_TTL_MS)),
    ));
  const rows = unpriced as (UnpricedCall & { userId: string })[];
  return {
    app: Number(priced.app) + unpricedWorstCaseMicro(rows, now),
    user: Number(priced.user) + unpricedWorstCaseMicro(rows.filter((r) => r.userId === userId), now),
  };
}

/**
 * What "one more call would not fit" is measured against: the named feature's own worst-case call,
 * or with none named, the cheapest call any feature can make.
 *
 * A panel names its feature. Measured against the cheapest instead, every panel but the cheapest
 * feature's would say it is available in the month's last margin while its own reservation is
 * refused: today tuning's call is the cheaper one, so the overview's panel would.
 */
export function callMicroFor(feature?: ModelFeature): number {
  if (feature) return featureWorstCaseMicroUsd(feature);
  return Math.min(...(Object.keys(FEATURE_CALLS) as ModelFeature[]).map((f) => featureWorstCaseMicroUsd(f)));
}

/** The window's reserved and spent rows. `allowanceFrom` applies `counts` — one rule. */
async function ledgerRows(q: Tx | typeof db, userId: string, now: Date): Promise<LedgerRow[]> {
  const since = new Date(now.getTime() - ALLOWANCE_WINDOW_MS);
  const rows = await q
    .select({ status: modelCalls.status, createdAt: modelCalls.createdAt })
    .from(modelCalls)
    .where(and(
      eq(modelCalls.userId, userId),
      // The player's own presses only: a free method-change rewrite (`origin = 'system'`) is not a
      // credit, reserved or spent, and must never count toward the window.
      eq(modelCalls.origin, "player"),
      gt(modelCalls.createdAt, since),
      inArray(modelCalls.status, ["reserved", "spent"]),
    ));
  return rows as LedgerRow[];
}

/**
 * The player's allowance, with the spend cap's two states when they apply. Both are measured
 * against `feature`'s own call when a panel names it, so the panel says "paused" exactly when its
 * own press would be refused. With none named, against the smallest call any feature can make: no
 * call at all would be let through.
 */
export async function readAllowance(userId: string, now: Date = new Date(), feature?: ModelFeature): Promise<Allowance> {
  const [rows, spend] = await Promise.all([ledgerRows(db, userId, now), monthSpend(db, userId, now)]);
  const allowance = allowanceFrom(rows, now, dailyLimitFor(userId));
  const refusal = spendRefusal({
    appMonthMicro: spend.app,
    ownerMonthMicro: isOwner(userId) ? spend.user : null,
    callMicro: callMicroFor(feature),
  });
  if (refusal === "paused") return { ...allowance, paused: { until: nextMonthStartUtc(now) } };
  if (refusal === "ownerShare") return { ...allowance, ownerShare: true };
  return allowance;
}

/**
 * Inside the CALLER's transaction: lock, check, insert. Refused, with the reason, when the
 * app-wide spend cap would be passed (`paused`), when the owner's testing share would be
 * (`ownerShare`), or when the player's own allowance is spent (`allowance`) — in that order, the
 * order a panel names them in.
 *
 * `model` is recorded on the row, so while it is in flight every other reservation prices it at
 * its worst case (`spend-rule.ts`).
 *
 * The caller inserts its own run row in the same transaction, so a run holds a unit and a run
 * row or neither. The lock is per player and transaction-scoped: `hashtextextended`, the 64-bit
 * form `replaceCollection` uses, under a prefix so it never contends with that lock.
 *
 * THE SPEND CHECK IS NOT GLOBALLY SERIALISED, and that is accepted (orchestrator ruling,
 * 2026-09-24). The lock is per player, so two players reserving at once can both read the same
 * month-to-date and both pass the $20 check. $20 is a bug guard rather than a budget, and every
 * in-flight reservation is counted at its worst case, so the overshoot is bounded to about one
 * call per concurrently reserving player. A global lock would serialise every press in the app to
 * close that gap.
 */
export async function reserveModelCall(
  tx: Tx,
  userId: string,
  feature: ModelFeature,
  model: string,
  now: Date = new Date(),
  /**
   * WHO STARTED THE CALL. `system` is the free method-change rewrite (plan 7.4): it is written
   * `origin = 'system'` and checks NOTHING here, neither the spend cap nor the player's allowance,
   * and nothing it spends is counted toward either (both read `origin = 'player'` only). The
   * caller owns its bound (`method-notice.ts`: two attempts per deck per contract) and must
   * decide it under its own lock, so this function has no way to be asked for a system call
   * that bypasses that rule by accident: the default is the player path.
   */
  origin: "player" | "system" = "player",
): Promise<{ id: string } | { refused: ReserveRefusal }> {
  if (origin === "system") {
    const [row] = await tx
      .insert(modelCalls)
      .values({ userId, feature, model, origin: "system", createdAt: now })
      .returning({ id: modelCalls.id });
    return row;
  }
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`model-allowance:${userId}`}, 0))`);
  const spend = await monthSpend(tx, userId, now);
  const refusal = spendRefusal({
    appMonthMicro: spend.app,
    ownerMonthMicro: isOwner(userId) ? spend.user : null,
    callMicro: featureWorstCaseMicroUsd(feature, model),
  });
  if (refusal) return { refused: refusal };
  const allowance = allowanceFrom(await ledgerRows(tx, userId, now), now, dailyLimitFor(userId));
  if (allowance.used >= allowance.limit) return { refused: "allowance" };
  const [row] = await tx
    .insert(modelCalls)
    .values({ userId, feature, model, origin: "player", createdAt: now })
    .returning({ id: modelCalls.id });
  return row;
}

/**
 * Inside the outcome write's transaction. Moves only a `reserved` row, so settling twice — a
 * reaper and a late outcome, say — changes nothing the second time.
 *
 * A LATE SUCCESS IS NOT CHARGED. Once a reservation passes `RESERVATION_TTL_MS` it stops counting,
 * and a later press may have reserved the unit it freed; settling the old row `spent` then would
 * put the player one over the allowance. So a `spent` settle applies only while the reservation
 * is still live, and past that the row is refunded instead: the answer that arrived that late
 * costs the player nothing. Decided in the same statement as the move, so no read can go stale
 * between the check and the write, and against the same clock `reserveModelCall` stamped the
 * row with.
 */
export async function settleModelCall(
  tx: Tx,
  callId: string,
  to: "spent" | "refunded",
  /**
   * What the call was billed for, when it got a response back: recorded on a spent AND on a
   * refunded settle, since a refund still burned the tokens (and its cost counts toward the
   * month). Undefined for a settle that knows nothing: a reaper, a Stop. Their row counts at its
   * worst case until the late outcome records its meters (`recordModelUsage`).
   */
  billed: Billed | readonly Billed[] | undefined,
  now: Date = new Date(),
): Promise<void> {
  const live = gt(modelCalls.createdAt, new Date(now.getTime() - RESERVATION_TTL_MS));
  await tx
    .update(modelCalls)
    .set({ status: to === "spent" ? sql`case when ${live} then 'spent' else 'refunded' end` : "refunded" })
    .where(and(eq(modelCalls.id, callId), eq(modelCalls.status, "reserved")));
  if (billed) await recordModelUsage(tx, callId, billed, now);
}

/**
 * One provider call's bill. `step` names it within its run (`write`, `repair`, `shortlist`, ...;
 * `call` when absent) and `effort` is the reasoning effort the request asked for, null when it set
 * none: both land on the call's `model_call_parts` row, never on the parent.
 */
export type Billed = { model: string; usage: ModelUsage; step?: string; effort?: "low" | "medium" | "high" | null };

/**
 * Several calls billed under one reservation (Help me choose's read: a shortlist and a judgement,
 * on different models), as the one ledger row records them: the models joined with `+`, the
 * meters summed, and the cost summed per call, each on its own model's rates. Never re-priced from
 * the joined model, which no rate names.
 */
export function joinBilled(parts: readonly Billed[]): { model: string; usage: ModelUsage; costMicroUsd: number } {
  const models = [...new Set(parts.map((p) => p.model))];
  const usage = parts.reduce<ModelUsage>((sum, p) => ({
    inputTokens: sum.inputTokens + p.usage.inputTokens,
    outputTokens: sum.outputTokens + p.usage.outputTokens,
    cacheReadTokens: sum.cacheReadTokens + p.usage.cacheReadTokens,
    cacheWriteTokens: sum.cacheWriteTokens + p.usage.cacheWriteTokens,
  }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
  return { model: models.join("+"), usage, costMicroUsd: parts.reduce((sum, p) => sum + costMicroUsd(p.model, p.usage), 0) };
}

/**
 * Write what a call was billed for onto its ledger row, and report an alarm line it carried the
 * month over. The one writer of the meters: `settleModelCall` calls it, and so does an outcome
 * that arrives LATE, after a Stop or the reaper already settled the row, since that call billed
 * all the same and its row counts at its worst case until this lands.
 *
 * ONLY WHILE THE ROW HAS NO COST, so two writes — a settle and a late outcome, or a retried write —
 * record one call once and never count it twice. Whatever the row's status: meters are a fact
 * about the bill, not about whether the player was charged a credit.
 */
function isBilledList(b: Billed | readonly Billed[]): b is readonly Billed[] {
  return Array.isArray(b);
}

export async function recordModelUsage(tx: Tx, callId: string, billed: Billed | readonly Billed[], now: Date = new Date()): Promise<void> {
  const parts: readonly Billed[] = isBilledList(billed) ? billed : [billed];
  const one = joinBilled(parts);
  const [row] = await tx
    .update(modelCalls)
    .set({
      model: one.model,
      inputTokens: one.usage.inputTokens,
      outputTokens: one.usage.outputTokens,
      cacheReadTokens: one.usage.cacheReadTokens,
      cacheWriteTokens: one.usage.cacheWriteTokens,
      costMicroUsd: one.costMicroUsd,
    })
    .where(and(eq(modelCalls.id, callId), isNull(modelCalls.costMicroUsd)))
    .returning({ createdAt: modelCalls.createdAt, cost: modelCalls.costMicroUsd });
  // ONE PART PER PROVIDER CALL (admin brief, locked rule 13), written only when the parent's meters
  // were first recorded here: the same guard that keeps a retried or late write from counting twice.
  if (row && parts.length > 0) {
    await tx.insert(modelCallParts).values(parts.map((p) => ({
      callId,
      step: p.step ?? "call",
      model: p.model,
      effort: p.effort ?? null,
      inputTokens: p.usage.inputTokens,
      outputTokens: p.usage.outputTokens,
      cacheReadTokens: p.usage.cacheReadTokens,
      cacheWriteTokens: p.usage.cacheWriteTokens,
      costMicroUsd: costMicroUsd(p.model, p.usage),
    })));
  }
  if (row?.cost && row.createdAt >= monthStartUtc(now)) await alarm(tx, row.cost, now);
}

/**
 * Whether the meters just recorded (`cost`) carried the month's app-wide BILLED spend — every
 * recorded cost this month, spent or refunded — over an alarm line. Read inside the write's own
 * transaction, so `after` includes this row and `before` is the same sum without it. Two settles committing at the same moment can each miss the other's
 * row, and one crossing may then be reported twice or not at all: this is a log line, not a gate.
 */
async function alarm(tx: Tx, cost: number, now: Date): Promise<void> {
  const [sum] = await tx
    .select({ billed: sql<string>`coalesce(sum(${modelCalls.costMicroUsd}), 0)` })
    .from(modelCalls)
    .where(and(eq(modelCalls.origin, "player"), isNotNull(modelCalls.costMicroUsd), gte(modelCalls.createdAt, monthStartUtc(now))));
  const after = Number(sum.billed);
  for (const pct of crossedAlarms(after - cost, after)) {
    reportSpendThreshold({
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      pct,
      spentUsd: microToUsd(after),
      capUsd: BUDGET_USD,
    });
  }
}
