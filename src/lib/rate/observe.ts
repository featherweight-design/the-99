import { after } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { requestSwitchEnv } from "../switches/request";
import { rateLimitEnabled } from "./flag";
import { overLimit, RATE_RULES, windowStart, type RateBucket } from "./rules";

/**
 * Counts one hit by `userId` in `bucket` and returns the window's count so far. ONE statement: it
 * upserts this window's row, and in the same statement deletes this player's rows for the bucket
 * from earlier windows, so the table needs no sweeper (its rows are one per player, bucket and
 * minute, and only the current one survives the next hit). The delete is a CTE, so it runs whether
 * or not the upsert conflicts.
 */
export async function recordHit(userId: string, bucket: RateBucket, now: Date = new Date()): Promise<number> {
  const rule = RATE_RULES[bucket];
  const start = windowStart(now, rule.windowMs);
  const res = await db.execute(sql`
    with swept as (
      delete from rate_hits where user_id = ${userId} and bucket = ${bucket} and window_start < ${start.toISOString()}::timestamp
    )
    insert into rate_hits (user_id, bucket, window_start, hits)
    values (${userId}, ${bucket}, ${start.toISOString()}::timestamp, 1)
    on conflict (user_id, bucket, window_start) do update set hits = rate_hits.hits + 1
    returning hits`);
  return Number((res.rows[0] as { hits: number | string }).hits);
}

/**
 * Observe-only: after the response is sent, count this hit and log when it is over the rule. The
 * switch is read first, from this request's resolved switches (request APIs are not available inside
 * `after()`), and with it off nothing is scheduled. The write runs in `after()`, so the request never
 * waits on it, and every failure is swallowed: counting is not allowed to cost a reader anything. The
 * log line carries the bucket, the count and the limit, never the player.
 */
export async function observeHit(userId: string, bucket: RateBucket): Promise<void> {
  let on = false;
  try {
    on = rateLimitEnabled(await requestSwitchEnv(userId));
  } catch {
    return;
  }
  if (!on) return;
  after(async () => {
    try {
      const hits = await recordHit(userId, bucket);
      if (overLimit(hits, RATE_RULES[bucket])) {
        console.warn(`[rate] would refuse bucket=${bucket} hits=${hits} limit=${RATE_RULES[bucket].limit}`);
      }
    } catch {
      // Counting is best effort by design.
    }
  });
}
