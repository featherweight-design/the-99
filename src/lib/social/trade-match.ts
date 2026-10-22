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
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { collectionItems, userPrefs, wishlistItems } from "../../db/schema";
import { availableFeedKinds } from "../feed/flag";
import { recordFeedItem } from "./feed-write";
import { MAX_SPARES_BATCH } from "./client-rules";
import { friendGeneration, loadFriendSpares, spareGrantorsQuery } from "./spares";

/** The viewer's unmet wishlist cards, read only while their trade-match kind is on, with the kind's `enabledAt`. */
export function wishedForMatchQuery(viewerId: string) {
  return sql`select twi.oracle_id as oracle_id, tup.feed_kinds ->> 'trade-match' as enabled_at
    from ${wishlistItems} twi
    join ${userPrefs} tup on tup.user_id = twi.user_id
    where twi.user_id = ${viewerId}
      and (tup.feed_kinds ->> 'trade-match') is not null
      and coalesce((select sum(tci.quantity) from ${collectionItems} tci
                    where tci.user_id = twi.user_id and tci.oracle_id = twi.oracle_id), 0) < twi.quantity
    order by twi.oracle_id`;
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
  const rows = (await db.execute<{ oracle_id: string; enabled_at: string }>(wishedForMatchQuery(viewerId))).rows;
  if (rows.length === 0) {
    memo.delete(viewerId);
    return 0;
  }
  const wished = rows.map((r) => r.oracle_id);
  const fingerprint = tradeMatchFingerprint(wished, rows[0].enabled_at, await friendGeneration(viewerId));
  if (memo.get(viewerId) === fingerprint) return 0;

  const spares = [];
  for (let i = 0; i < wished.length; i += MAX_SPARES_BATCH) {
    spares.push(...(await loadFriendSpares(viewerId, wished.slice(i, i + MAX_SPARES_BATCH))));
  }
  let written = 0;
  if (spares.length > 0) {
    // A spare names its friend by public id; the item stores the account, read through the same grant.
    const byPublic = new Map((await spareGrantorsQuery(viewerId)).map((g) => [g.publicId, g.userId]));
    for (const s of spares) {
      const friendUserId = byPublic.get(s.friend.publicId);
      // A grant gone between the two reads: the next notice, with a new fingerprint, decides.
      if (!friendUserId) continue;
      const ok = await recordFeedItem(db, {
        userId: viewerId,
        kind: "trade-match",
        dedupeKey: tradeMatchKey(s.oracleId, friendUserId),
        oracleId: s.oracleId,
        friendUserId,
      });
      if (ok) written += 1;
    }
  }
  remember(viewerId, fingerprint);
  return written;
}
