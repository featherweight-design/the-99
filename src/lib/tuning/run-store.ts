import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckSuggestionItems, deckSuggestionRuns, decks } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, recordModelUsage, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import type { ModelErrorClass } from "../model/client";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { PROFILE_VERSION } from "../profile/version";
import { intentTooLong, SUGGESTED_CHANGES_TOOL, TUNING_MODEL } from "./limits";
import { PROMPT_VERSION } from "./prompt-version";
import type { ValidatedSuggestion, ValidationReport } from "./validate";

/**
 * The two writes that settle a tuning run. SERVER-ONLY: it imports the database.
 *
 * Exported from here rather than from `tuning-actions.ts` so `probe:tuning-run` can call the
 * real functions: from a `"use server"` module they would become public actions taking an
 * arbitrary run id.
 *
 * BOTH ARE GUARDED ON `status = 'pending'`. The reaper settles a run too (and a Stop did, before it
 * was removed on 2026-10-12), and whichever writer arrives second must change nothing — not the status, not the items, not the unit. The
 * unit is settled in the same transaction as the outcome, so the two can never disagree: a
 * failure refunds it, and only an answer the player will see spends it.
 *
 * Neither revalidates. The caller does, and only when this returned `true`: a superseded run's
 * player has already been shown the state whoever superseded it wrote.
 */

/** The six values `deck_suggestion_runs_error_class_check` allows. `locked_only` (Locked, F10): a run
 *  whose every suggestion cut a locked card. Refunded like every failure. */
export type ErrorClass = Exclude<ModelErrorClass, "upstream_rejected"> | "ungrounded" | "interrupted" | "locked_only";

export class RunSupersededError extends Error {}
/** Thrown inside `startRun`'s transaction to abandon it, reserving nothing. */
export class AllLockedError extends Error {}

export type { Billed };

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A started run as its caller holds it for the whole request: the run row's id, and the id of the
 * `model_calls` unit the start reserved. The unit id is carried rather than looked up through the
 * run row, because the run row can VANISH mid-call — `deck_suggestion_runs.deck_id` cascades on a
 * deck delete while `model_calls` is kept — and the bill must still land on the ledger.
 */
export type RunHandle = { runId: string; callId: string };

/**
 * A LATE OUTCOME still records its bill. When the reaper or a deck delete got there
 * first, the outcome write matches no pending run and changes nothing about the run or the credit
 * — but the upstream call billed all the same, and until its meters land its unit counts toward
 * the month at its worst case. So the meters go onto the unit anyway, by the id the start handed
 * back (`recordModelUsage` writes them only while none are recorded, so this never counts a call
 * twice).
 */
export async function recordLate(tx: Tx, callId: string, billed: Billed | readonly Billed[] | undefined): Promise<void> {
  if (billed) await recordModelUsage(tx, callId, billed);
}

/**
 * EVERY CARD LOCKED is re-checked in the reservation's own transaction and under the deck row lock
 * `setCardLocked` also takes (Locked, never cut). The gate's read came from a snapshot taken
 * before this: a last card locked in between would otherwise still reserve a credit and call the
 * model for a deck with nothing to cut. Deck row first, then the unit, the order the overview's
 * `startRun` takes. Throws `AllLockedError`; a no-op while `NEVER_CUT_ENABLED` is off. Shared by
 * both tools' starts (`cuts-run-store.ts`).
 */
export async function assertSomeCardOpen(tx: Tx, deckId: string, env: NodeJS.ProcessEnv): Promise<void> {
  if (neverCutEnabled(env)) {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const { rows: [body] } = await tx.execute<{ cards: number; open: number }>(sql`
      select count(*)::int as cards,
             count(*) filter (where not exists (
               select 1 from deck_locks l
               where l.deck_id = dc.deck_id and l.oracle_id = dc.oracle_id and l.removed_at is null
             ))::int as open
      from deck_cards dc where dc.deck_id = ${deckId}`);
    if (body && body.cards > 0 && body.open === 0) throw new AllLockedError();
  }
}

/**
 * ONE transaction: reserve an allowance unit, then insert the pending row. Committed before any
 * network call. The allowance lock makes the last unit single-winner across decks; the partial
 * unique index (per deck AND tool) makes a second concurrent run of this tool on one deck impossible, and because the unit and
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
   * `runId` is the id the panel chose for this press, so it waits on exactly the run it started
   * and never another tab's (the row's default makes one when absent).
   */
  opts: { runId?: string; now?: Date; env: NodeJS.ProcessEnv },
): Promise<({ kind: "started" } & RunHandle) | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "allLocked" }> {
  const now = opts.now ?? new Date();
  try {
    const handle = await db.transaction(async (tx): Promise<RunHandle> => {
      await assertSomeCardOpen(tx, deckId, opts.env);
      const unit = await reserveModelCall(tx, userId, "tuning", TUNING_MODEL, now);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(deckSuggestionRuns).values({
        ...(opts.runId ? { id: opts.runId } : {}),
        deckId, userId, tool: SUGGESTED_CHANGES_TOOL, inputFingerprint: fingerprint, modelCallId: unit.id,
        model: TUNING_MODEL, promptVersion: PROMPT_VERSION, profileVersion: PROFILE_VERSION,
        readVersion,
        status: "pending",
      }).returning({ id: deckSuggestionRuns.id });
      return { runId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    if (err instanceof AllLockedError) return { kind: "allLocked" };
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
  // Round 6: `saveDeckHeader` (the pencil) stamps this too — without it here, the same edit
  // moved Home's resume order and "edited" timestamp only when made through the pencil, never
  // through this empty-state field, for the identical column.
  const updated = await db.update(decks)
    .set({ intent: intent.length > 0 ? intent : null, intentSeeded: false, lastEditedAt: sql`clock_timestamp()` })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  return updated.length > 0 ? "saved" : "refused";
}

/** A failed run: the outcome, no items, and its unit back. False when the run was superseded. */
export async function finishRun(
  { runId, callId }: RunHandle,
  set: { status: "failed"; errorClass: ErrorClass; droppedCount?: number; validationReport?: ValidationReport },
  /** The call's usage, when it got a response: a refund still records what it burned. */
  billed?: Billed | readonly Billed[],
): Promise<boolean> {
  const written = await db.transaction(async (tx) => {
    const rows = await tx.update(deckSuggestionRuns)
      .set(set)
      .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded", billed, new Date(), "failed");
    if (rows.length === 0) await recordLate(tx, callId, billed);
    return rows;
  });
  return written.length > 0;
}

/**
 * A successful run: the items and the outcome in one transaction, and the unit spent, or given back
 * when the caller settles it `refunded` (an answer too thin to charge for, `refundsCredit`: the items are
 * stored and shown all the same). False when the run was superseded, in which case no item is written.
 *
 * The status update comes FIRST inside the transaction. A guard that fails throws before the
 * insert runs and rolls everything back, so "items persisted, status did not" cannot happen.
 */
export async function persistRun(
  { runId, callId }: RunHandle,
  kept: ValidatedSuggestion[],
  droppedCount: number,
  billed?: Billed | readonly Billed[],
  validationReport?: ValidationReport,
  /** `refunded` for an answer too thin to charge for (`refundsCredit`): it is stored, shown and
   *  billed as an ok run, and the credit comes back. */
  settleAs: "spent" | "refunded" = "spent",
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(deckSuggestionRuns)
        .set({ status: "ok", droppedCount, validationReport })
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
      await settleModelCall(tx, written[0].callId, settleAs, billed, new Date(), "nothing_valid");
    });
  } catch (err) {
    if (err instanceof RunSupersededError) {
      // The transaction above rolled back; the bill is recorded in one of its own.
      await db.transaction((tx) => recordLate(tx, callId, billed));
      return false;
    }
    throw err;
  }
  return true;
}

/**
 * Whether the run is still pending: a deck deleted under it or the reaper settles it, and a run
 * so settled must not start another provider call (the retry asks first).
 */
export async function runIsPending(runId: string): Promise<boolean> {
  const rows = await db.select({ id: deckSuggestionRuns.id }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending"))).limit(1);
  return rows.length > 0;
}
