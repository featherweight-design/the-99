import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { deckSuggestionItems, deckSuggestionRuns, decks } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, reserveModelCall, settleModelCall } from "../model/allowance";
import type { ModelErrorClass } from "../model/client";
import { PROFILE_VERSION } from "../profile/version";
import { intentTooLong, TUNING_MODEL } from "./limits";
import { PROMPT_VERSION } from "./prompt-version";
import type { ValidatedSuggestion } from "./validate";

/**
 * The two writes that settle a tuning run. SERVER-ONLY: it imports the database.
 *
 * Exported from here rather than from `tuning-actions.ts` so `probe:tuning-run` can call the
 * real functions: from a `"use server"` module they would become public actions taking an
 * arbitrary run id.
 *
 * BOTH ARE GUARDED ON `status = 'pending'`. The reaper and a Stop settle a run too, and whichever
 * writer arrives second must change nothing — not the status, not the items, not the unit. The
 * unit is settled in the same transaction as the outcome, so the two can never disagree: a
 * failure refunds it, and only an answer the player will see spends it.
 *
 * Neither revalidates. The caller does, and only when this returned `true`: a superseded run's
 * player has already been shown the state whoever superseded it wrote.
 */

/** The five values `deck_suggestion_runs_error_class_check` allows. */
export type ErrorClass = ModelErrorClass | "ungrounded" | "interrupted";

class RunSupersededError extends Error {}

/**
 * ONE transaction: reserve an allowance unit, then insert the pending row. Committed before any
 * network call. The allowance lock makes the last unit single-winner across decks; the partial
 * unique index makes a second concurrent run on one deck impossible, and because the unit and
 * the row share the transaction, the loser of that race holds no unit. A run holds both or
 * neither.
 */
export async function startRun(
  userId: string,
  deckId: string,
  fingerprint: string,
  /** The deck version the run's inputs were read at (`TuningInputs.readVersion`). */
  readVersion: number | null,
  /**
   * `runId` is the id the panel chose for this press, so its Stop can cancel exactly the run it
   * started and never another tab's (the row's default makes one when absent).
   */
  opts: { runId?: string; now?: Date } = {},
): Promise<{ kind: "started"; runId: string } | { kind: "allowance" } | { kind: "in_flight" }> {
  const now = opts.now ?? new Date();
  try {
    const runId = await db.transaction(async (tx) => {
      const unit = await reserveModelCall(tx, userId, "tuning", now);
      if (!unit) throw new AllowanceSpentError();
      const [row] = await tx.insert(deckSuggestionRuns).values({
        ...(opts.runId ? { id: opts.runId } : {}),
        deckId, userId, inputFingerprint: fingerprint, modelCallId: unit.id,
        model: TUNING_MODEL, promptVersion: PROMPT_VERSION, profileVersion: PROFILE_VERSION,
        readVersion,
        status: "pending",
      }).returning({ id: deckSuggestionRuns.id });
      return row.id;
    });
    return { kind: "started", runId };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: "allowance" };
    // Only the partial index means "a run is already in flight here". A dropped connection or
    // a missing column must not be reported as that.
    if (isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

/**
 * The deck's one line. Every save clears `intent_seeded`: the app writes `true` when it fills a
 * deck, and the player's first edit makes the line theirs, for good. An over-cap line writes
 * nothing; an empty one clears the intent.
 */
export async function saveIntent(
  deckId: string,
  userId: string,
  raw: string,
): Promise<"saved" | "tooLong" | "refused"> {
  const intent = raw.trim();
  if (intentTooLong(intent)) return "tooLong";
  const updated = await db.update(decks)
    .set({ intent: intent.length > 0 ? intent : null, intentSeeded: false })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  return updated.length > 0 ? "saved" : "refused";
}

/** A failed run: the outcome, no items, and its unit back. False when the run was superseded. */
export async function finishRun(
  runId: string,
  set: { status: "failed"; errorClass: ErrorClass; droppedCount?: number },
): Promise<boolean> {
  const written = await db.transaction(async (tx) => {
    const rows = await tx.update(deckSuggestionRuns)
      .set(set)
      .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded");
    return rows;
  });
  return written.length > 0;
}

/**
 * A successful run: the items and the outcome in one transaction, and the unit spent. False
 * when the run was superseded, in which case no item is written.
 *
 * The status update comes FIRST inside the transaction. A guard that fails throws before the
 * insert runs and rolls everything back, so "items persisted, status did not" cannot happen.
 */
export async function persistRun(
  runId: string,
  kept: ValidatedSuggestion[],
  droppedCount: number,
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(deckSuggestionRuns)
        .set({ status: "ok", droppedCount })
        .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
        .returning({ callId: deckSuggestionRuns.modelCallId });
      if (written.length === 0) throw new RunSupersededError();
      if (kept.length > 0) {
        await tx.insert(deckSuggestionItems).values(kept.map((s) => ({
          runId,
          addOracleId: s.addOracleId,
          cutOracleId: s.cutOracleId,
          rationale: s.rationale,
          rationaleShort: s.rationaleShort,
          evidence: s.evidence,
          position: s.position,
          bracketAfter: s.bracketAfter,
        })));
      }
      await settleModelCall(tx, written[0].callId, "spent");
    });
  } catch (err) {
    if (err instanceof RunSupersededError) return false;
    throw err;
  }
  return true;
}

/**
 * A Stop: the run the panel was watching, and no other. Scoped to its id as well as the deck
 * and the reader, so a Stop pressed after that run settled cannot cancel the next one. A Stop is
 * not an answer, so its unit comes back. False when there was nothing pending to stop.
 */
export async function cancelRun(runId: string, deckId: string, userId: string): Promise<boolean> {
  const rows = await db.transaction(async (tx) => {
    const cancelled = await tx.update(deckSuggestionRuns)
      .set({ status: "cancelled" })
      .where(and(
        eq(deckSuggestionRuns.id, runId),
        eq(deckSuggestionRuns.deckId, deckId),
        eq(deckSuggestionRuns.userId, userId),
        eq(deckSuggestionRuns.status, "pending"),
      ))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of cancelled) await settleModelCall(tx, r.callId, "refunded");
    return cancelled;
  });
  return rows.length > 0;
}
