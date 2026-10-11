import { createHash } from "node:crypto";

import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";

import { db } from "../../db";
import { intakeReadStops, intakeReads } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, recordModelUsage, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import type { ModelErrorClass } from "../model/client";
import { INTAKE_REAPER_CUTOFF_MS } from "./limits";
import { INTAKE_PROMPT_VERSION, type ReadResult } from "./read";
import type { TheReadResult } from "./the-read";

/**
 * The deeper read's writes (plan, decision 1). SERVER-ONLY: it imports the database. Kept out of
 * the `"use server"` module so `probe:help-me-choose-read` can call the real functions, which
 * there would become public actions taking an arbitrary read id.
 *
 * A read has its own row because it happens before any deck exists and Stop must refund (F4).
 * The row and its allowance unit are written and settled together, as tuning's run is:
 *  - the start reserves the unit and inserts the `pending` row in ONE transaction, before any
 *    network call, so a read holds both or neither;
 *  - every settle is guarded on `status = 'pending'`, so whichever of the outcome, a Stop and the
 *    reaper arrives second changes nothing;
 *  - only a read that produced a valid chip spends the unit. A failure, a Stop and a reply with
 *    nothing valid in it (F4) refund it.
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

/** What a settled read stores: every chip that survived, and the two lists the panel draws. */
export type StoredRead = Omit<ReadResult, "useful">;

export type ReadControls = { budgetDollars: number | null; bracket: number | null };

/**
 * What a read was asked, as the row keeps it: a hash of the words' normalized form, the two
 * controls the validator read them against, and the prompt version — and nothing else. A read
 * need not keep what the player wrote to be accounted for. Two presses of the same words under
 * the same controls AND the same prompt hash alike however they were spaced or cased, and that
 * is what makes a read offered ONCE per ask: the second press gets the first one's chips back,
 * charged nothing. A changed control, or a changed `INTAKE_PROMPT_VERSION`, is a different ask —
 * the prompt moving the hash is what stops an ask settled before a prompt change from going on
 * answering from its old result forever, the same way `PROMPT_VERSION` reopens tuning's gate.
 */
/**
 * The words' form for the hash: Unicode-normalized, case-folded, runs of space collapsed. NOT
 * `phraseKey`, which keeps only ASCII letters and digits and would hash two different asks in
 * another script, or two strings of emoji, alike, and hand one of them the other's read.
 */
function askKey(words: string): string {
  return words.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function wordsHash(words: string, controls: ReadControls): string {
  return createHash("sha256")
    .update(JSON.stringify([askKey(words), controls.budgetDollars, controls.bracket, INTAKE_PROMPT_VERSION]))
    .digest("hex");
}

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
  constructor(readonly read: StoredRead, readonly readId: string, readonly useful: boolean, readonly result: TheReadResult | null) { super("stored"); }
}

/**
 * A settled read by its id, for the results page the panel sent the player to (`r`). `read` is a
 * delivered one, whose chips mark the answers that came from it; `nothing` found nothing to add and
 * was refunded, and its leftovers are still worth showing. Scoped to the reader: an id from someone
 * else, or a read that failed, was stopped or is still pending, reads as none.
 */
export async function loadOwnRead(readId: string, userId: string): Promise<{ kind: "read" | "nothing"; read: StoredRead; wordsHash: string } | null> {
  const [row] = await db.select({ status: intakeReads.status, errorClass: intakeReads.errorClass, chips: intakeReads.chips, wordsHash: intakeReads.wordsHash })
    .from(intakeReads)
    .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId)));
  if (!row?.chips) return null;
  const read = row.chips as StoredRead;
  if (row.status === "ok") return { kind: "read", read, wordsHash: row.wordsHash };
  if (row.status === "failed" && row.errorClass === "nothing_valid") return { kind: "nothing", read, wordsHash: row.wordsHash };
  return null;
}

/**
 * The player's settled read of this ask, with its own id, when there is one: a delivered read, or
 * one that found nothing to add. Both are the ask's answer, so neither is asked again; a repeat of
 * a nothing read would otherwise call the model again for the same words.
 */
async function storedRead(tx: Tx, userId: string, hash: string): Promise<{ id: string; read: StoredRead; useful: boolean; result: TheReadResult | null } | null> {
  const [row] = await tx.select({ id: intakeReads.id, chips: intakeReads.chips, result: intakeReads.result, status: intakeReads.status }).from(intakeReads)
    .where(and(
      eq(intakeReads.userId, userId),
      eq(intakeReads.wordsHash, hash),
      or(eq(intakeReads.status, "ok"), and(eq(intakeReads.status, "failed"), eq(intakeReads.errorClass, "nothing_valid"))),
    ))
    .orderBy(desc(intakeReads.createdAt)).limit(1);
  // A row from the retired one-call read carries `chips`; one from the two-step read, `result`. A
  // fingerprint names one kind only (the two hash different payloads), so a caller meets its own.
  if (!row || (!row.chips && !row.result)) return null;
  return { id: row.id, read: (row.chips ?? EMPTY_READ) as StoredRead, useful: row.status === "ok", result: (row.result ?? null) as TheReadResult | null };
}

/**
 * Where an ask stands for a press that found another look already running (`in_flight`), or found
 * its own id already written (`reused`). READ ONLY: nothing is reaped or reserved. `stored` is
 * this ask's read, as a repeat press would find it; `running` is a live pending read of the
 * player's, whatever its words; `idle` is neither, so the other look ended without answering this
 * ask and a press would start one.
 */
export async function readStatus(
  userId: string,
  hash: string,
  now: Date = new Date(),
  /** The probe's seam: runs between the two reads, where a settle landing would split them. */
  between?: () => Promise<void>,
): Promise<{ kind: "stored"; read: StoredRead; readId: string; useful: boolean } | { kind: "running" } | { kind: "idle" }> {
  // ONE SNAPSHOT for both reads. As separate statements a settle committing between them reads as
  // neither stored nor pending, `idle`, and the waiting panel drops the very answer it waited for.
  return db.transaction(async (tx) => {
    const stored = await storedRead(tx, userId, hash);
    if (stored) return { kind: "stored" as const, read: stored.read, readId: stored.id, useful: stored.useful };
    await between?.();
    // A pending read the reaper would fail is abandoned, not running: past the cutoff nothing will
    // settle it.
    const [pending] = await tx.select({ id: intakeReads.id }).from(intakeReads)
      .where(and(eq(intakeReads.userId, userId), eq(intakeReads.status, "pending"), gte(intakeReads.createdAt, reapCutoff(now))))
      .limit(1);
    return pending ? { kind: "running" as const } : { kind: "idle" as const };
  }, { isolationLevel: "repeatable read" });
}

const EMPTY_READ: StoredRead = { chips: [], notUsed: [], notUnderstood: [] };

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
): Promise<({ kind: "started" } & ReadHandle) | { kind: "stored"; read: StoredRead; readId: string; useful: boolean; result: TheReadResult | null } | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "reused" } | { kind: "stopped" }> {
  const now = opts.now ?? new Date();
  // The reap commits on its own, first: inside the reservation's transaction a refusal would roll
  // it back and leave the stranded read holding the one-pending slot.
  await db.transaction((tx) => reapReads(tx, userId, now));
  try {
    const handle = await db.transaction(async (tx): Promise<ReadHandle | "stopped"> => {
      // An ask already read is offered once: its chips come back and no unit is reserved.
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
      if (stored) throw new StoredFound(stored.read, stored.id, stored.useful, stored.result);
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
    if (err instanceof StoredFound) return { kind: "stored", read: err.read, readId: err.readId, useful: err.useful, result: err.result };
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    // Two unique indexes can refuse this insert, and only one of them means a read is in flight.
    // The id is the panel's, so a press that reuses one names a read that already exists.
    if (isUniqueViolation(err)) return { kind: constraintOf(err) === "intake_reads_pkey" ? "reused" : "in_flight" };
    throw err;
  }
}

/**
 * Settle a read on its outcome, in ONE transaction with its unit: a validated read with a chip is
 * `ok` and spends; a read with none is `nothing_valid` and refunds (F4); a failed call refunds
 * with its class. False when the read was no longer pending: the answer is late and writes
 * nothing but its bill.
 */
export async function settleRead(
  { readId, callId, userId }: ReadHandle & { userId: string },
  outcome: { kind: "read"; result: ReadResult } | { kind: "failed"; errorClass: Exclude<ModelErrorClass, "upstream_rejected"> },
  billed?: Billed,
): Promise<boolean> {
  const useful = outcome.kind === "read" && outcome.result.useful;
  const set = outcome.kind === "failed"
    ? { status: "failed", errorClass: outcome.errorClass }
    : useful
      ? { status: "ok", chips: stored(outcome.result) }
      : { status: "failed", errorClass: "nothing_valid" as const, chips: stored(outcome.result) };
  return db.transaction(async (tx) => {
    await lockAsks(tx, userId);
    const rows = await tx.update(intakeReads)
      .set(set)
      // The reader's own read only, as a Stop is scoped: a handle for another player's read settles
      // nothing.
      .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId), eq(intakeReads.status, "pending")))
      .returning({ callId: intakeReads.modelCallId });
    if (rows.length === 0) {
      if (billed) await recordModelUsage(tx, callId, billed);
      return false;
    }
    await settleModelCall(tx, rows[0].callId, useful ? "spent" : "refunded", billed);
    return true;
  });
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
 * Settle a two-step read (rework plan PR 1), in ONE transaction with its unit, as `settleRead` does
 * the one-call read: a result with a pick is `ok` and spends; one with none found nothing and
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

function stored({ chips, notUsed, notUnderstood }: ReadResult): StoredRead {
  return { chips, notUsed, notUnderstood };
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
