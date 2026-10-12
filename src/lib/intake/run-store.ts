
import { Pool } from "@neondatabase/serverless";
import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";

import { db } from "../../db";
import { intakeReadStops, intakeReads } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, recordModelUsage, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import type { ModelErrorClass } from "../model/client";
import { INTAKE_REAPER_CUTOFF_MS } from "./limits";
import type { TheReadResult } from "./the-read";

/**
 * The read's writes (plan, decision 1). SERVER-ONLY: it imports the database. Kept out of the
 * `"use server"` module so a probe can call the real functions, which there would become public
 * actions taking an arbitrary read id.
 *
 * A read has its own row because it happens before any deck exists and Stop must refund (F4).
 * The row and its allowance unit are written and settled together, as tuning's run is:
 *  - the start reserves the unit and inserts the `pending` row in ONE transaction, before any
 *    network call, so a read holds both or neither;
 *  - every settle is guarded on `status = 'pending'`, so whichever of the outcome, a Stop and the
 *    reaper arrives second changes nothing;
 *  - only a read that produced a pick spends the unit. A failure, a Stop and a read with nothing
 *    to show (F4) refund it.
 * A LATE answer, one that arrives after a Stop or the reaper, writes nothing to the read and
 * nothing to the credit. Its bill still lands on the ledger by the unit id the start handed back,
 * because the upstream call billed all the same.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type { Billed };

/** The values `intake_reads_error_class_check` allows. */
export type ReadErrorClass = Exclude<ModelErrorClass, "upstream_rejected"> | "nothing_valid" | "interrupted";

/** A started read as its caller holds it for the request: the row's id and its unit's id. */
export type ReadHandle = { readId: string; callId: string };

/**
 * ONE ASK, ONE READ, atomically. A press's check for a stored read and its insert, and every
 * settle, take this per-player lock first, so a settle cannot commit between another press's check
 * and its insert: either the read is still pending (the one-pending index refuses the press) or it
 * has settled and the check sees it.
 */
async function lockAsks(tx: Tx, userId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`intake-read:${userId}`}, 0))`);
}

/** How long an early Stop is kept for its press to find: far past any start's wait for the lock. */
const STOP_KEPT_MS = 24 * 60 * 60 * 1000;

/**
 * The most early stops one player may hold at once. One is left only when a Stop outruns its own
 * press, so a real player holds a handful at most; the cap is what bounds the table, since the
 * Stop route takes any id a signed-in caller sends. With every older stop purged first, the table
 * holds at most this many rows per player, whether or not that player ever comes back.
 */
export const EARLY_STOPS_MAX = 20;

/** This player's early stops past keeping: no start still waiting could be looking for them. */
async function purgeStops(tx: Tx, userId: string, now: Date): Promise<void> {
  await tx.delete(intakeReadStops)
    .where(and(eq(intakeReadStops.userId, userId), lt(intakeReadStops.createdAt, new Date(now.getTime() - STOP_KEPT_MS))));
}

class StoredFound extends Error {
  constructor(readonly readId: string, readonly useful: boolean, readonly result: TheReadResult | null) { super("stored"); }
}

/**
 * A two-step read by its id, as the results page and its panel draw it (rework plan PR 4): where it
 * stands, and its picks once settled. Scoped to the reader: another player's id reads as none.
 */
export type TheReadState =
  | { kind: "pending"; phase: "shortlist" | "judge" | null }
  | { kind: "done"; result: TheReadResult }
  | { kind: "nothing"; result: TheReadResult | null }
  | { kind: "failed" }
  | { kind: "stopped" }
  | { kind: "none" };

export async function loadTheRead(readId: string, userId: string, now: Date = new Date()): Promise<TheReadState> {
  const [row] = await db.select({
    status: intakeReads.status, errorClass: intakeReads.errorClass, phase: intakeReads.phase,
    result: intakeReads.result, createdAt: intakeReads.createdAt, chips: intakeReads.chips,
  }).from(intakeReads).where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId)));
  if (!row) return { kind: "none" };
  const result = (row.result ?? null) as TheReadResult | null;
  if (row.status === "pending") {
    if (row.createdAt >= reapCutoff(now)) return { kind: "pending", phase: (row.phase ?? null) as "shortlist" | "judge" | null };
    // Past the reaper's cutoff nothing will settle it. Reap it here, refunding its credit, before
    // the panel says the credit came back: the allowance then agrees with what it is told. A
    // settle or a Stop can land between the read above and the reap, which then takes nothing:
    // the row is read again, so it answers as what it became rather than as failed.
    const reaped = await db.transaction((tx) => reapReads(tx, userId, now));
    if (reaped === 0) return loadTheRead(readId, userId, now);
    return { kind: "failed" };
  }
  if (row.status === "ok" && result) return { kind: "done", result };
  // A read from the retired one-call engine carries `chips` and no `result`: it settled, and was
  // charged, but has nothing this panel can draw. It reads as no read at all, never as failed.
  if (!result && row.chips) return { kind: "none" };
  if (row.status === "failed" && row.errorClass === "nothing_valid") return { kind: "nothing", result };
  if (row.status === "cancelled") return { kind: "stopped" };
  return { kind: "failed" };
}

/**
 * The player's settled read of this ask, with its own id, when there is one: a delivered read, or
 * one that found nothing to add. Both are the ask's answer, so neither is asked again; a repeat of
 * a nothing read would otherwise call the model again for the same words.
 */
async function storedRead(tx: Tx, userId: string, hash: string): Promise<{ id: string; useful: boolean; result: TheReadResult | null } | null> {
  const [row] = await tx.select({ id: intakeReads.id, result: intakeReads.result, status: intakeReads.status }).from(intakeReads)
    .where(and(
      eq(intakeReads.userId, userId),
      eq(intakeReads.wordsHash, hash),
      or(eq(intakeReads.status, "ok"), and(eq(intakeReads.status, "failed"), eq(intakeReads.errorClass, "nothing_valid"))),
    ))
    .orderBy(desc(intakeReads.createdAt)).limit(1);
  // A row from the retired one-call read carries `chips` and no `result`: it is not this ask's
  // answer, whatever its hash, so it is never offered back.
  if (!row?.result) return null;
  return { id: row.id, useful: row.status === "ok", result: row.result as TheReadResult };
}

/**
 * ONE PRESS PER PLAYER AT A TIME, from the pool read to the reservation. `run` is the press's
 * expensive first half (the inputs, then `startRead`); this runs it only if no other press of the
 * player's is in it, and answers `busy` at once, reading nothing, if one is. Without it a scripted
 * burst of presses each loads the whole pool before the one-pending index refuses all but one at
 * the reservation, so the burst costs N pool reads for one read.
 *
 * A transaction-scoped TRY lock on a dedicated connection, as `withCatalogIngestLock` holds its
 * lock (never a session lock: the Neon pooler runs in transaction mode). The connection comes from
 * the admission's OWN pool, NOT the app's shared one: `run` needs the shared pool's connections for
 * the pool read and the reservation, and a lock held on one of those would let ten players pressing
 * at once (the shared pool's size, with no connection timeout) each hold a connection while waiting
 * for another. The admission pool is bounded (`ADMISSION_POOL_MAX`) and kept on `globalThis` like
 * the app's, so a burst queues for a connection instead of opening one per press, and a holder
 * never waits on this pool, so the queue always drains. A press that waits longer than
 * `ADMISSION_WAIT_MS` for a connection fails with the pool's error rather than waiting on.
 * The transaction commits when `run` returns, so the hold is the pool read and the reservation,
 * never the two model calls, which run after. The key is the admission's own: `startRead` takes
 * its own locks inside `run`, and nothing in `run` waits on this one, so the nesting cannot
 * deadlock. A press that throws rolls back and releases the lock.
 *
 * THE LOCK ALONE DOES NOT SAY NO ONE IS READING: a press that arrives after another has reserved
 * and released finds the lock free. `run` re-checks `hasRunningRead` inside it, which is what
 * refuses that press before it loads anything.
 */
const ADMISSION_POOL_MAX = 5;
const ADMISSION_WAIT_MS = 15_000;
const admissionShared = globalThis as typeof globalThis & { __the99AdmissionPool?: Pool };
function admissionPool(): Pool {
  admissionShared.__the99AdmissionPool ??= new Pool({
    connectionString: process.env.DATABASE_URL, max: ADMISSION_POOL_MAX, connectionTimeoutMillis: ADMISSION_WAIT_MS,
  });
  return admissionShared.__the99AdmissionPool;
}
export async function withReadAdmission<T>(userId: string, run: () => Promise<T>): Promise<T | "busy"> {
  const client = await admissionPool().connect();
  // A connection goes back to the pool only once its transaction has been committed or rolled back
  // cleanly. Anything else (a failed BEGIN, a failed lock query, a failed rollback or commit) leaves
  // it open or aborted, and `release` does not reset that: it is destroyed instead.
  let clean = false;
  const rollback = async () => { await client.query("rollback"); clean = true; };
  try {
    await client.query("begin");
    const { rows } = await client.query("select pg_try_advisory_xact_lock(hashtextextended($1, 0)) as got", [`intake-admit:${userId}`]);
    if ((rows[0] as { got: boolean } | undefined)?.got !== true) {
      await rollback();
      return "busy";
    }
    let result: T;
    try {
      result = await run();
    } catch (err) {
      await rollback().catch(() => {});
      throw err;
    }
    // This transaction owns only the lock; what `run` did (the reservation) is already committed on
    // the app's pool. So a commit that fails does not discard that result, or the press would error
    // out before it scheduled the read it reserved and strand it: the connection is destroyed, which
    // releases the lock, and the result is returned.
    try {
      await client.query("commit");
      clean = true;
    } catch {
      // `clean` stays false.
    }
    return result;
  } finally {
    client.release(clean ? undefined : true);
  }
}

/**
 * Fails and refunds this player's pending reads past the reaper's cutoff, in a transaction of its
 * own. The credit gate calls it before refusing a spent allowance: an abandoned read still holds its
 * unit until something reaps it, and `startRead` would have reaped it before reserving.
 */
export async function reapAbandonedReads(userId: string, now: Date = new Date()): Promise<number> {
  return db.transaction((tx) => reapReads(tx, userId, now));
}

/**
 * Whether the player has a read running, read cheaply BEFORE a press loads its inputs: a second
 * tab or a scripted burst then costs one indexed lookup, never the pool's whole read. Not the
 * race-safe check, which stays `startRead`'s unique index; a pending read past the reaper's cutoff
 * is abandoned, not running.
 */
export async function hasRunningRead(userId: string, now: Date = new Date()): Promise<boolean> {
  const [pending] = await db.select({ id: intakeReads.id }).from(intakeReads)
    .where(and(eq(intakeReads.userId, userId), eq(intakeReads.status, "pending"), gte(intakeReads.createdAt, reapCutoff(now))))
    .limit(1);
  return pending !== undefined;
}

export function reapCutoff(now: Date): Date {
  return new Date(now.getTime() - INTAKE_REAPER_CUTOFF_MS);
}

/**
 * The reaper. Fails the player's abandoned pending read as `interrupted` and refunds its unit, in
 * the caller's transaction, so a crashed request never locks the player out behind the one-pending
 * index. Scoped to the player: a press never writes across anyone else's rows.
 */
export async function reapReads(tx: Tx, userId: string, now: Date = new Date()): Promise<number> {
  const reaped = await tx.update(intakeReads)
    .set({ status: "failed", errorClass: "interrupted", phase: null })
    .where(and(
      eq(intakeReads.userId, userId),
      eq(intakeReads.status, "pending"),
      lt(intakeReads.createdAt, reapCutoff(now)),
    ))
    .returning({ callId: intakeReads.modelCallId });
  for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now);
  return reaped.length;
}

/**
 * Reap first, in its own transaction; then ONE transaction reserves a unit and inserts the pending row. The allowance lock makes the last
 * unit single-winner; the partial unique index makes a second read in flight impossible, and
 * because the unit and the row share the transaction the loser of that race holds no unit.
 */
export async function startRead(
  userId: string,
  /** The ask's hash (`wordsHash`). */
  hash: string,
  /** The model this read is made with: the real one, or the stub every non-live process uses. */
  model: string,
  /** `readId` is the id the panel chose for this press, so its Stop cancels exactly this read. */
  opts: { readId?: string; now?: Date } = {},
): Promise<({ kind: "started" } & ReadHandle) | { kind: "stored"; readId: string; useful: boolean; result: TheReadResult | null } | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "reused" } | { kind: "stopped" }> {
  const now = opts.now ?? new Date();
  // The reap commits on its own, first: inside the reservation's transaction a refusal would roll
  // it back and leave the stranded read holding the one-pending slot.
  await db.transaction((tx) => reapReads(tx, userId, now));
  try {
    const handle = await db.transaction(async (tx): Promise<ReadHandle | "stopped"> => {
      // An ask already read is offered once: its stored result comes back and no unit is reserved.
      await lockAsks(tx, userId);
      // A Stop that beat this start to the database (`cancelRead` left its id): nothing is
      // reserved, so nothing is spent. The stop has done its work and is consumed, in this
      // transaction (returned, not thrown, so the delete commits): the per-player cap then counts
      // only stops no press ever claimed. Older stops go in passing; a press's id is used once.
      if (opts.readId) {
        await purgeStops(tx, userId, now);
        const consumed = await tx.delete(intakeReadStops)
          .where(and(eq(intakeReadStops.readId, opts.readId), eq(intakeReadStops.userId, userId)))
          .returning({ id: intakeReadStops.readId });
        if (consumed.length > 0) return "stopped";
      }
      const stored = await storedRead(tx, userId, hash);
      if (stored) throw new StoredFound(stored.id, stored.useful, stored.result);
      const unit = await reserveModelCall(tx, userId, "intake", model, now);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(intakeReads).values({
        ...(opts.readId ? { id: opts.readId } : {}),
        userId, wordsHash: hash, model, modelCallId: unit.id, status: "pending", createdAt: now,
      }).returning({ id: intakeReads.id });
      return { readId: row.id, callId: unit.id };
    });
    if (handle === "stopped") return { kind: "stopped" };
    return { kind: "started", ...handle };
  } catch (err) {
    // The stored read's OWN id, not the press's: the results page verifies the read by it.
    if (err instanceof StoredFound) return { kind: "stored", readId: err.readId, useful: err.useful, result: err.result };
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    // Two unique indexes can refuse this insert, and only one of them means a read is in flight.
    // The id is the panel's, so a press that reuses one names a read that already exists.
    if (isUniqueViolation(err)) return { kind: constraintOf(err) === "intake_reads_pkey" ? "reused" : "in_flight" };
    throw err;
  }
}

/**
 * Move a pending read to its next call (F2), so the waiting panel can say which step it is on.
 * False when the read is no longer pending: a Stop or the reaper settled it, and the runner stops.
 */
export async function setReadPhase({ readId, userId }: { readId: string; userId: string }, phase: "shortlist" | "judge"): Promise<boolean> {
  const rows = await db.update(intakeReads).set({ phase })
    .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId), eq(intakeReads.status, "pending")))
    .returning({ id: intakeReads.id });
  return rows.length > 0;
}

/**
 * Settle a two-step read (rework plan PR 1), in ONE transaction with its unit: a result with a
 * pick is `ok` and spends; one with none found nothing and
 * refunds (lock 7); a failed call refunds. Every call that came back is billed, the shortlist's too.
 * False when the read was no longer pending: its bill still lands, and nothing else does.
 */
export async function settleTheRead(
  { readId, callId, userId }: ReadHandle & { userId: string },
  outcome: { kind: "read"; result: TheReadResult } | { kind: "failed"; errorClass: Exclude<ModelErrorClass, "upstream_rejected"> | "interrupted" },
  billed: readonly Billed[],
  /**
   * A fingerprint to store in place of the one the read started under: the runner passes one no
   * press can ask when an input the fingerprint covers moved while the calls ran, so the answer is
   * the player's but is never handed to a repeat of an ask it no longer answers.
   */
  opts: { rehash?: string } = {},
): Promise<boolean> {
  const useful = outcome.kind === "read" && outcome.result.picks.length > 0;
  const hash = opts.rehash ? { wordsHash: opts.rehash } : {};
  const set = outcome.kind === "failed"
    ? { status: "failed", errorClass: outcome.errorClass, phase: null }
    : useful
      ? { status: "ok", result: outcome.result, phase: null, ...hash }
      : { status: "failed", errorClass: "nothing_valid" as const, result: outcome.result, phase: null, ...hash };
  return db.transaction(async (tx) => {
    await lockAsks(tx, userId);
    const rows = await tx.update(intakeReads)
      .set(set)
      .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId), eq(intakeReads.status, "pending")))
      .returning({ callId: intakeReads.modelCallId });
    const bill = billed.length > 0 ? billed : undefined;
    if (rows.length === 0) {
      if (bill) await recordModelUsage(tx, callId, bill);
      return false;
    }
    await settleModelCall(tx, rows[0].callId, useful ? "spent" : "refunded", bill);
    return true;
  });
}

/** The constraint a Postgres error names, wherever the driver put it (the walk `sqlstate` takes). */
function constraintOf(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    const name = (current as { constraint?: unknown }).constraint;
    if (typeof name === "string") return name;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * A Stop: the read the panel was watching, and no other, scoped to the reader. A Stop is not an
 * answer, so its unit comes back. False when there was nothing pending to stop.
 */
export async function cancelRead(readId: string, userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    // The same lock a start and a settle take, so a Stop that arrives while a start is still
    // inserting waits for that insert and then finds the read pending, rather than finding nothing.
    await lockAsks(tx, userId);
    const rows = await tx.update(intakeReads)
      .set({ status: "cancelled", phase: null })
      .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId), eq(intakeReads.status, "pending")))
      .returning({ callId: intakeReads.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded", undefined);
    if (rows.length > 0) return true;
    // Nothing pending by this id. A read that exists has settled and is past stopping. One that
    // does not exist yet is a press whose start has not reached the database: the Stop is left
    // for that start to find, so it refuses before reserving and the player is never charged.
    // This player's read, as every other step of the Stop is: another player's row with the id says
    // nothing about this press, which must still find its stop.
    const [exists] = await tx.select({ id: intakeReads.id }).from(intakeReads)
      .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId)));
    if (exists) return false;
    // Purged here as well as at a start: a player who presses Stop early and never starts another
    // look would otherwise leave every such stop behind for good.
    await purgeStops(tx, userId, new Date());
    const [{ held }] = await tx.select({ held: sql<number>`count(*)::int` }).from(intakeReadStops)
      .where(eq(intakeReadStops.userId, userId));
    // Past the cap the Stop is not taken: the panel puts Stop back, and the press answers as usual.
    if (held >= EARLY_STOPS_MAX) return false;
    // Keyed by player and id, so a conflict is this player's own earlier stop, which still stands.
    await tx.insert(intakeReadStops).values({ readId, userId }).onConflictDoNothing();
    return true;
  });
}
