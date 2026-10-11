import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckCutItems, deckSuggestionItems, deckSuggestionRuns } from "../../db/schema";
import type { HistoryTool } from "./history";
import { readHistoryCountIn } from "./history-read";
import { hubSeen, shapeHubTiles, type HubRunCounts, type HubRunRow, type HubTiles } from "./hub-tiles";

/** Per tool: at most one run is pending at a time (`deck_suggestion_runs_one_pending_tool_idx`), so
 *  its two newest runs always hold the run in flight, if any, and the newest finished one. Read per
 *  tool, so a tool used often never pushes the other's runs out of the read. */
const RUNS_PER_TOOL = 2;

export async function readHubTiles(
  deckId: string, userId: string, drawn: readonly HistoryTool[], now: Date = new Date(),
): Promise<HubTiles> {
  const { rows, counts, history, lastOk } = await db.transaction(async (tx) => {
    const newest = (tool: HubRunRow["tool"]) => tx.select({
      id: deckSuggestionRuns.id,
      tool: deckSuggestionRuns.tool,
      status: deckSuggestionRuns.status,
      createdAt: deckSuggestionRuns.createdAt,
    }).from(deckSuggestionRuns)
      .where(and(eq(deckSuggestionRuns.deckId, deckId), eq(deckSuggestionRuns.userId, userId), eq(deckSuggestionRuns.tool, tool)))
      .orderBy(desc(deckSuggestionRuns.createdAt))
      .limit(RUNS_PER_TOOL);
    // One after the other: a transaction is one connection.
    const rows = [...await newest("suggested_changes"), ...await newest("proposed_cuts")] as HubRunRow[];
    const okIds = (tool: HubRunRow["tool"]) => rows.filter((r) => r.tool === tool && r.status === "ok").map((r) => r.id);
    const tally = async (table: typeof deckSuggestionItems | typeof deckCutItems, ids: string[]) =>
      ids.length === 0 ? [] : tx.select({
        runId: table.runId,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`(count(*) filter (where ${table.verdict} = 'accepted'))::int`,
      }).from(table).where(inArray(table.runId, ids)).groupBy(table.runId);
    const suggested = await tally(deckSuggestionItems, okIds("suggested_changes"));
    const cuts = await tally(deckCutItems, okIds("proposed_cuts"));
    const counts = new Map<string, HubRunCounts>(
      [...suggested, ...cuts].map((c) => [c.runId, { total: c.total, accepted: c.accepted }]),
    );
    const history = await readHistoryCountIn(tx, deckId, userId, now, drawn);
    // Each tool's last ok run, whatever came after it: the visit baseline's result identity.
    const okRows = await tx.select({
      tool: deckSuggestionRuns.tool,
      at: sql<Date>`max(${deckSuggestionRuns.createdAt})`.mapWith(deckSuggestionRuns.createdAt),
    }).from(deckSuggestionRuns)
      .where(and(eq(deckSuggestionRuns.deckId, deckId), eq(deckSuggestionRuns.userId, userId), eq(deckSuggestionRuns.status, "ok")))
      .groupBy(deckSuggestionRuns.tool);
    const lastOk = new Map(okRows.map((r) => [r.tool as HubRunRow["tool"], r.at] as const));
    return { rows, counts, history, lastOk };
  }, { isolationLevel: "repeatable read" });
  return { ...shapeHubTiles(rows, counts, now), history, seen: hubSeen(rows, lastOk, now) };
}
