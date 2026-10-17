"use server";

// Rule 0's one write from the table page that is not a seat change (plan `2026-10-16-rule-zero.md` PR 4): the viewer
// has drawn the table through a snapshot. The reader comes from the session and `RULE_ZERO_ENABLED` is decided for
// THAT reader; `markSeen` checks the seat grant itself. Nothing is revalidated: no page draws `seen_at` but the table
// page, and it reads it on its next poll.

import { requireUserId } from "../../../lib/auth";
import { ruleZeroEnabled } from "../../../lib/social/flag";
import { markSeen } from "../../../lib/social/rule-zero";
import { requestSwitchEnv } from "../../../lib/switches/request";

/** `revision` is the drawn snapshot's `revision` as an ISO string, never the time of the call. */
export async function markTableSeen(tableId: unknown, revision: unknown): Promise<boolean> {
  const userId = await requireUserId();
  if (!ruleZeroEnabled(await requestSwitchEnv(userId))) return false;
  if (typeof revision !== "string") return false;
  return markSeen(userId, tableId, new Date(revision));
}
