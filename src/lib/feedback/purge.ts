/**
 * Signed-out problem reports expire (Report PR B). A visitor who is not signed in can file a problem report; such a
 * row has `feedback.user_id` NULL and nobody to delete it with (the account purge works by `user_id`, so it never
 * reaches these). This sweep is the only thing that deletes them: 90 days after they were filed.
 *
 * The one invariant: a row WITH a `user_id` is never deleted here, whatever its age. Signed-in feedback belongs to an
 * account and goes only when the account does (`purgeAccount`). SERVER-ONLY (reads the database). Hung on the hourly
 * `invite-sweep` cron, which no-ops on the staging Vercel project (`cronPausedHere`), so staging reports are not expired
 * there.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";

import { ANON_REPORT_RETENTION_DAYS } from "./retention";

export { ANON_REPORT_RETENTION_DAYS };
/** The most rows one run deletes, so a backlog drains over a few hourly runs and no run is long. */
export const ANON_REPORT_PURGE_BATCH = 1000;

/** Deletes up to one batch of signed-out `feedback` rows older than the retention; touches nothing else. Idempotent. */
export async function purgeAnonymousReports(deps: { now?: Date } = {}): Promise<{ deleted: number }> {
  const now = deps.now ?? new Date();
  const cutoff = new Date(now.getTime() - ANON_REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // Uses feedback_created_idx. The key is `id`, so the batch is bounded by a subselect, never an unbounded delete.
  const { rows } = await db.execute<{ n: number }>(sql`with gone as (
    delete from feedback where id in (
      select id from feedback where user_id is null and created_at < ${cutoff}::timestamp limit ${ANON_REPORT_PURGE_BATCH}
    ) and user_id is null returning 1
  ) select count(*)::int as n from gone`);
  return { deleted: rows[0]?.n ?? 0 };
}
