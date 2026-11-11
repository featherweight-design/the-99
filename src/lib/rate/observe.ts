import { after } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { captureServerError } from "../sentry/capture";
import { overLimit, RATE_RULES, reachesHalf, retainMs, retryAfterSec, windowStart, type RateBucket } from "./rules";

/**
 * Counts one hit by `userId` in `bucket` and returns the window's count so far. ONE statement: it
 * upserts this window's row, and in the same statement deletes this player's rows for the bucket
 * from earlier windows, so the table needs no sweeper (its rows are one per player, bucket and
 * minute, and only the current one survives the next hit). The delete is a CTE, so it runs whether
 * or not the upsert conflicts.
 *
 * It ALSO deletes every row, anyone's, older than its bucket's `retainMs` (`RETAIN_MS`, or the bucket's whole window when longer, so a daily cap is not reset by the sweep; an indexed range delete). That is a retention sweep,
 * not a guarantee: it runs when the counter is next hit, by anyone. Every account-keyed write is made inside the
 * request (`enforceHit`, `checkout.ts`), but a request already past its auth check when the purge runs still writes
 * after it, and the row (an account id, a bucket, a minute and a count) would then stay until the next hit and no
 * longer. Closing it outright needs a purge lock and a deletion marker for a request counter, which is out of proportion to
 * the exposure (a session invalidated by the deletion itself has to have a request already past its auth check).
 *
 * `sweepAged: false` leaves the retention sweep out, for a caller that runs it after the response (`sweepAfterResponse`).
 */
export async function recordHit(userId: string, bucket: RateBucket, now: Date = new Date(), sweepAged = true): Promise<number> {
  const rule = RATE_RULES[bucket];
  const start = windowStart(now, rule.windowMs);
  const res = await db.execute(sql`
    with swept as (
      delete from rate_hits
      where (user_id = ${userId} and bucket = ${bucket} and window_start < ${start.toISOString()}::timestamp)
         ${sweepAged ? sql`or ${agedRows(start)}` : sql``}
    )
    insert into rate_hits (user_id, bucket, window_start, hits)
    values (${userId}, ${bucket}, ${start.toISOString()}::timestamp, 1)
    on conflict (user_id, bucket, window_start) do update set hits = rate_hits.hits + 1
    returning hits`);
  return Number((res.rows[0] as { hits: number | string }).hits);
}

/** Every row, anyone's, older than its bucket's `retainMs` before `start`: the retention sweep's predicate. */
function agedRows(start: Date) {
  const aged = (Object.keys(RATE_RULES) as RateBucket[]).map(
    (b) => sql`(bucket = ${b} and window_start < ${new Date(start.getTime() - retainMs(b)).toISOString()}::timestamp)`,
  );
  return sql`(${sql.join(aged, sql` or `)})`;
}

/** The retention sweep `recordHit(..., false)` left out, run after the response: an enforced count waits on its own upsert only. */
export function sweepAfterResponse(bucket: RateBucket, now: Date): void {
  const start = windowStart(now, RATE_RULES[bucket].windowMs);
  after(async () => {
    try {
      await db.execute(sql`delete from rate_hits where ${agedRows(start)}`);
    } catch {
      // The sweep is best effort; the next hit runs it again.
    }
  });
}

let reportedFailure = false;

/**
 * ENFORCED: counts this hit by `userId` in `bucket` BEFORE answering, and returns the seconds until the window
 * ends when the hit is over the rule (the caller refuses it, with that as `Retry-After`), or null to let it
 * through. A counting failure lets it through (fail open): a database hiccup must not turn a reader away.
 * A counting failure is reported to Sentry once per instance. Each window logs at most twice, at the hit reaching half the limit and at the first refused hit, so the
 * logs show how close real readers come without a line per request. The lines carry the bucket and the
 * limit, never the player.
 */
export async function enforceHit(userId: string, bucket: RateBucket, now: Date = new Date()): Promise<number | null> {
  const rule = RATE_RULES[bucket];
  let hits: number;
  try {
    // The count alone inside the request; the retention sweep across every bucket waits for the response.
    hits = await recordHit(userId, bucket, now, false);
  } catch (err) {
    // Fail open, but never silently: a counter that always throws would switch enforcement off unseen.
    if (!reportedFailure) {
      reportedFailure = true;
      captureServerError("rate-enforce", err);
    }
    return null;
  }
  sweepAfterResponse(bucket, now);
  if (reachesHalf(hits, rule)) console.warn(`[rate] near bucket=${bucket} hits=${hits} limit=${rule.limit}`);
  if (!overLimit(hits, rule)) return null;
  if (hits === rule.limit + 1) console.warn(`[rate] refused bucket=${bucket} limit=${rule.limit}`);
  return retryAfterSec(now, rule);
}
