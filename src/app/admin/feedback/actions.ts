"use server";

import { requireAdmin } from "../../../lib/admin/access";
import { markFeedbackRead, readFeedback } from "../../../lib/admin/feedback";
import type { FeedbackRow } from "../../../lib/admin/feedback-rule";
import { feedbackEnabled } from "../../../lib/feedback/flag";
import { requestFlags } from "../../../lib/flags/request";

// The Feedback tab's actions (flyer trial, admin Feedback PR B). Every export calls `requireAdmin()` on its first line
// (`actions.test.ts` reads every action module under src/app/admin). Arguments are untrusted: the library parses the
// id, the filter and the offset. Nothing here logs an answer.

/** Opens a row: sets `read_at` once. `{ ok: false }` leaves the row as it was (a bad id, or the write failed). */
export async function markRead(id: unknown): Promise<{ ok: boolean }> {
  const { userId } = await requireAdmin();
  try {
    if (!feedbackEnabled(await requestFlags(userId))) return { ok: false };
    const res = await markFeedbackRead(id);
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** The next page of rows for a filter, `offset` rows in. Off, or any failure, reads as `{ ok: false }`. */
export async function loadMore(filter: unknown, offset: unknown): Promise<{ ok: true; rows: FeedbackRow[]; hasMore: boolean } | { ok: false }> {
  const { userId } = await requireAdmin();
  try {
    if (!feedbackEnabled(await requestFlags(userId))) return { ok: false };
    const read = await readFeedback({ filter, offset: typeof offset === "number" ? offset : 0 });
    return { ok: true, rows: read.rows, hasMore: read.hasMore };
  } catch {
    return { ok: false };
  }
}
