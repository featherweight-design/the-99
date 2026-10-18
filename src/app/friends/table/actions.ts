"use server";

// Rule 0's writes from the table page (plan `2026-10-16-rule-zero.md` PR 4, PR 7): what the viewer has drawn, and the
// viewer's own seat's deck. The reader comes from the session and `RULE_ZERO_ENABLED` is decided for THAT reader; the
// library checks the seat grant itself. Nothing is revalidated: the table page redraws from the swap's own answer and
// its polls, and the pod row and Home's card are read per request.

import { requireUserId } from "../../../lib/auth";
import { ruleZeroEnabled } from "../../../lib/social/flag";
import { markSeen, setSeatDeck } from "../../../lib/social/rule-zero";
import { loadTable, type TableView } from "../../../lib/social/rule-zero-table";
import { requestSwitchEnv } from "../../../lib/switches/request";

/** `revision` is the drawn snapshot's `revision` as an ISO string, never the time of the call. */
export async function markTableSeen(tableId: unknown, revision: unknown): Promise<boolean> {
  const userId = await requireUserId();
  if (!ruleZeroEnabled(await requestSwitchEnv(userId))) return false;
  if (typeof revision !== "string") return false;
  return markSeen(userId, tableId, new Date(revision));
}

export type SwapOutcome = { ok: true; view: TableView } | { ok: false };

/**
 * Seat one of the viewer's own decks (`Swap in`, `Change deck`, and `Undo`, which is a swap back). On success it
 * answers the table as it now reads, so the swapper's phone redraws first. A refusal (the table closed, the seat
 * lapsed, not their deck) answers `ok: false` and the page says so; the next poll draws a closed table.
 */
export async function swapSeatDeckAction(tableId: unknown, deckId: unknown): Promise<SwapOutcome> {
  const userId = await requireUserId();
  if (!ruleZeroEnabled(await requestSwitchEnv(userId))) return { ok: false };
  const result = await setSeatDeck(userId, tableId, deckId);
  if (result === "refused") return { ok: false };
  const view = await loadTable(userId, tableId);
  return view ? { ok: true, view } : { ok: false };
}
