import { and, eq, isNotNull, isNull, lt, or, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { deckSuggestionRuns } from "../../db/schema";
import { settleModelCall } from "../model/allowance";
import { reapCutoff } from "./reaper";
import { settleV2PartialIn, type Tx } from "./run-store";

/** Past the reaper's cutoff for its own kind: five minutes for v10 and Proposed cuts, `V2_REAPER_CUTOFF_MS` for a
 *  Suggested changes v2 run (`requested_count` set), which may still be running past five. */
export const pastReapCutoff = (now: Date) => or(
  and(isNull(deckSuggestionRuns.requestedCount), lt(deckSuggestionRuns.createdAt, reapCutoff(now))),
  and(isNotNull(deckSuggestionRuns.requestedCount), lt(deckSuggestionRuns.createdAt, reapCutoff(now, true))),
);

/** The reader's runs on this deck, of every tool, still pending past the reaper's cutoff. */
export const reapableReaderRuns = (deckId: string, userId: string, now: Date) => and(
  eq(deckSuggestionRuns.deckId, deckId),
  eq(deckSuggestionRuns.userId, userId),
  eq(deckSuggestionRuns.status, "pending"),
  pastReapCutoff(now),
);

/**
 * Settle the abandoned runs in `scope` (which names the pending, past-cutoff runs), refunding their units. A v2 run that
 * already saved lines settles `ok` with them, refunded (plan P4: they stay readable, and the reaped run is history);
 * every other abandoned run fails `interrupted`, as it always has. Inside the caller's transaction.
 */
export async function reapIn(tx: Tx, scope: SQL, now: Date): Promise<void> {
  await settleV2PartialIn(tx, scope, now, "reaped");
  const reaped = await tx.update(deckSuggestionRuns)
    .set({ status: "failed", errorClass: "interrupted" })
    .where(scope)
    .returning({ callId: deckSuggestionRuns.modelCallId });
  for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now, "reaped");
}

/**
 * Fail the reader's abandoned runs on this deck, of every tool, as `interrupted` and refund their
 * units, in one transaction. The hub and History read through this first, so a run they describe
 * as `failed · credit back` has had its credit given back by the time they say so, rather than
 * only once its own tool next opens. Scoped to the reader: these reads can name any deck id.
 */
export async function reapReaderRuns(deckId: string, userId: string, now: Date = new Date()): Promise<void> {
  await db.transaction((tx) => reapIn(tx, reapableReaderRuns(deckId, userId, now)!, now));
}
