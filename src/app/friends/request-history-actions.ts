"use server";

import { requireUserId } from "../../lib/auth";
import { loadRequestHistory, type HistoryCursor, type HistoryDirection, type HistoryPage } from "../../lib/social/request-history";

/**
 * "Show older requests" (#2984): the next page of the reader's own history after `cursor`. A read, so nothing revalidates.
 * The direction is checked here (a client string), and a malformed cursor reads as the first page in the reader.
 */
export async function loadMoreHistoryAction(direction: unknown, cursor: unknown): Promise<HistoryPage> {
  const userId = await requireUserId();
  const dir: HistoryDirection = direction === "received" ? "received" : "asked";
  const c = cursor && typeof cursor === "object" ? (cursor as Partial<HistoryCursor>) : null;
  const clean = c && typeof c.createdAt === "string" && typeof c.id === "string" ? { createdAt: c.createdAt, id: c.id } : null;
  return loadRequestHistory(userId, dir, clean);
}
