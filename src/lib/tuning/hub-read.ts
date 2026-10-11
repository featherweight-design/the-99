import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckCutItems, deckSuggestionItems, deckSuggestionRuns } from "../../db/schema";
import { shapeHubTiles, type HubRunCounts, type HubRunRow, type HubTiles } from "./hub-tiles";

/** Enough of the newest runs to find each tool's run in flight and its last finished one. */
const RECENT_RUNS = 20;

/**
 * The landing's one read: the reader's newest runs on this deck and the answered counts of the ok
 * ones, in one instant so a run settling between the two statements never shows a status beside
 * counts it did not have. Writes nothing (no reaping), and still opens no read-only transaction:
 * that poisons the pooled connection (`cuts-read.ts`).
 */
export async function readHubTiles(deckId: string, userId: string, now: Date = new Date()): Promise<HubTiles> {
  const { rows, counts } = await db.transaction(async (tx) => {
    const rows = (await tx.select({
      id: deckSuggestionRuns.id,
      tool: deckSuggestionRuns.tool,
      status: deckSuggestionRuns.status,
      createdAt: deckSuggestionRuns.createdAt,
    }).from(deckSuggestionRuns)
      .where(and(eq(deckSuggestionRuns.deckId, deckId), eq(deckSuggestionRuns.userId, userId)))
      .orderBy(desc(deckSuggestionRuns.createdAt))
      .limit(RECENT_RUNS)) as HubRunRow[];
    const okIds = (tool: HubRunRow["tool"]) => rows.filter((r) => r.tool === tool && r.status === "ok").map((r) => r.id);
    const tally = async (table: typeof deckSuggestionItems | typeof deckCutItems, ids: string[]) =>
      ids.length === 0 ? [] : tx.select({
        runId: table.runId,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`(count(*) filter (where ${table.verdict} = 'accepted'))::int`,
      }).from(table).where(inArray(table.runId, ids)).groupBy(table.runId);
    // One after the other: a transaction is one connection.
    const suggested = await tally(deckSuggestionItems, okIds("suggested_changes"));
    const cuts = await tally(deckCutItems, okIds("proposed_cuts"));
    const counts = new Map<string, HubRunCounts>(
      [...suggested, ...cuts].map((c) => [c.runId, { total: c.total, accepted: c.accepted }]),
    );
    return { rows, counts };
  }, { isolationLevel: "repeatable read" });
  return shapeHubTiles(rows, counts, now);
}
