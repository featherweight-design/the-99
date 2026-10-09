import { sql } from "drizzle-orm";
import { db } from "../../db";

/**
 * How many changes the player made by hand since their last confirmed upload: the figure the
 * Replace warning quotes ("in-app edits will be overwritten", brief §A). Adds, edits and reverts
 * all count; an upload does not.
 *
 * Anchored on the newest confirmed upload. When that upload wrote a ledger entry, "since" is by
 * the ledger's own order (`seq`), which no clock can disorder. When it did not (confirmed with the
 * switch off, or before the ledger existed), it is by that upload's `confirmed_at`. A player who
 * never uploaded counts every change they made.
 */
export async function editsSinceUpload(userId: string): Promise<number> {
  const rows = await db.execute<{ n: number }>(sql`
    with last_upload as (
      select u.id, u.confirmed_at from csv_uploads u
      where u.user_id = ${userId} and u.confirmed_at is not null
      order by u.confirmed_at desc
      limit 1
    ),
    anchor as (
      select
        (select lu.confirmed_at from last_upload lu) as at,
        (select h.seq from collection_history h, last_upload lu
          where h.user_id = ${userId} and h.source = 'csv_uploads:' || lu.id) as seq
    )
    select count(*)::int as n
    from collection_history e, anchor a
    where e.user_id = ${userId}
      and e.kind in ('add', 'edit', 'revert')
      and case
        when a.seq is not null then e.seq > a.seq
        when a.at is not null then e.created_at > a.at
        else true
      end
  `);
  return rows.rows[0]?.n ?? 0;
}
