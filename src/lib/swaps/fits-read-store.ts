import { createHash } from "node:crypto";

import { and, desc, eq, lt, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { fitsReads } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import { recordLate, RunSupersededError } from "../tuning/run-store";
import { FITS_READ_PROMPT_VERSION, FITS_READ_REAP_MS, type FitsDropReason, type FitsPick, type FitsReadInputs } from "./fits-read";
import type { FitsReadRow } from "./fits-read-state";

/**
 * Find a deck read's writes and reads. SERVER-ONLY: it imports the database. The shape is the Tuning
 * runs' (`tuning/run-store.ts`): the unit is reserved with the pending row and committed before any
 * network call, every outcome write is guarded on `status = 'pending'`, and the unit settles in the
 * outcome's own transaction.
 */

export type FitsReadHandle = { readId: string; callId: string };

const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const sorted = (xs: readonly string[]) => [...xs].sort();

/**
 * Each candidate deck's input hash (lock 6): everything the prompt carries about the deck and the
 * card, plus the prompt version and the model, so a stored read is current only while the read
 * would be asked the same question. A list edit, a new Overview, a lock, a change in the deck's need
 * or the index's inclusion, the card's own text: each moves it.
 *
 * Two halves, `plan.rest`, so a stale row can say WHY (handoff P3g against P10, gap G5): the plan's
 * half moves for a new Overview, the rest for everything else.
 */
export function candidateHashes(inputs: FitsReadInputs, model: string): Record<string, string> {
  const card = { ...inputs.card, kinds: sorted(inputs.card.kinds) };
  const blocks = new Map(inputs.decks.map((d) => [d.deckId, d]));
  const out: Record<string, string> = {};
  for (const c of inputs.candidates) {
    const d = blocks.get(c.deckId);
    const plan = sha([d?.plan ?? null, sorted(d?.keyCardIds ?? [])]);
    const rest = sha([
      FITS_READ_PROMPT_VERSION, model, card, c.need, c.inclusion,
      d && {
        commanders: d.commanders.map((x) => [x.oracleId, x.oracleText, sorted(x.kinds)]),
        themes: d.themes,
        list: d.list.map((x) => [x.oracleId, sorted(x.kinds)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        lockedIds: sorted(d.lockedIds),
      },
    ]);
    out[c.deckId] = `${plan}.${rest}`;
  }
  return out;
}

export type StartedFitsRead =
  | ({ kind: "started" } & FitsReadHandle)
  | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" };

/**
 * ONE transaction: reserve one `fits_read` unit and insert the pending row. The partial unique index
 * makes a second pending read for the same reader and card impossible (lock 5): the loser of a double
 * press reserves nothing, because its transaction rolls back with the insert.
 */
export async function startFitsRead(
  userId: string, oracleId: string, hashes: Record<string, string>, model: string, now = new Date(),
): Promise<StartedFitsRead> {
  try {
    const handle = await db.transaction(async (tx): Promise<FitsReadHandle> => {
      const unit = await reserveModelCall(tx, userId, "fits_read", model, now);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(fitsReads).values({
        userId, oracleId, status: "pending", modelCallId: unit.id, model,
        promptVersion: FITS_READ_PROMPT_VERSION, candidateHashes: hashes, createdAt: now,
      }).returning({ id: fitsReads.id });
      return { readId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    if (isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

export type FitsReadOutcomeWrite =
  | { status: "done"; outcome: "picks" | "noFit"; picks: FitsPick[]; refunded: boolean; returned: number; drops: Partial<Record<FitsDropReason, number>> }
  | { status: "failed"; errorClass: string; returned?: number; drops?: Partial<Record<FitsDropReason, number>> };

/**
 * The outcome and the unit in one transaction: spent for a read that held up, refunded otherwise.
 * False when the row was no longer pending (reaped), in which case only the usage is recorded.
 */
export async function finishFitsRead(handle: FitsReadHandle, write: FitsReadOutcomeWrite, billed?: Billed, now = new Date()): Promise<boolean> {
  const refunded = write.status === "failed" ? true : write.refunded;
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(fitsReads)
        .set(write.status === "done"
          ? { status: "done", outcome: write.outcome, picks: write.picks, refunded, returned: write.returned, drops: write.drops, finishedAt: now }
          : { status: "failed", errorClass: write.errorClass, refunded, returned: write.returned ?? null, drops: write.drops ?? null, finishedAt: now })
        .where(and(eq(fitsReads.id, handle.readId), eq(fitsReads.status, "pending")))
        .returning({ id: fitsReads.id });
      if (written.length === 0) throw new RunSupersededError();
      await settleModelCall(tx, handle.callId, refunded ? "refunded" : "spent", billed, now);
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

/**
 * Fails and refunds a pending read older than `FITS_READ_REAP_MS` for this reader and card: a run
 * whose process died never settles, and its pending row would otherwise block every later press.
 */
export async function reapFitsReads(userId: string, oracleId: string, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - FITS_READ_REAP_MS);
  return db.transaction(async (tx) => {
    const reaped = await tx.update(fitsReads)
      .set({ status: "failed", errorClass: "interrupted", refunded: true, finishedAt: now })
      .where(and(eq(fitsReads.userId, userId), eq(fitsReads.oracleId, oracleId), eq(fitsReads.status, "pending"), lt(fitsReads.createdAt, cutoff)))
      .returning({ callId: fitsReads.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now);
    return reaped.length;
  });
}

/**
 * The rows the view needs for a reader and card, newest first: the newest pending, the newest done
 * and the newest of all. Three reads rather than a window of the newest N, so no run of failures,
 * however long, can push the stored read out of the panel.
 */
export async function readFitsReadRows(userId: string, oracleId: string): Promise<FitsReadRow[]> {
  const cols = {
    id: fitsReads.id, status: fitsReads.status, outcome: fitsReads.outcome, errorClass: fitsReads.errorClass,
    refunded: fitsReads.refunded, createdAt: fitsReads.createdAt, finishedAt: fitsReads.finishedAt,
    candidateHashes: fitsReads.candidateHashes, picks: fitsReads.picks,
  };
  const mine = and(eq(fitsReads.userId, userId), eq(fitsReads.oracleId, oracleId));
  const newest = (where: SQL | undefined) =>
    db.select(cols).from(fitsReads).where(where).orderBy(desc(fitsReads.createdAt)).limit(1);
  const found = (await Promise.all([
    newest(and(mine, eq(fitsReads.status, "pending"))),
    newest(and(mine, eq(fitsReads.status, "done"))),
    newest(mine),
  ])).flat();
  const byId = new Map(found.map((r) => [r.id, r]));
  return [...byId.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((r) => ({ ...r, status: r.status as FitsReadRow["status"], outcome: (r.outcome ?? null) as FitsReadRow["outcome"] }));
}
