import { and, eq, gt, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { modelCalls } from "../../db/schema";
import {
  ALLOWANCE_WINDOW_MS,
  allowanceFrom,
  type Allowance,
  type ModelFeature,
} from "./allowance-rule";

/**
 * The allowance ledger's only reader and writer. SERVER-ONLY: it imports the database.
 *
 * A unit is RESERVED when a run starts, SPENT when the run ends with an answer the player sees,
 * and REFUNDED on any failure or Stop. `reserved` counts, because it is a run in flight — not
 * counting it is exactly how two concurrent presses would both take the last unit.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Thrown inside a caller's transaction to roll back a run that found the allowance spent. */
export class AllowanceSpentError extends Error {
  constructor() {
    super("model allowance spent");
    this.name = "AllowanceSpentError";
  }
}

const COUNTED = ["reserved", "spent"] as const;

async function countedTimes(q: Tx | typeof db, userId: string, now: Date): Promise<Date[]> {
  const since = new Date(now.getTime() - ALLOWANCE_WINDOW_MS);
  const rows = await q
    .select({ createdAt: modelCalls.createdAt })
    .from(modelCalls)
    .where(and(
      eq(modelCalls.userId, userId),
      gt(modelCalls.createdAt, since),
      inArray(modelCalls.status, [...COUNTED]),
    ));
  return rows.map((r) => r.createdAt);
}

export async function readAllowance(userId: string, now: Date = new Date()): Promise<Allowance> {
  return allowanceFrom(await countedTimes(db, userId, now), now);
}

/**
 * Inside the CALLER's transaction: lock, count, insert. Null when the allowance is spent.
 *
 * The caller inserts its own run row in the same transaction, so a run holds a unit and a run
 * row or neither. The lock is per player and transaction-scoped: `hashtextextended`, the 64-bit
 * form `replaceCollection` uses, under a prefix so it never contends with that lock.
 */
export async function reserveModelCall(
  tx: Tx,
  userId: string,
  feature: ModelFeature,
  now: Date = new Date(),
): Promise<{ id: string } | null> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`model-allowance:${userId}`}, 0))`);
  const allowance = allowanceFrom(await countedTimes(tx, userId, now), now);
  if (allowance.used >= allowance.limit) return null;
  const [row] = await tx
    .insert(modelCalls)
    .values({ userId, feature, createdAt: now })
    .returning({ id: modelCalls.id });
  return row;
}

/**
 * Inside the outcome write's transaction. Moves only a `reserved` row, so settling twice — a
 * reaper and a late outcome, say — changes nothing the second time.
 */
export async function settleModelCall(
  tx: Tx,
  callId: string,
  to: "spent" | "refunded",
): Promise<void> {
  await tx
    .update(modelCalls)
    .set({ status: to })
    .where(and(eq(modelCalls.id, callId), eq(modelCalls.status, "reserved")));
}
