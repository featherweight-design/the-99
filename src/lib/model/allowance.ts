import { and, eq, gt, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "../../db";
import { creditGrants, modelCallParts, modelCalls } from "../../db/schema";
import {
  ALLOWANCE_WINDOW_MS,
  paidLimit,
  RESERVATION_TTL_MS,
  allowanceFrom,
  dailyLimit,
  freeRoom,
  paidRoom,
  type Allowance,
  type LedgerRow,
  type ModelFeature,
} from "./allowance-rule";
import type { RefundReason } from "./allowance-rule";
import { creditTotals, earliestPlanExpiry, pickGrant, welcomeLotExpiry, planCreditsByExpiry, planCreditsExpiringAt, remaining, type CreditGrant, type CreditSource, type GrantBalance } from "./credit-rule";
import type { ModelUsage } from "./client";
import { costMicroUsd, featureWorstCaseMicroUsd, FEATURE_CALLS } from "./prices";
import {
  monthStartUtc,
  ownerShareUsdFrom,
  spendRefusal,
  unpricedWorstCaseMicro,
  type UnpricedCall,
  type SpendRefusal,
  usdToMicro,
} from "./spend-rule";

/**
 * The allowance ledger's only reader and writer. SERVER-ONLY: it imports the database.
 *
 * A unit is RESERVED when a run starts, SPENT when the run ends with an answer the player sees,
 * and REFUNDED on any failure. `reserved` counts, because it is a run in flight — not
 * counting it is exactly how two concurrent presses would both take the last unit — but only for
 * `RESERVATION_TTL_MS`: past that nothing can still be running, and a unit left reserved (a crash,
 * a deck deleted mid-run, which cascades its run away) stops counting on its own.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Why a reservation was refused: the player's own allowance, or the owner's testing share. */
export type ReserveRefusal = "allowance" | SpendRefusal;

/**
 * A refused reservation. `costs` is present only on an `allowance` refusal of a run costing more than one credit
 * that a one-credit run would have passed: the player is not out of credits, this
 * run costs `costs` and no single source holds that many.
 */
export type ReserveRefused = { refused: ReserveRefusal; costs?: number };

/** Thrown inside a caller's transaction to roll back a run whose reservation was refused. */
export class AllowanceSpentError extends Error {
  /** `costs`: set when the run was refused ONLY because it costs that many credits (`ReserveRefused`). */
  constructor(readonly refused: ReserveRefusal = "allowance", readonly costs?: number) {
    super(`model call refused: ${refused}`);
    this.name = "AllowanceSpentError";
  }
}

/**
 * The player's rolling-24-hour limit (`dailyLimit` holds the rule): their group's allowance, else the
 * owner's own (`MODEL_OWNER_USER_ID`, the one place it is read, with `MODEL_OWNER_DAILY_ALLOWANCE`),
 * else the app-wide default (`MODEL_DAILY_ALLOWANCE`, five when unset). Read through `q`, so a
 * reservation reads it inside its own transaction and one press never meets two limits.
 */
export async function dailyLimitFor(q: Tx | typeof db, userId: string): Promise<number> {
  return (await dailyLimitsFor(q, [userId])).get(userId)!;
}

/** `dailyLimitFor` for many accounts in ONE read: the admin's confirm names every account it raises. */
export async function dailyLimitsFor(q: Tx | typeof db, userIds: readonly string[]): Promise<Map<string, number>> {
  const { rows } = userIds.length
    ? await q.execute<{ user_id: string; allowance: number }>(groupAllowanceQuery(userIds))
    : { rows: [] };
  return new Map(
    userIds.map((id) => [
      id,
      dailyLimit({
        groupAllowances: rows.filter((r) => r.user_id === id).map((r) => Number(r.allowance)),
        owner: isOwner(id),
        ownerRaw: process.env.MODEL_OWNER_DAILY_ALLOWANCE,
        defaultRaw: process.env.MODEL_DAILY_ALLOWANCE,
      }),
    ]),
  );
}

/** Exported for its test: a group with no allowance must name none, or a member would read 0. */
export function groupAllowanceQuery(userIds: readonly string[]) {
  return sql`
    select m.user_id, g.daily_allowance as allowance from flag_group_members m
    join flag_groups g on g.id = m.group_id
    where m.user_id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}) and g.daily_allowance is not null`;
}

/**
 * The player's paid limit (`paidLimit` holds the rule): the largest `paid_daily_limit` among their
 * groups, else `PAID_DAILY_LIMIT`. Its own query, because a group may set a paid limit and no daily
 * allowance. Read through `q`, so a reservation reads it inside its lock, the same as `dailyLimitFor`.
 */
export async function paidLimitFor(q: Tx | typeof db, userId: string): Promise<number> {
  const { rows } = await q.execute<{ paid_limit: number }>(groupPaidLimitQuery([userId]));
  return paidLimit({ groupLimits: rows.map((r) => Number(r.paid_limit)) });
}

/** Exported for its test: a group with no paid limit must name none, or a member would read 0. */
export function groupPaidLimitQuery(userIds: readonly string[]) {
  return sql`
    select m.user_id, g.paid_daily_limit as paid_limit from flag_group_members m
    join flag_groups g on g.id = m.group_id
    where m.user_id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}) and g.paid_daily_limit is not null`;
}

/**
 * The owner's monthly testing share in micro-dollars: `MODEL_OWNER_MONTHLY_USD` when it parses,
 * otherwise `OWNER_SHARE_USD` (`ownerShareUsdFrom`). Only ever compared against the owner's own
 * spend, so it moves nothing for a friend.
 */
export function ownerShareMicro(): number {
  return usdToMicro(ownerShareUsdFrom(process.env.MODEL_OWNER_MONTHLY_USD));
}

/** The owner's Clerk id, or null when unset or empty. The admin's owner-share bar reads it too. */
export function modelOwnerUserId(): string | null {
  return process.env.MODEL_OWNER_USER_ID?.trim() || null;
}

function isOwner(userId: string): boolean {
  const owner = modelOwnerUserId();
  return !!owner && owner === userId;
}

/**
 * The OWNER's month-to-date PLAYER-ORIGIN spend, in micro-dollars: what the owner's testing share
 * is measured against. A `system` row (a batch job's summary) never counts against it.
 *
 * CREDITS COUNT SUCCESSES; DOLLARS COUNT EVERYTHING BILLED. The allowance ignores refunded rows;
 * this does not. It is the recorded cost of EVERY call this UTC month, spent or refunded, plus the
 * worst case of every call this month with no recorded cost still inside its TTL, reserved or
 * refunded — a call the reaper refunded keeps billing until its outcome lands.
 * `spend-rule.ts` holds the rule for the second half (`countsAtWorstCase`); the SQL here only
 * narrows the rows it is asked about.
 *
 * Read only for the owner: nobody else is held to a monthly figure (there is no app-wide limit
 * since 2026-10-17), so no other press pays for this query.
 */
async function ownerMonthMicro(q: Tx | typeof db, userId: string, now: Date): Promise<number | null> {
  if (!isOwner(userId)) return null;
  const start = monthStartUtc(now);
  const mine = and(eq(modelCalls.origin, "player"), eq(modelCalls.userId, userId), gte(modelCalls.createdAt, start));
  const [priced] = await q
    .select({ micro: sql<string>`coalesce(sum(${modelCalls.costMicroUsd}), 0)` })
    .from(modelCalls)
    .where(and(mine, isNotNull(modelCalls.costMicroUsd)));
  const unpriced = await q
    .select({ status: modelCalls.status, feature: modelCalls.feature, model: modelCalls.model, createdAt: modelCalls.createdAt })
    .from(modelCalls)
    .where(and(mine, isNull(modelCalls.costMicroUsd), gt(modelCalls.createdAt, new Date(now.getTime() - RESERVATION_TTL_MS))));
  return Number(priced.micro) + unpricedWorstCaseMicro(unpriced as UnpricedCall[], now);
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

/**
 * The window's reserved and spent rows, the free allowance's own (`paid` false) or the runs a paid lot
 * funded (`paid` true, the paid limit's). `allowanceFrom` applies `counts` to either: one rule.
 */
async function ledgerRows(q: Tx | typeof db, userId: string, now: Date, paid = false): Promise<LedgerRow[]> {
  const since = new Date(now.getTime() - ALLOWANCE_WINDOW_MS);
  const rows = await q
    // `units`: the window counts CREDITS (`allowanceFrom` sums them), never rows.
    .select({ status: modelCalls.status, createdAt: modelCalls.createdAt, units: modelCalls.units })
    .from(modelCalls)
    .where(and(
      eq(modelCalls.userId, userId),
      // The player's own presses only: a free method-change rewrite (`origin = 'system'`) is not a
      // credit, reserved or spent, and must never count toward the window.
      eq(modelCalls.origin, "player"),
      gt(modelCalls.createdAt, since),
      inArray(modelCalls.status, ["reserved", "spent"]),
      // A run a paid lot funded spends that lot, never the free window; the paid limit counts those alone.
      paid ? isNotNull(modelCalls.creditGrantId) : isNull(modelCalls.creditGrantId),
    ));
  return rows as LedgerRow[];
}

/**
 * The player's paid lots that could still hold a credit, each with what it has left at `now`
 * (`credit-rule.ts` decides; the SQL only narrows). One read of `credit_grants` by the player's
 * index, and a read of the ledger only when a lot exists, so a player who never bought anything,
 * which is every player before payments ship, costs one empty index lookup.
 */
async function grantBalances(q: Tx | typeof db, userId: string, now: Date): Promise<GrantBalance[]> {
  const grants = await q
    .select({
      id: creditGrants.id, source: creditGrants.source, units: creditGrants.units,
      revokedUnits: creditGrants.revokedUnits, expiresAt: creditGrants.expiresAt, createdAt: creditGrants.createdAt,
    })
    .from(creditGrants)
    .where(and(
      eq(creditGrants.userId, userId),
      sql`${creditGrants.revokedUnits} < ${creditGrants.units}`,
      or(isNull(creditGrants.expiresAt), gt(creditGrants.expiresAt, now)),
    ));
  if (grants.length === 0) return [];
  const ids = grants.map((g) => g.id);
  const reservedSince = new Date(now.getTime() - RESERVATION_TTL_MS);
  const usage = await q
    .select({
      grantId: modelCalls.creditGrantId,
      // CREDITS, not rows: the spent rows' `units` summed.
      spent: sql<string>`coalesce(sum(${modelCalls.units}) filter (where ${modelCalls.status} = 'spent'), 0)`,
      // Epoch milliseconds, so no driver ever reads a zone-less timestamp in its own zone. The column
      // holds UTC (Drizzle writes `toISOString()`), and `extract(epoch ...)` of a zone-less
      // timestamp reads it as UTC. As JSON, because the driver hands a Postgres array back as its text.
      // Each reservation as `[ms, units]`, expanded below to one entry per credit (`GrantUsage`).
      reserved: sql<[number, number][] | null>`json_agg(json_build_array((extract(epoch from ${modelCalls.createdAt}) * 1000)::float8, ${modelCalls.units})) filter (where ${modelCalls.status} = 'reserved' and ${modelCalls.createdAt} > ${reservedSince.toISOString()}::timestamp)`,
    })
    .from(modelCalls)
    .where(and(inArray(modelCalls.creditGrantId, ids), inArray(modelCalls.status, ["reserved", "spent"])))
    .groupBy(modelCalls.creditGrantId);
  const byGrant = new Map(usage.map((u) => [u.grantId, u]));
  return grants.map((g) => {
    const grant: CreditGrant = { ...g, source: g.source as CreditSource };
    const u = byGrant.get(g.id);
    const reserved = (u?.reserved ?? []).flatMap(([ms, units]) => Array.from({ length: Number(units) }, () => new Date(Number(ms))));
    return { grant, remaining: remaining(grant, { spent: Number(u?.spent ?? 0), reserved }, now) };
  });
}

/**
 * The player's allowance, with `ownerShare` when the owner's testing share applies. It is measured
 * against `feature`'s own call when a panel names it, so the panel says so exactly when its own
 * press would be refused. With none named, against the smallest call any feature can make: no call
 * at all would be let through.
 */
export async function readAllowance(userId: string, now: Date = new Date(), feature?: ModelFeature): Promise<Allowance> {
  const [rows, spend, balances, limit] = await Promise.all([
    ledgerRows(db, userId, now), ownerMonthMicro(db, userId, now), grantBalances(db, userId, now), dailyLimitFor(db, userId),
  ]);
  // The paid counter and limit are read only for a player who holds a lot, so everyone else costs no extra query.
  const paid = balances.length > 0
    ? await Promise.all([ledgerRows(db, userId, now, true), paidLimitFor(db, userId)]).then(([paidRows, paidLim]) => allowanceFrom(paidRows, now, paidLim))
    : null;
  const allowance: Allowance = {
    ...allowanceFrom(rows, now, limit),
    ...(paid ? { ...creditTotals(balances), planExpiresAt: earliestPlanExpiry(balances), welcomeExpiresAt: welcomeLotExpiry(balances), planExpiring: planCreditsExpiringAt(balances, earliestPlanExpiry(balances)), planByExpiry: planCreditsByExpiry(balances), paidUsedToday: paid.used, paidLimit: paid.limit, paidBackAt: paid.reopensAt, paidNextAt: paid.nextAt } : {}),
  };
  const refusal = spendRefusal({
    ownerMonthMicro: spend,
    ownerShareMicro: ownerShareMicro(),
    callMicro: callMicroFor(feature),
  });
  if (refusal === "ownerShare") return { ...allowance, ownerShare: true };
  return allowance;
}

/**
 * Inside the CALLER's transaction: lock, check, insert. Refused, with the reason, when the owner's
 * testing share would be passed (`ownerShare`), or when the player's own allowance is spent
 * (`allowance`) — in that order, the order a panel names them in. There is no app-wide limit
 * (2026-10-17): the Anthropic workspace limits bound the whole app's spend.
 *
 * `model` is recorded on the row, so while it is in flight every other reservation prices it at
 * its worst case (`spend-rule.ts`).
 *
 * The caller inserts its own run row in the same transaction, so a run holds a unit and a run
 * row or neither. The lock is per player and transaction-scoped: `hashtextextended`, the 64-bit
 * form `replaceCollection` uses, under a prefix so it never contends with that lock. The owner's
 * share is the owner's own figure, so that same lock serialises every check against it.
 */
export async function reserveModelCall(
  tx: Tx,
  userId: string,
  feature: ModelFeature,
  model: string,
  now: Date = new Date(),
  /**
   * WHO STARTED THE CALL. `system` is the free method-change rewrite (plan 7.4): it is written
   * `origin = 'system'` and checks NOTHING here, neither the owner's share nor the player's allowance,
   * and nothing it spends is counted toward either (both read `origin = 'player'` only). The
   * caller owns its bound (`method-notice.ts`: two attempts per deck per contract) and must
   * decide it under its own lock, so this function has no way to be asked for a system call
   * that bypasses that rule by accident: the default is the player path.
   */
  origin: "player" | "system" = "player",
  /**
   * THE CREDITS THE RUN COSTS, written to `model_calls.units`: 1 for every feature, 2 for a Suggested changes v2 run
   * asking for more than 10 swaps (`unitsFor`). ONE SOURCE FUNDS THE WHOLE RUN (Hugh, 2026-10-30): the free allowance
   * when all of it fits there, else the first lot in spend order holding all of it, never a split. The paid limit
   * counts it whole. Still one row: settle, refund and the reapers move the row, so a refund returns every unit.
   */
  units = 1,
): Promise<{ id: string } | ReserveRefused> {
  if (origin === "system") {
    const [row] = await tx
      .insert(modelCalls)
      .values({ userId, feature, model, origin: "system", createdAt: now })
      .returning({ id: modelCalls.id });
    return row;
  }
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`model-allowance:${userId}`}, 0))`);
  const refusal = spendRefusal({
    ownerMonthMicro: await ownerMonthMicro(tx, userId, now),
    ownerShareMicro: ownerShareMicro(),
    callMicro: featureWorstCaseMicroUsd(feature, model),
  });
  if (refusal) return { refused: refusal };
  const allowance = allowanceFrom(await ledgerRows(tx, userId, now), now, await dailyLimitFor(tx, userId));
  // The free allowance first, because it is use-it-or-lose-it; then a paid lot, plan before pack
  // (`pickGrant`). Both read under the lock above, so two presses cannot take one last credit.
  // Each source must hold the run's WHOLE cost (`units`): never free plus a lot, never two lots.
  let creditGrantId: string | null = null;
  if (!freeRoom(allowance, units)) {
    const balances = await grantBalances(tx, userId, now);
    const grant = pickGrant(balances, units);
    // The paid limit, counted under the lock above like the free window. Only here, so it never
    // refuses a run the free allowance could fund. Read only while some lot holds a credit.
    const anyLot = pickGrant(balances);
    const paid = anyLot
      ? allowanceFrom(await ledgerRows(tx, userId, now, true), now, await paidLimitFor(tx, userId))
      : null;
    const paidOk = (n: number) => paid !== null && paidRoom({ paidUsed: paid.used, paidLimit: paid.limit }, n);
    if (!grant || !paidOk(units)) {
      // Not out of credits, only short of this run's cost: a one-credit run would have been funded.
      const oneFits = units > 1 && (freeRoom(allowance) || (anyLot !== null && paidOk(1)));
      return oneFits ? { refused: "allowance", costs: units } : { refused: "allowance" };
    }
    creditGrantId = grant.id;
  }
  const [row] = await tx
    .insert(modelCalls)
    .values({ userId, feature, model, origin: "player", createdAt: now, creditGrantId, units })
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
 *
 * WHY A CALL WAS REFUNDED is written beside the status: a late success names itself
 * (`late_success`), and every other refund carries the `reason` its caller names, or none. Returns
 * the status the row ended on, or null when it was no longer `reserved` and nothing moved, so a
 * caller that expected a charge can notice it was refunded.
 */
export async function settleModelCall(
  tx: Tx,
  callId: string,
  to: "spent",
  billed: Billed | readonly Billed[] | undefined,
  now?: Date,
): Promise<"spent" | "refunded" | null>;
/**
 * A settle that can refund must say why: a `RefundReason`, or an intentional `null` where the path cannot
 * tell causes apart (a thin answer and a failed call both refund). The type checker holds every caller to it.
 */
export async function settleModelCall(
  tx: Tx,
  callId: string,
  to: "spent" | "refunded",
  billed: Billed | readonly Billed[] | undefined,
  now: Date,
  reason: RefundReason | null,
): Promise<"spent" | "refunded" | null>;
export async function settleModelCall(
  tx: Tx,
  callId: string,
  to: "spent" | "refunded",
  /**
   * What the call was billed for, when it got a response back: recorded on a spent AND on a
   * refunded settle, since a refund still burned the tokens (and its cost counts toward the
   * month). Undefined for a settle that knows nothing: the reaper. Its row counts at its
   * worst case until the late outcome records its meters (`recordModelUsage`).
   */
  billed: Billed | readonly Billed[] | undefined,
  now: Date = new Date(),
  reason: RefundReason | null = null,
): Promise<"spent" | "refunded" | null> {
  const live = gt(modelCalls.createdAt, new Date(now.getTime() - RESERVATION_TTL_MS));
  const [row] = await tx
    .update(modelCalls)
    .set(
      to === "spent"
        ? { status: sql`case when ${live} then 'spent' else 'refunded' end`, refundReason: sql`case when ${live} then null else 'late_success' end` }
        : { status: "refunded", refundReason: reason },
    )
    .where(and(eq(modelCalls.id, callId), eq(modelCalls.status, "reserved")))
    .returning({ status: modelCalls.status });
  if (billed) await recordModelUsage(tx, callId, billed);
  return row ? (row.status as "spent" | "refunded") : null;
}

/**
 * One provider call's bill. `step` names it within its run (`write`, `repair`, `shortlist`, ...;
 * `call` when absent) and `effort` is the reasoning effort the request asked for, null when it set
 * none: both land on the call's `model_call_parts` row, never on the parent. `noCall` marks a bill
 * for a call that was never made (the read's empty shortlist pool): it settles the parent's cost at
 * zero so the reservation stops counting at its worst case, and it writes no part, because a part
 * is a provider call and there was none.
 */
export type Billed = { model: string; usage: ModelUsage; step?: string; effort?: "low" | "medium" | "high" | null; noCall?: true };

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
 * Write what a call was billed for onto its ledger row. The one writer of the meters: `settleModelCall` calls it, and so does an outcome
 * that arrives LATE, after the reaper already settled the row, since that call billed
 * all the same and its row counts at its worst case until this lands.
 *
 * ONLY WHILE THE ROW HAS NO COST, so two writes — a settle and a late outcome, or a retried write —
 * record one call once and never count it twice. Whatever the row's status: meters are a fact
 * about the bill, not about whether the player was charged a credit.
 */
function isBilledList(b: Billed | readonly Billed[]): b is readonly Billed[] {
  return Array.isArray(b);
}

export async function recordModelUsage(tx: Tx, callId: string, billed: Billed | readonly Billed[]): Promise<void> {
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
    .returning({ id: modelCalls.id });
  // ONE PART PER PROVIDER CALL (admin brief, locked rule 13), written only when the parent's meters
  // were first recorded here: the same guard that keeps a retried or late write from counting twice.
  const calls = parts.filter((p) => !p.noCall);
  if (row && calls.length > 0) {
    await tx.insert(modelCallParts).values(calls.map((p) => ({
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
}
