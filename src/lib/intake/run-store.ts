import { createHash } from "node:crypto";

import { and, eq, lt } from "drizzle-orm";

import { db } from "../../db";
import { intakeReads } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, recordModelUsage, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import type { ModelErrorClass } from "../model/client";
import { INTAKE_REAPER_CUTOFF_MS } from "./limits";
import { phraseKey } from "./match";
import type { ReadResult } from "./read";

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
export type ReadErrorClass = ModelErrorClass | "nothing_valid" | "interrupted";

/** A started read as its caller holds it for the request: the row's id and its unit's id. */
export type ReadHandle = { readId: string; callId: string };

/** What a settled read stores: every chip that survived, and the two lists the panel draws. */
export type StoredRead = Omit<ReadResult, "useful">;

/**
 * The words, as the row keeps them: a hash of their normalized form and nothing else. A read
 * need not keep what the player wrote to be accounted for, and two presses of the same words
 * read as the same hash however they were spaced or cased.
 */
export function wordsHash(words: string): string {
  return createHash("sha256").update(phraseKey(words)).digest("hex");
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
    .set({ status: "failed", errorClass: "interrupted" })
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
  words: string,
  /** The model this read is made with: the real one, or the stub every non-live process uses. */
  model: string,
  /** `readId` is the id the panel chose for this press, so its Stop cancels exactly this read. */
  opts: { readId?: string; now?: Date } = {},
): Promise<({ kind: "started" } & ReadHandle) | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "reused" }> {
  const now = opts.now ?? new Date();
  // The reap commits on its own, first: inside the reservation's transaction a refusal would roll
  // it back and leave the stranded read holding the one-pending slot.
  await db.transaction((tx) => reapReads(tx, userId, now));
  try {
    const handle = await db.transaction(async (tx): Promise<ReadHandle> => {
      const unit = await reserveModelCall(tx, userId, "intake", model, now);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(intakeReads).values({
        ...(opts.readId ? { id: opts.readId } : {}),
        userId, wordsHash: wordsHash(words), model, modelCallId: unit.id, status: "pending", createdAt: now,
      }).returning({ id: intakeReads.id });
      return { readId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
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
  { readId, callId }: ReadHandle,
  outcome: { kind: "read"; result: ReadResult } | { kind: "failed"; errorClass: ModelErrorClass },
  billed?: Billed,
): Promise<boolean> {
  const useful = outcome.kind === "read" && outcome.result.useful;
  const set = outcome.kind === "failed"
    ? { status: "failed", errorClass: outcome.errorClass }
    : useful
      ? { status: "ok", chips: stored(outcome.result) }
      : { status: "failed", errorClass: "nothing_valid" as const, chips: stored(outcome.result) };
  return db.transaction(async (tx) => {
    const rows = await tx.update(intakeReads)
      .set(set)
      .where(and(eq(intakeReads.id, readId), eq(intakeReads.status, "pending")))
      .returning({ callId: intakeReads.modelCallId });
    if (rows.length === 0) {
      if (billed) await recordModelUsage(tx, callId, billed);
      return false;
    }
    await settleModelCall(tx, rows[0].callId, useful ? "spent" : "refunded", billed);
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
    const rows = await tx.update(intakeReads)
      .set({ status: "cancelled" })
      .where(and(eq(intakeReads.id, readId), eq(intakeReads.userId, userId), eq(intakeReads.status, "pending")))
      .returning({ callId: intakeReads.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded", undefined);
    return rows.length > 0;
  });
}
