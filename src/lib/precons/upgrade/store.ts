import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../../db";
import { preconUpgrades } from "../../../db/schema";
import { isUniqueViolation } from "../../db-error";
import { AllowanceSpentError, reserveModelCall, settleModelCall, type Billed } from "../../model/allowance";
import { recordLate, RunSupersededError } from "../../tuning/run-store";
import { UPGRADE_REAP_MS, UPGRADE_UNITS } from "./constants";
import type { UpgradeDrop, UpgradePair } from "./validate";

/**
 * Upgrade this precon's writes and reads. SERVER-ONLY: it imports the database. The shape is Find a deck read's
 * (`swaps/fits-read-store.ts`): the units are reserved with the pending row in one transaction committed before any
 * network call, every outcome write is guarded on `status = 'pending'`, and the units settle in the outcome's own
 * transaction. A run reserves `UPGRADE_UNITS` whole; a refund returns all of them.
 */

export type UpgradeHandle = { runId: string; callId: string };

export type StartedUpgrade =
  | ({ kind: "started" } & UpgradeHandle)
  | { kind: "allowance" } | { kind: "ownerShare" } | { kind: "paused" } | { kind: "in_flight" } | { kind: "current" };

class AlreadyCurrentError extends Error {}
class InFlightError extends Error {}

/**
 * ONE transaction: reserve the run's credits and insert the pending row. Starts for one reader and precon are SERIALIZED by
 * an advisory lock, and inside it the press is re-checked: a run already done for this very strategy that kept its charge
 * is `current` (a second press that lost the race to a first that has since finished; nothing is reserved), and a pending
 * one is `in_flight`. The partial unique index stays as the floor under the lock. Another strategy is another run.
 */
export async function startUpgrade(
  userId: string, preconFile: string, strategy: { key: string; label: string }, model: string, now = new Date(),
): Promise<StartedUpgrade> {
  try {
    const handle = await db.transaction(async (tx): Promise<UpgradeHandle> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`precon_upgrade:${userId}:${preconFile}`}))`);
      const { rows } = await tx.execute<{ status: string; strategy_key: string; refunded: boolean }>(sql`
        select status, strategy_key, refunded from precon_upgrades
        where user_id = ${userId} and precon_file = ${preconFile} and status in ('pending', 'done')
        order by created_at desc limit 20`);
      if (rows.some((r) => r.status === "pending")) throw new InFlightError();
      if (rows.some((r) => r.status === "done" && r.strategy_key === strategy.key && !r.refunded)) throw new AlreadyCurrentError();
      const unit = await reserveModelCall(tx, userId, "precon_upgrade", model, now, "player", UPGRADE_UNITS);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(preconUpgrades).values({
        userId, preconFile, strategyKey: strategy.key, strategyLabel: strategy.label, status: "pending", modelCallId: unit.id, model, createdAt: now,
      }).returning({ id: preconUpgrades.id });
      return { runId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    if (err instanceof AlreadyCurrentError) return { kind: "current" };
    if (err instanceof InFlightError || isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

export type UpgradeOutcomeWrite =
  | { status: "done"; pairs: UpgradePair[]; drops: UpgradeDrop[]; buyTotalCents: number; bracketBefore: number | null; bracketAfter: number | null; calls: 1 | 2; refunded: boolean; errorClass?: string }
  | { status: "failed"; errorClass: string };

/**
 * The outcome and the credits in one transaction: spent for a run that reached the minimum, refunded otherwise (a failed
 * call, or a short answer: `upgradeChargeFor`). False when the row was no longer pending (reaped), in which case only the
 * usage is recorded.
 */
export async function finishUpgrade(handle: UpgradeHandle, write: UpgradeOutcomeWrite, billed?: Billed, now = new Date()): Promise<boolean> {
  const refunded = write.status === "failed" ? true : write.refunded;
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(preconUpgrades)
        .set(write.status === "done"
          ? {
            status: "done", refunded, pairs: write.pairs, drops: write.drops, buyTotalCents: write.buyTotalCents,
            bracketBefore: write.bracketBefore, bracketAfter: write.bracketAfter, calls: write.calls, errorClass: write.errorClass ?? null, finishedAt: now,
          }
          : { status: "failed", errorClass: write.errorClass, refunded, finishedAt: now })
        .where(and(eq(preconUpgrades.id, handle.runId), eq(preconUpgrades.status, "pending")))
        .returning({ id: preconUpgrades.id });
      if (written.length === 0) throw new RunSupersededError();
      await settleModelCall(tx, handle.callId, refunded ? "refunded" : "spent", billed, now, refunded ? (write.status === "failed" ? "failed" : "nothing_valid") : null);
    });
  } catch (err) {
    if (err instanceof RunSupersededError) {
      await db.transaction((tx) => recordLate(tx, handle.callId, billed));
      return false;
    }
    throw err;
  }
  return true;
}

/** Fails and refunds a pending run older than `UPGRADE_REAP_MS` for this reader and precon, so a dead process cannot block every later press. */
export async function reapUpgrades(userId: string, preconFile: string, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - UPGRADE_REAP_MS);
  return db.transaction(async (tx) => {
    const reaped = await tx.update(preconUpgrades)
      .set({ status: "failed", errorClass: "interrupted", refunded: true, finishedAt: now })
      .where(and(eq(preconUpgrades.userId, userId), eq(preconUpgrades.preconFile, preconFile), eq(preconUpgrades.status, "pending"), lt(preconUpgrades.createdAt, cutoff)))
      .returning({ callId: preconUpgrades.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now, "reaped");
    return reaped.length;
  });
}

export type StoredUpgrade = {
  id: string;
  status: "pending" | "done" | "failed";
  strategyKey: string;
  strategyLabel: string;
  refunded: boolean;
  createdAt: Date;
  pairs: UpgradePair[];
  buyTotalCents: number | null;
  bracketBefore: number | null;
  bracketAfter: number | null;
};

/**
 * A reader's runs on one precon that can be shown: the newest pending one, and the newest DONE one per strategy that kept
 * its charge (a refunded run is not a result). Newest first. A failure is never returned.
 */
export async function readUpgrades(userId: string, preconFile: string): Promise<StoredUpgrade[]> {
  const rows = await db.select({
    id: preconUpgrades.id, status: preconUpgrades.status, strategyKey: preconUpgrades.strategyKey, strategyLabel: preconUpgrades.strategyLabel,
    refunded: preconUpgrades.refunded, createdAt: preconUpgrades.createdAt, pairs: preconUpgrades.pairs, buyTotalCents: preconUpgrades.buyTotalCents,
    bracketBefore: preconUpgrades.bracketBefore, bracketAfter: preconUpgrades.bracketAfter,
  }).from(preconUpgrades)
    .where(and(eq(preconUpgrades.userId, userId), eq(preconUpgrades.preconFile, preconFile), inArray(preconUpgrades.status, ["pending", "done"])))
    .orderBy(desc(preconUpgrades.createdAt)).limit(50);
  const seen = new Set<string>();
  const out: StoredUpgrade[] = [];
  for (const r of rows) {
    if (r.status === "done" && r.refunded) continue;
    if (r.status === "done") {
      if (seen.has(r.strategyKey)) continue;
      seen.add(r.strategyKey);
    }
    out.push({ ...r, status: r.status as StoredUpgrade["status"] });
  }
  return out;
}
