"use server";

import { requireUserId } from "../lib/auth";
import { requestFlags } from "../lib/flags/request";
import { hasAnyDeck } from "../lib/home/summary";
import { isToolId, TOOLS, type Tool, type ToolId } from "../lib/discovery/tools";
import { ASK_MAX_TOOLS } from "../lib/discovery/ask";
import { toolCardOf, type ToolCardModel } from "../lib/discovery/showcase";
import { loadCardInput, switchesOn } from "../lib/discovery/showcase-input";

/**
 * Ask's two reads (tool discovery D). Both are signed in and read only the reader's own rows, and both decide the
 * switches from `requestFlags(userId)`, so a tool whose switch is off for this reader never answers.
 */

/** Read when the search opens: whether the reader has a deck, and the tools that are off for them. */
export async function askStartAction(): Promise<{ hasDecks: boolean; off: ToolId[] }> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  const isOn = switchesOn(env);
  const tools: readonly Tool[] = TOOLS;
  return {
    hasDecks: await hasAnyDeck(userId),
    off: tools.filter((t) => t.switch !== null && !isOn(t.switch)).map((t) => t.id as ToolId),
  };
}

/** The cards for the tools a typed question matched, in the order given, for this reader: copy, cost, where a press lands. */
export async function askToolsAction(ids: unknown): Promise<ToolCardModel[]> {
  const userId = await requireUserId();
  if (!Array.isArray(ids)) return [];
  const asked = [...new Set(ids.filter(isToolId))].slice(0, ASK_MAX_TOOLS);
  if (asked.length === 0) return [];
  const env = await requestFlags(userId);
  const input = await loadCardInput(userId, env, undefined, asked);
  const tools: readonly Tool[] = TOOLS;
  return asked
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is Tool => t !== undefined && (t.switch === null || input.isOn(t.switch)))
    .map((t) => toolCardOf(t, input));
}
