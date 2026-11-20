"use server";

import { requireUserId } from "../../lib/auth";
import { loadRequestHistory, validCursor, type HistoryCursor, type HistoryDirection, type HistoryPage } from "../../lib/social/request-history";

/**
 * "Show older requests" (#2984): the next page of the reader's own history after `cursor`. A read, so nothing revalidates.
 * The direction and the cursor are checked here (client values): a malformed cursor is refused with an empty page, never read as the first page.
 */
export async function loadMoreHistoryAction(direction: unknown, cursor: unknown): Promise<HistoryPage> {
  const userId = await requireUserId();
  const dir: HistoryDirection = direction === "received" ? "received" : "asked";
  const c = cursor && typeof cursor === "object" ? (cursor as Partial<HistoryCursor>) : null;
  const clean = c && typeof c.createdAt === "string" && typeof c.id === "string" ? { createdAt: c.createdAt, id: c.id } : null;
  if (clean === null || !validCursor(clean)) return { entries: [], next: null };
  return loadRequestHistory(userId, dir, clean);
}
