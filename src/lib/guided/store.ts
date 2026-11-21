import { and, desc, eq, lt, sql } from "drizzle-orm";

import { db } from "../../db";
import { decks, guidedBuilds } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import { UPGRADE_REAP_MS } from "../precons/upgrade/constants";
import type { StoredPair, UpgradeDrop } from "../precons/upgrade/validate";
import { recordLate, RunSupersededError } from "../tuning/run-store";
import { applyGuidedPairsIn } from "./apply";
import { GUIDED_UNITS, type PoolMode } from "./constants";

/**
 * Guided build's writes and reads. SERVER-ONLY: it imports the database. The shape is Upgrade this precon's store
 * (`precons/upgrade/store.ts`), keyed on a DECK: the credits are reserved with the pending row in one transaction
 * committed before any network call, every outcome write is guarded on `status = 'pending'`, and the credits settle in the
 * outcome's own transaction. A run reserves `GUIDED_UNITS` whole; a refund returns all of them.
 */

export type GuidedHandle = { runId: string; callId: string };

export type GuidedParams = {
  strategy: { key: string; label: string };
  bracketTarget: number;
  poolMode: PoolMode;
  poolCapCents: number | null;
  budgetCents: number | null;
  /** Oracle ids the player kept (G5). */
  kept: readonly string[];
};

export type StartedGuided =
  | ({ kind: "started" } & GuidedHandle)
  | { kind: "allowance" } | { kind: "ownerShare" } | { kind: "paused" } | { kind: "in_flight" } | { kind: "current" } | { kind: "notFound" };

class AlreadyCurrentError extends Error {}
class InFlightError extends Error {}
class DeckNotFoundError extends Error {}

/**
 * ONE transaction: reserve the run's credits and insert the pending row. Starts for one deck are SERIALIZED by an advisory lock,
 * and inside it the press is re-checked: a pending run is `in_flight`, a run already done that kept its charge is `current`
 * (a second press that lost the race to a first that has since finished; nothing is reserved). The partial unique index on
 * `(deck_id) where status = 'pending'` stays as the floor under the lock. The caller reaps a dead pending run first (`reapGuided`), or it reads as in flight. The deck must be the reader's own: the id is never
 * trusted, and another reader's deck reads as `notFound`.
 */
export async function startGuided(userId: string, deckId: string, params: GuidedParams, model: string, now = new Date()): Promise<StartedGuided> {
  try {
    const handle = await db.transaction(async (tx): Promise<GuidedHandle> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`guided_build:${userId}:${deckId}`}))`);
      const { rows: [seen] } = await tx.execute<{ owned: boolean; pending: boolean; current: boolean }>(sql`
        select
          exists (select 1 from decks d where d.id = ${deckId} and d.user_id = ${userId}) as owned,
          exists (select 1 from guided_builds g where g.deck_id = ${deckId} and g.status = 'pending') as pending,
          exists (select 1 from guided_builds g where g.deck_id = ${deckId} and g.status = 'done' and not g.refunded) as current`);
      if (!seen?.owned) throw new DeckNotFoundError();
      if (seen.pending) throw new InFlightError();
      if (seen.current) throw new AlreadyCurrentError();
      const unit = await reserveModelCall(tx, userId, "guided_build", model, now, "player", GUIDED_UNITS);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(guidedBuilds).values({
        userId, deckId, strategyKey: params.strategy.key, strategyLabel: params.strategy.label, bracketTarget: params.bracketTarget,
        poolMode: params.poolMode, poolCapCents: params.poolCapCents, budgetCents: params.budgetCents, kept: [...params.kept],
        status: "pending", modelCallId: unit.id, model, createdAt: now,
      }).returning({ id: guidedBuilds.id });
      return { runId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    if (err instanceof DeckNotFoundError) return { kind: "notFound" };
    if (err instanceof AlreadyCurrentError) return { kind: "current" };
    if (err instanceof InFlightError || isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

export type GuidedOutcomeWrite =
  | { status: "done"; pairs: StoredPair[]; drops: UpgradeDrop[]; buyTotalCents: number; bracketBefore: number | null; bracketAfter: number | null; calls: 1 | 2; refunded: boolean; errorClass?: string }
  | { status: "failed"; errorClass: string };

/**
 * The outcome and the credits in one transaction: spent for a run that reached the minimum, refunded otherwise (a failed call,
 * or a short answer: `upgradeChargeFor` decides, the caller passes the result as `refunded`). False when the row was no longer
 * pending (reaped), in which case only the usage is recorded.
 */
export async function finishGuided(handle: GuidedHandle, write: GuidedOutcomeWrite, billed?: Billed | readonly Billed[], now = new Date()): Promise<boolean> {
  const wantRefund = write.status === "failed" ? true : write.refunded;
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(guidedBuilds)
        .set(write.status === "done"
          ? {
            status: "done", refunded: wantRefund, pairs: write.pairs, drops: write.drops, buyTotalCents: write.buyTotalCents,
            bracketBefore: write.bracketBefore, bracketAfter: write.bracketAfter, calls: write.calls, errorClass: write.errorClass ?? null, finishedAt: now,
          }
          : { status: "failed", errorClass: write.errorClass, refunded: wantRefund, finishedAt: now })
        .where(and(eq(guidedBuilds.id, handle.runId), eq(guidedBuilds.status, "pending")))
        .returning({ id: guidedBuilds.id, userId: guidedBuilds.userId, deckId: guidedBuilds.deckId });
      if (written.length === 0) throw new RunSupersededError();
      // A done run's swaps land on the deck with its outcome (a short run's found cards stay, G6); a failed run changes nothing.
      if (write.status === "done") await applyGuidedPairsIn(tx, written[0].userId, written[0].deckId, write.pairs);
      const settled = await settleModelCall(tx, handle.callId, wantRefund ? "refunded" : "spent", billed, now, wantRefund ? (write.status === "failed" ? "failed" : "nothing_valid") : null);
      // A spend the ledger turned into a refund (`late_success`: the reservation outlived its window) is not a kept charge, so the row says so.
      if (!wantRefund && settled === "refunded") await tx.update(guidedBuilds).set({ refunded: true }).where(eq(guidedBuilds.id, handle.runId));
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

/** Fails and refunds a pending run older than `UPGRADE_REAP_MS` for this reader's deck, so a dead process cannot block every later press. */
export async function reapGuided(userId: string, deckId: string, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - UPGRADE_REAP_MS);
  return db.transaction(async (tx) => {
    const reaped = await tx.update(guidedBuilds)
      .set({ status: "failed", errorClass: "interrupted", refunded: true, finishedAt: now })
      .where(and(eq(guidedBuilds.userId, userId), eq(guidedBuilds.deckId, deckId), eq(guidedBuilds.status, "pending"), lt(guidedBuilds.createdAt, cutoff)))
      .returning({ callId: guidedBuilds.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now, "reaped");
    return reaped.length;
  });
}

/** What a deck shows of its run (G6): running while pending; a done run that kept its charge is `done`, one that was refunded for falling short is `short`. */
export type GuidedState = {
  id: string;
  state: "running" | "done" | "short" | "failed";
  strategyKey: string;
  strategyLabel: string;
  createdAt: Date;
  pairs: StoredPair[];
  buyTotalCents: number | null;
  bracketBefore: number | null;
  bracketAfter: number | null;
  bracketTarget: number;
  poolMode: PoolMode;
  /** The budget a `budget` run was given, in cents: what a retry sends again. */
  budgetCents: number | null;
  kept: string[];
  errorClass: string | null;
};

/**
 * The reader's own deck's newest run, or null when it has none (or the deck is not theirs): the state is DERIVED from that
 * one row, never a column on `decks`. The caller reaps first (`reapGuided`), or a dead run reads as running.
 */
export async function readGuidedState(userId: string, deckId: string): Promise<GuidedState | null> {
  const [r] = await db.select({
    id: guidedBuilds.id, status: guidedBuilds.status, refunded: guidedBuilds.refunded, strategyKey: guidedBuilds.strategyKey,
    strategyLabel: guidedBuilds.strategyLabel, createdAt: guidedBuilds.createdAt, pairs: guidedBuilds.pairs, buyTotalCents: guidedBuilds.buyTotalCents,
    bracketBefore: guidedBuilds.bracketBefore, bracketAfter: guidedBuilds.bracketAfter, bracketTarget: guidedBuilds.bracketTarget,
    poolMode: guidedBuilds.poolMode, budgetCents: guidedBuilds.budgetCents, kept: guidedBuilds.kept, errorClass: guidedBuilds.errorClass,
  })
    .from(guidedBuilds)
    .innerJoin(decks, eq(decks.id, guidedBuilds.deckId))
    .where(and(eq(guidedBuilds.deckId, deckId), eq(guidedBuilds.userId, userId), eq(decks.userId, userId)))
    .orderBy(desc(guidedBuilds.createdAt))
    .limit(1);
  if (!r) return null;
  const state = r.status === "pending" ? "running" : r.status === "failed" ? "failed" : r.refunded ? "short" : "done";
  return {
    id: r.id, state, strategyKey: r.strategyKey, strategyLabel: r.strategyLabel, createdAt: new Date(r.createdAt),
    pairs: r.pairs.map((p) => ({ ...p, cutReason: p.cutReason ?? null })), buyTotalCents: r.buyTotalCents,
    bracketBefore: r.bracketBefore, bracketAfter: r.bracketAfter, bracketTarget: r.bracketTarget, poolMode: r.poolMode as PoolMode, budgetCents: r.budgetCents,
    kept: r.kept, errorClass: r.errorClass,
  };
}
