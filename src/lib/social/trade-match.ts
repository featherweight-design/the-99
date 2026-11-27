/**
 * Trade matches (menu and Home G1: "A friend's spare appears for a card on your wishlist"; plan
 * `2026-10-22-menu-home.md`, "The feed model"). Detected at READ time: the viewer's unmet wishlist lines against the
 * spares their friends offer them, read through the shipped `loadFriendSpares` (the grant, each friend's own claim
 * model and spare rule; never restated here). A match is persisted on first notice (`recordFeedItem`, dedupe: card
 * and friend) so it has a seen state and a date; the feed's read re-joins the live grant on every read
 * (`feed-items.ts`), so a share turned off drops the row with no write here.
 *
 * `noticeTradeMatches` is called per request through `after()` by the pages that draw the feed or the Friends badge.
 * It is idempotent (the dedupe key) and cheap when nothing changed: a kind that is off or a wishlist with nothing
 * unmet costs one indexed read, and an unchanged fingerprint (the wished cards, the kind's `enabledAt` and
 * `friendGeneration`, which moves on any granting friend's data stamp, name or grant) costs two and reads no spares.
 * The fingerprint is held per server instance, so a cold instance pays one full read, which writes nothing new.
 *
 * The wished cards are the viewer's whole wishlist: hand lines and the lines their decks put there (`lines.ts`'s union,
 * Cart on your wishlist PR 3). Two push rules (plan `2026-11-27-cart-wishlist.md`, "Feed and push"): a card wanted only
 * by a `quiet` synced line (switching the sync on, a large deck import: Q2) is written to the feed but never pushes, and
 * a reader gets at most one trade-match push a day (H3, `pushCapWhen`). A later match that day still lands in the feed.
 */
import { newBatchKey } from "../push/enqueue";
import { feedOrPushWanted } from "../push/kind-gate";
import { createHash } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { pushOutbox, pushSubscriptions, userPrefs, wishlistSynced } from "../../db/schema";
import { judgedZone } from "../push/hold";
import { wall, zonedToInstant } from "../time/zoned";
import { handSide, ownerSyncedSide, unionLines } from "../wishlist/lines";
import { availableFeedKinds } from "../feed/flag";
import { recordFeedItem } from "./feed-write";
import { MAX_SPARES_BATCH } from "./client-rules";
import { friendGeneration, loadFriendSpares, spareGrantorsQuery } from "./spares";

/**
 * The viewer's unmet wishlist cards (the union: hand and deck lines, still-wanted only), read only while they want
 * trade-match news (the feed kind on, or a device with its push on), with the earlier stamp of the two. `quiet`: the
 * card is wanted only by a synced line its pass marked quiet, so its matches never push. A hand line that still wants
 * the card makes it loud, since the reader picked it.
 */
export function wishedForMatchQuery(viewerId: string) {
  // The gate sits in the owners subquery, so a reader who wants no trade-match news reads no lines at all.
  const owners = sql`select tup.user_id from ${userPrefs} tup
    where tup.user_id = ${viewerId} and ${feedOrPushWanted(sql`tup`, sql`tup.user_id`, "trade-match")}`;
  return sql`select ul.oracle_id as oracle_id,
      (ul.source = 'deck' and exists (select 1 from ${wishlistSynced} tq
        where tq.user_id = ul.user_id and tq.oracle_id = ul.oracle_id and tq.quiet)) as quiet,
      coalesce(tep.feed_kinds ->> 'trade-match', tep.push_kinds ->> 'trade-match') as enabled_at
    from (${unionLines(handSide(owners), ownerSyncedSide(owners))}) ul
    join ${userPrefs} tep on tep.user_id = ul.user_id
    order by ul.oracle_id`;
}

/**
 * The start of the reader's day for the push cap (H3): midnight in the zone of the device that refreshed last, or UTC
 * with no device or a zone the runtime does not know (`judgedZone`, the hold's own fallback). Pure.
 */
export function readerDayStart(now: Date, timeZone: string | null): Date {
  const zone = judgedZone(timeZone ?? "UTC");
  const w = wall(now, zone);
  return zonedToInstant({ y: w.y, mo: w.mo, d: w.d, h: 0, mi: 0, s: 0 }, zone);
}

/** The zone the reader's day is judged in: their most recently refreshed device's, or null with none. */
export function readerZoneQuery(viewerId: string) {
  return sql`select tps.time_zone from ${pushSubscriptions} tps where tps.user_id = ${viewerId}
    order by tps.refreshed_at desc, tps.id limit 1`;
}

/**
 * The cap's condition on one trade-match push (H3): no trade-match push of ANOTHER batch was queued for the reader
 * since their day began, so the day's first notice is its one push, however many cards it found (one batch is one
 * push, `plan.ts`). Judged inside the notice's transaction under `tradeMatchPushLock`, so two notices racing for one
 * reader cannot both see none. A row the flush dropped or abandoned still counts: the day's push was spent.
 */
export function pushCapWhen(viewerId: string, batchKey: string, dayStart: Date): SQL {
  return sql`not exists (select 1 from ${pushOutbox} tpo
    where tpo.user_id = ${viewerId} and tpo.kind = 'trade-match' and tpo.batch_key <> ${batchKey}
      and tpo.created_at >= ${dayStart.toISOString()}::timestamptz)`;
}

/** The per-reader lock the cap is judged under: one notice's writes at a time for one reader. */
export function tradeMatchPushLock(viewerId: string): SQL {
  return sql`select pg_advisory_xact_lock(hashtext('trade-match-push'), hashtext(${viewerId}))`;
}

/**
 * Quiet is a mark on the lines' arrival, not on the lines: once a notice has read a quiet line (and written whatever
 * matches it had then, without a push), the line is loud, so a spare a friend lists later pushes as usual (plan
 * finding 5). Only the lines this notice read: one the sync adds quiet meanwhile waits for the next notice.
 */
export function clearQuietQuery(viewerId: string, oracleIds: string[]): SQL {
  return sql`update ${wishlistSynced} set quiet = false where user_id = ${viewerId} and quiet
    and oracle_id in (${sql.join(oracleIds.map((id) => sql`${id}::uuid`), sql`, `)})`;
}

/** A trade match's dedupe key: one item per card per friend, ever. */
export const tradeMatchKey = (oracleId: string, friendUserId: string): string => `${oracleId}:${friendUserId}`;

/** The fingerprint of what a notice depends on; equal fingerprints find nothing new. Pure. */
export function tradeMatchFingerprint(wished: readonly string[], enabledAt: string, generation: string): string {
  return createHash("sha256").update(JSON.stringify([[...wished].sort(), enabledAt, generation])).digest("hex");
}

const MEMO_LIMIT = 1000;
const memo = new Map<string, string>();
const remember = (viewerId: string, fingerprint: string) => {
  memo.delete(viewerId);
  memo.set(viewerId, fingerprint);
  // Oldest first out: a Map iterates in insertion order.
  if (memo.size > MEMO_LIMIT) memo.delete(memo.keys().next().value as string);
};

/** For tests and probes: forget every fingerprint, so the next notice reads in full. */
export function forgetTradeMatchFingerprints(): void {
  memo.clear();
}

/**
 * Records each trade match the viewer has not been told about. `env` is the viewer's resolved switches: the kind
 * needs the feed, friends and the wishlist. Returns how many items were written.
 */
export async function noticeTradeMatches(viewerId: string, env: NodeJS.ProcessEnv): Promise<number> {
  if (!availableFeedKinds(env).includes("trade-match")) return 0;
  const rows = (await db.execute<{ oracle_id: string; quiet: boolean; enabled_at: string }>(wishedForMatchQuery(viewerId))).rows;
  if (rows.length === 0) {
    memo.delete(viewerId);
    return 0;
  }
  const wished = rows.map((r) => r.oracle_id);
  const fingerprint = tradeMatchFingerprint(wished, rows[0].enabled_at, await friendGeneration(viewerId));
  if (memo.get(viewerId) === fingerprint) return 0;

  const spares: Awaited<ReturnType<typeof loadFriendSpares>> = [];
  for (let i = 0; i < wished.length; i += MAX_SPARES_BATCH) {
    spares.push(...(await loadFriendSpares(viewerId, wished.slice(i, i + MAX_SPARES_BATCH))));
  }
  const quietIds = rows.filter((r) => r.quiet === true).map((r) => r.oracle_id);
  let written = 0;
  // One call, one batch: the matches this notice found are one push ("Colin has 3 spares you want").
  const batchKey = newBatchKey("trade-match");
  if (spares.length > 0) {
    // A spare names its friend by public id; the item stores the account, read through the same grant.
    const byPublic = new Map((await spareGrantorsQuery(viewerId)).map((g) => [g.publicId, g.userId]));
    const quiet = new Set(quietIds);
    const now = new Date();
    const zone = (await db.execute<{ time_zone: string }>(readerZoneQuery(viewerId))).rows[0]?.time_zone ?? null;
    const cap = pushCapWhen(viewerId, batchKey, readerDayStart(now, zone));
    written = await db.transaction(async (tx) => {
      // The cap reads the reader's queued pushes: under this lock a second notice waits, then sees this one's rows.
      await tx.execute(tradeMatchPushLock(viewerId));
      let n = 0;
      for (const s of spares) {
        const friendUserId = byPublic.get(s.friend.publicId);
        // A grant gone between the two reads: the next notice, with a new fingerprint, decides.
        if (!friendUserId) continue;
        const ok = await recordFeedItem(tx, {
          userId: viewerId,
          kind: "trade-match",
          dedupeKey: tradeMatchKey(s.oracleId, friendUserId),
          oracleId: s.oracleId,
          friendUserId,
          batchKey,
          now,
          pushWhen: quiet.has(s.oracleId) ? sql`false` : cap,
        });
        if (ok) n += 1;
      }
      // In the writes' transaction: a failed write leaves the lines quiet, so the retry still never pushes them.
      if (quietIds.length > 0) await tx.execute(clearQuietQuery(viewerId, quietIds));
      return n;
    });
  } else if (quietIds.length > 0) {
    await db.execute(clearQuietQuery(viewerId, quietIds));
  }
  remember(viewerId, fingerprint);
  return written;
}
