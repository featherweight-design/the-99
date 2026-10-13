import { and, eq, lt } from "drizzle-orm";

import { db } from "../../db";
import { deckSynopses } from "../../db/schema";
import { settleModelCall } from "../model/allowance";
import { SYNOPSIS_REAPER_CUTOFF_MS } from "./limits";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A pending run created before this was abandoned: the process that owned it is gone. */
export function reapCutoff(now: Date): Date {
  return new Date(now.getTime() - SYNOPSIS_REAPER_CUTOFF_MS);
}

/**
 * The read-time reaper (plan, decision 5). Fails every abandoned pending run on the deck as
 * `interrupted` and refunds its unit, in the caller's transaction, so a crashed write never locks
 * the deck out behind the one-pending index. Called before every insert and on every read.
 *
 * The abandoned process, if it somehow returns, finds its run no longer pending: its own outcome
 * write is guarded on `status = 'pending'`, matches nothing, and is discarded.
 */
export async function reapSynopses(tx: Tx, deckId: string, now: Date = new Date()): Promise<number> {
  const reaped = await tx
    .update(deckSynopses)
    .set({ status: "done", outcome: "interrupted" })
    .where(and(
      eq(deckSynopses.deckId, deckId),
      eq(deckSynopses.status, "pending"),
      lt(deckSynopses.createdAt, reapCutoff(now)),
    ))
    .returning({ callId: deckSynopses.modelCallId });
  for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now, "reaped");
  return reaped.length;
}
