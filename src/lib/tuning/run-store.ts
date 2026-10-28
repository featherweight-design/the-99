import { and, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { deckSuggestionItems, deckSuggestionRuns, decks } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, recordModelUsage, reserveModelCall, settleModelCall, type Billed } from "../model/allowance";
import type { RefundReason } from "../model/allowance-rule";
import type { ModelErrorClass } from "../model/client";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { PROFILE_VERSION } from "../profile/version";
import { intentTooLong, SUGGESTED_CHANGES_TOOL, TUNING_MODEL } from "./limits";
import { PROMPT_VERSION, PROMPT_VERSION_V2 } from "./prompt-version";
import type { V2Side } from "./v2/engine";
import type { BracketAim } from "./v2/bracket-aim";
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
  opts: {
    runId?: string; now?: Date; env: NodeJS.ProcessEnv;
    /** A Suggested changes v2 run (plan 2026-10-27, P1): reserved under its own feature, stamped with its own prompt
     *  version, and stored with the player's count, request and bracket choice and the report it starts with. */
    v2?: { requestedCount: number; requestText: string | null; bracket: BracketAim | null; report: ValidationReport };
  },
): Promise<({ kind: "started" } & RunHandle) | { kind: "allowance" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "allLocked" }> {
  const now = opts.now ?? new Date();
  try {
    const handle = await db.transaction(async (tx): Promise<RunHandle> => {
      await assertSomeCardOpen(tx, deckId, opts.env);
      const unit = await reserveModelCall(tx, userId, opts.v2 ? "suggested_changes_v2" : "tuning", TUNING_MODEL, now);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(deckSuggestionRuns).values({
        ...(opts.runId ? { id: opts.runId } : {}),
        deckId, userId, tool: SUGGESTED_CHANGES_TOOL, inputFingerprint: fingerprint, modelCallId: unit.id,
        model: TUNING_MODEL, promptVersion: PROMPT_VERSION, profileVersion: PROFILE_VERSION,
        readVersion,
        status: "pending",
        ...(opts.v2 ? {
          promptVersion: PROMPT_VERSION_V2,
          requestedCount: opts.v2.requestedCount,
          requestText: opts.v2.requestText,
          bracketChoice: opts.v2.bracket?.choice ?? null,
          bracketTarget: opts.v2.bracket?.target ?? null,
          validationReport: opts.v2.report,
        } : {}),
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
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded", billed, new Date(), null);
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
      await settleModelCall(tx, written[0].callId, settleAs, billed, new Date(), null);
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

/**
 * One kept line of a v2 run, saved the moment it is kept (handoff H1), while the run is still `pending`: the panel's poll
 * draws it before the run ends (plan P3). `position` is the line's place in ITS list (`runV2`). False when nothing was
 * written.
 *
 * SERIALIZED ON THE RUN ROW (PR #2316 review): the insert takes the run's row lock (`lockPendingV2RunsSql`) and writes
 * only while the run is still pending, in one transaction, and every settle of a v2 run takes the same lock before it
 * reads the saved lines. An `exists` check alone did not do that: under read committed a settle could count the lines
 * while an insert that had already seen `pending` was still uncommitted, and the line landed on a settled run.
 */
export async function insertV2Line(runId: string, line: ValidatedSuggestion): Promise<boolean> {
  return db.transaction(async (tx) => {
    const locked = await tx.execute(lockPendingV2RunsSql(eq(deckSuggestionRuns.id, runId)));
    if (locked.rows.length === 0) return false;
    const { rows } = await tx.execute(insertV2LineSql(runId, line));
    return rows.length > 0;
  });
}

/**
 * The pending runs in `scope`, locked `for update` until the transaction ends: the one lock a line insert and every v2
 * settle take, so they serialize on the run row. A statement run after it sees every line an insert committed before
 * the lock was granted, and an insert that waited on it re-checks `pending` and finds the run settled. Exported so its
 * emitted SQL is pinned.
 */
export function lockPendingV2RunsSql(scope: SQL): SQL {
  return sql`select ${deckSuggestionRuns}.id from ${deckSuggestionRuns}
    where ${scope} and ${deckSuggestionRuns}.status = 'pending'
    for update`;
}

/** Exported so its emitted SQL is pinned. */
export function insertV2LineSql(runId: string, line: ValidatedSuggestion): SQL {
  const after = line.bracketAfter === null ? sql`null` : sql`${sql.param(line.bracketAfter)}::int[]`;
  return sql`
    insert into ${deckSuggestionItems}
      (run_id, add_oracle_id, cut_oracle_id, rationale, rationale_short, evidence, position, bracket_after)
    select ${runId}, ${line.addOracleId}, ${line.cutOracleId}, ${line.rationale}, ${line.rationaleShort},
           ${JSON.stringify(line.evidence)}::jsonb, ${line.position}, ${after}
    where exists (select 1 from ${deckSuggestionRuns} r where r.id = ${runId} and r.status = 'pending')
    returning id`;
}

/** A v2 run's progress flag (`in` or `refilling`, per list), written into its pending report for the wait to draw. */
export async function markV2Progress(runId: string, key: "in" | "refilling", side: V2Side, value: boolean): Promise<void> {
  const path = `{v2,${key},${side}}`;
  await db.update(deckSuggestionRuns)
    .set({ validationReport: sql`jsonb_set(${deckSuggestionRuns.validationReport}, ${path}::text[], ${value ? "true" : "false"}::jsonb, true)` })
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")));
}

/**
 * A v2 run's end: the report and the outcome, the unit settled as `charge.ts` decided. The lines are already saved
 * (`insertV2Line`). `ok` for a run with additions, including a failed cut call (plan P4: its additions stay readable,
 * and the run is refunded); `failed`/`ungrounded` for a run that kept no addition, refunded (spec §9). Guarded on
 * `pending` like every outcome write; false when superseded, with the bill recorded late.
 */
export async function persistV2(
  { runId, callId }: RunHandle,
  outcome: { status: "ok" } | { status: "failed"; errorClass: "ungrounded" },
  validationReport: ValidationReport,
  settleAs: "spent" | "refunded",
  billed: readonly Billed[],
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // The run row's lock first (`insertV2Line`): no line can land between this settle and its commit.
    await tx.execute(lockPendingV2RunsSql(eq(deckSuggestionRuns.id, runId)));
    const rows = await tx.update(deckSuggestionRuns)
      .set({ ...outcome, droppedCount: validationReport.drops?.length ?? 0, validationReport })
      .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    const bill = billed.length > 0 ? billed : undefined;
    if (rows.length === 0) {
      await recordLate(tx, callId, bill);
      return false;
    }
    await settleModelCall(tx, rows[0].callId, outcome.status === "ok" ? settleAs : "refunded", bill, new Date(), null);
    return true;
  });
}

/**
 * The pending v2 runs in `scope` that already saved lines, settled as plan P4 settles a failed cut call: `ok`, so every
 * reader still draws the lines, marked `interrupted` and refunded. For the reaper (a run whose process is gone) and for
 * a run whose own write failed mid-stream. The caller fails the rest of `scope` as it always has.
 */
export async function settleV2PartialIn(
  tx: Tx, scope: SQL, now: Date, reason: RefundReason | null, billed?: readonly Billed[],
): Promise<string[]> {
  // The run rows' locks first, in their own statement (`insertV2Line`): the update below then reads the saved lines with
  // a snapshot taken after every insert that held a lock committed, and no new one can start.
  await tx.execute(lockPendingV2RunsSql(and(scope, isNotNull(deckSuggestionRuns.requestedCount))!));
  const settled = await tx.update(deckSuggestionRuns)
    .set({ status: "ok", validationReport: v2InterruptedReport() })
    .where(and(scope, eq(deckSuggestionRuns.status, "pending"), isNotNull(deckSuggestionRuns.requestedCount), v2HasItems()))
    .returning({ id: deckSuggestionRuns.id, callId: deckSuggestionRuns.modelCallId });
  for (const r of settled) await settleModelCall(tx, r.callId, "refunded", billed && billed.length > 0 ? billed : undefined, now, reason);
  return settled.map((r) => r.id);
}

/** The run has a saved line. Its own alias, qualified on both sides (AGENTS.md's Drizzle rule). */
export function v2HasItems(): SQL {
  return sql`exists (select 1 from ${deckSuggestionItems} si where si.run_id = ${deckSuggestionRuns}.id)`;
}

/** The pending report, closed as interrupted: refunded, its kept count the lines it saved. */
export function v2InterruptedReport(): SQL {
  return sql`coalesce(${deckSuggestionRuns.validationReport}, '{}'::jsonb) || jsonb_build_object(
    'keptCount', (select count(*) from ${deckSuggestionItems} si where si.run_id = ${deckSuggestionRuns}.id)::int,
    'refunded', true,
    'v2', coalesce(${deckSuggestionRuns.validationReport} -> 'v2', '{}'::jsonb)
      || jsonb_build_object('interrupted', true, 'in', jsonb_build_object('add', true, 'cut', true)))`;
}

/**
 * A v2 run whose work threw after lines may have been saved (a failed line save rejects `runV2`): with lines, `ok` and
 * refunded (P4); with none, `failed` and refunded, as v10's throw is. False when the run was already settled.
 */
export async function failV2Run({ runId, callId }: RunHandle, billed: readonly Billed[]): Promise<boolean> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const mine = eq(deckSuggestionRuns.id, runId);
    const kept = await settleV2PartialIn(tx, mine, now, null, billed);
    if (kept.length > 0) return true;
    const failed = await tx.update(deckSuggestionRuns)
      .set({ status: "failed", errorClass: "upstream_busy" })
      .where(and(mine, eq(deckSuggestionRuns.status, "pending")))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of failed) await settleModelCall(tx, r.callId, "refunded", billed.length > 0 ? billed : undefined, now, null);
    if (failed.length === 0) await recordLate(tx, callId, billed.length > 0 ? billed : undefined);
    return failed.length > 0;
  });
}
