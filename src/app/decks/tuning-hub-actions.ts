"use server";

import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { hubTools, tuningHubEnabled } from "../../lib/tuning/flag";
import { readHubTiles } from "../../lib/tuning/hub-read";
import type { HubTiles } from "../../lib/tuning/hub-tiles";
import { parseHistoryId, pastRunTool, type HistoryPage, type HistoryTool, type PastRun } from "../../lib/tuning/history";
import { readHistory, readPastRun } from "../../lib/tuning/history-read";
import { reapReaderRuns } from "../../lib/tuning/reap-runs";
import { isUuid } from "../../lib/uuid";

/**
 * The Tuning hub landing's one read (the tile status lines). A PUBLIC ENDPOINT: null when the
 * switch is off or the id is not a uuid, and the read itself names the reader, so another
 * player's deck id returns no runs rather than theirs.
 */
export async function readTuningHub(deckId: string): Promise<HubTiles | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!tuningHubEnabled(env) || !isUuid(deckId)) return null;
  // Abandoned runs are failed and refunded first, so a tile never says a credit came back early.
  // One instant for both, so a run cannot cross the cutoff between the reap and the read.
  const now = new Date();
  await reapReaderRuns(deckId, userId, now);
  return readHubTiles(deckId, userId, hubTools(), now);
}

const HISTORY_TOOLS: ReadonlySet<string> = new Set<HistoryTool>(["suggested", "mana", "cuts"]);

/**
 * One page of the deck's History, newest first. A PUBLIC ENDPOINT like the landing's read: null
 * when the hub is off or an argument is not one this panel sends, and filtered by the reader, so
 * another player's deck reads empty. A cursor the reader forged reads from the top.
 */
export async function readTuningHistory(deckId: string, tool?: HistoryTool | null, cursor?: string | null): Promise<HistoryPage | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!tuningHubEnabled(env) || !isUuid(deckId)) return null;
  if (tool != null && !HISTORY_TOOLS.has(tool)) return null;
  // As the landing's read: a row saying `credit back` describes a credit already returned.
  const now = new Date();
  await reapReaderRuns(deckId, userId, now);
  return readHistory(deckId, userId, { tool: tool ?? undefined, cursor: typeof cursor === "string" ? cursor : null, drawn: hubTools() }, now);
}

/** One past run, read-only. Null on refusal, or when the id names nothing this reader holds here. */
export async function readTuningPastRun(deckId: string, id: string): Promise<PastRun | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!tuningHubEnabled(env) || !isUuid(deckId) || typeof id !== "string") return null;
  const ref = parseHistoryId(id);
  if (!ref || !isUuid(ref.uuid)) return null;
  const now = new Date();
  await reapReaderRuns(deckId, userId, now);
  const run = await readPastRun(deckId, userId, ref, now);
  // Only the tools this deployment draws, as History's list: a tool whose switch is off is not
  // reachable through an old id either.
  const drawn: readonly HistoryTool[] = hubTools();
  return run && drawn.includes(pastRunTool(run)) ? run : null;
}
