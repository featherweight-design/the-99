import { and, eq, lt } from "drizzle-orm";

import { db } from "../../db";
import { deckSuggestionRuns } from "../../db/schema";
import { settleModelCall } from "../model/allowance";
import { reapCutoff } from "./reaper";

/** The reader's runs on this deck, of every tool, still pending past the reaper's cutoff. */
export const reapableReaderRuns = (deckId: string, userId: string, now: Date) => and(
  eq(deckSuggestionRuns.deckId, deckId),
  eq(deckSuggestionRuns.userId, userId),
  eq(deckSuggestionRuns.status, "pending"),
  lt(deckSuggestionRuns.createdAt, reapCutoff(now)),
);

/**
 * Fail the reader's abandoned runs on this deck, of every tool, as `interrupted` and refund their
 * units, in one transaction. The hub and History read through this first, so a run they describe
 * as `failed · credit back` has had its credit given back by the time they say so, rather than
 * only once its own tool next opens. Scoped to the reader: these reads can name any deck id.
 */
export async function reapReaderRuns(deckId: string, userId: string, now: Date = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const reaped = await tx.update(deckSuggestionRuns)
      .set({ status: "failed", errorClass: "interrupted" })
      .where(reapableReaderRuns(deckId, userId, now))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now);
  });
}
