import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { deckCutItems, deckSuggestionRuns } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, reserveModelCall, settleModelCall } from "../model/allowance";
import { PROFILE_VERSION } from "../profile/version";
import type { CutsReport, ValidatedCut } from "./cuts-validate";
import { CUTS_PROMPT_VERSION } from "./cuts-prompt";
import { PROPOSED_CUTS_TOOL, TUNING_MODEL } from "./limits";
import {
  AllLockedError,
  assertSomeCardOpen,
  finishRun,
  recordLate,
  RunSupersededError,
  type Billed,
  type RunHandle,
} from "./run-store";
import type { ValidationReport } from "./validate";

/**
 * Proposed cuts' run writes, the same three as `run-store.ts` (start, finish, persist) for the same reasons (read its header:
 * every write is guarded on `status = 'pending'`, the unit settles in the outcome's own
 * transaction, a failure refunds it). SERVER-ONLY: it imports the database.
 *
 * Only what differs from Suggested changes is written here. `finishRun` matches a run
 * by its id and touches no items, so it is the same function, re-exported under this tool's name.
 * `startRun` and `persistRun` differ in the feature reserved, the tool and
 * prompt version recorded, and the table the items land in.
 *
 * `validation_report` is typed for Suggested changes' report. A cuts report is a different shape in
 * the same jsonb column, read back only by this tool's readers (which scope on `tool`), so it is
 * cast on the way in rather than widening the column's type for every other reader.
 */
const asStoredReport = (r: CutsReport): ValidationReport => r as unknown as ValidationReport;

export type StartedCutsRun =
  | ({ kind: "started" } & RunHandle)
  | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "allLocked" };

/**
 * ONE transaction: re-check that a card is still open to cut, reserve one `proposed_cuts` unit,
 * insert the pending row. Committed before any network call. The per-deck-and-tool partial unique
 * index makes a second concurrent cuts run on one deck impossible, and a Suggested changes run
 * pending on the same deck does not block it.
 */
export async function startCutsRun(
  userId: string,
  deckId: string,
  fingerprint: string,
  readVersion: number | null,
  opts: { runId?: string; now?: Date; env: NodeJS.ProcessEnv },
): Promise<StartedCutsRun> {
  const now = opts.now ?? new Date();
  try {
    const handle = await db.transaction(async (tx): Promise<RunHandle> => {
      await assertSomeCardOpen(tx, deckId, opts.env);
      const unit = await reserveModelCall(tx, userId, "proposed_cuts", TUNING_MODEL, now);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      const [row] = await tx.insert(deckSuggestionRuns).values({
        ...(opts.runId ? { id: opts.runId } : {}),
        deckId, userId, tool: PROPOSED_CUTS_TOOL, inputFingerprint: fingerprint, modelCallId: unit.id,
        model: TUNING_MODEL, promptVersion: CUTS_PROMPT_VERSION, profileVersion: PROFILE_VERSION,
        readVersion,
        status: "pending",
      }).returning({ id: deckSuggestionRuns.id });
      return { runId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    if (err instanceof AllLockedError) return { kind: "allLocked" };
    if (isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

/** A failed run: the outcome, no items, its unit back. False when the run was superseded. */
export async function finishCutsRun(
  handle: RunHandle,
  set: { status: "failed"; errorClass: Parameters<typeof finishRun>[1]["errorClass"]; droppedCount?: number; report?: CutsReport },
  billed?: Billed | readonly Billed[],
): Promise<boolean> {
  const { report, ...rest } = set;
  return finishRun(handle, { ...rest, ...(report ? { validationReport: asStoredReport(report) } : {}) }, billed);
}

/**
 * A successful run: the items and the outcome in one transaction, and the unit spent. False when
 * the run was superseded, in which case no item is written. The status update comes FIRST, so a
 * failed guard rolls everything back and "items persisted, status did not" cannot happen.
 */
export async function persistCutsRun(
  { runId, callId }: RunHandle,
  kept: ValidatedCut[],
  report: CutsReport,
  billed?: Billed | readonly Billed[],
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(deckSuggestionRuns)
        .set({ status: "ok", droppedCount: report.drops.length, validationReport: asStoredReport(report) })
        .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
        .returning({ callId: deckSuggestionRuns.modelCallId });
      if (written.length === 0) throw new RunSupersededError();
      if (kept.length > 0) {
        await tx.insert(deckCutItems).values(kept.map((c) => ({
          runId,
          cutOracleId: c.oracleId,
          reason: c.reason,
          evidence: c.cites,
          position: c.position,
        })));
      }
      await settleModelCall(tx, written[0].callId, "spent", billed);
    });
  } catch (err) {
    if (err instanceof RunSupersededError) {
      await db.transaction((tx) => recordLate(tx, callId, billed));
      return false;
    }
    throw err;
  }
  return true;
}
