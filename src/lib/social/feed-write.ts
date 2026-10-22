/**
 * The one writer of `feed_items` (menu and Home, G1). The jobs that know an event call it (PR 5: the price job, the
 * collection write for combos, the trade-match notice), each inside or after its own transaction.
 *
 * - A kind that is OFF for the reader is not written (handoff: "Kinds off in Settings are not written for you at all,
 *   no backfill when turned on"). The test is in the INSERT itself, against the reader's effective state
 *   (`kindEnabledAt`: `feed_kinds`, or a default-on kind not declined), so a reader turning the kind off while the
 *   job runs never gets a row the next statement would have refused. A reader with no prefs row still gets a
 *   default-on kind (spare requests G4).
 * - The same event twice writes once: `(user_id, kind, dedupe_key)` is unique, and a repeat does nothing.
 * - Catalog kinds are never written here: they are read from `catalog_first_seen` (`lib/feed/read.ts`).
 *
 * Writing a row moves no data stamp (`feed_items` has no trigger): the feed is read per request.
 * It lives in `src/lib/social/` because a row can name a friend: `check:social-reads` binds `feed_items` to this
 * directory, so every read and write of it is one a reviewer checks against the grant rule.
 */
import { sql, type SQL } from "drizzle-orm";

import type { db } from "../../db";
import { feedItems, friendLinks, pushSubscriptions, userPrefs } from "../../db/schema";
import { kindEnabledAt } from "../feed/kind-gate";
import { enqueuePush } from "../push/enqueue";
import { pushKindEnabledAt } from "../push/kind-gate";
import { isStoredKind, type StoredKind } from "../feed/kinds";

export type FeedItemInput = {
  userId: string;
  kind: StoredKind;
  /** The writer's own name for the event: a variant id, a card and a week. Unique per reader and kind. */
  dedupeKey: string;
  oracleId?: string | null;
  variantId?: string | null;
  /** The friend a trade match (or a spare request) is about. Never the reader. */
  friendUserId?: string | null;
  data?: Record<string, unknown>;
  /** The job run this event belongs to, so several of one kind from one run are ONE push. Default: the kind's 15-minute window (`defaultBatchKey`). */
  batchKey?: string;
  now?: Date;
};

type Executor = Pick<typeof db, "execute">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Why an input cannot be written, or null. Pure, so a writer's mistake fails loudly before any SQL. */
export function feedItemProblem(input: FeedItemInput): string | null {
  if (!input.userId) return "no reader";
  if (!isStoredKind(input.kind)) return `kind ${String(input.kind)} is not a stored kind`;
  if (!input.dedupeKey || input.dedupeKey.length > 200) return "a dedupe key of 1 to 200 characters is required";
  if (input.oracleId != null && !UUID.test(input.oracleId)) return "oracleId is not a uuid";
  if (input.friendUserId != null && input.friendUserId === input.userId) return "an item cannot name the reader as the friend";
  if ((input.kind === "trade-match" || input.kind === "spare-request") && (!input.friendUserId || !input.oracleId)) {
    return `${input.kind} needs a friend and a card`;
  }
  if (input.kind === "price-drop" && !input.oracleId) return "price-drop needs a card";
  if (input.kind === "combo" && !input.variantId) return "combo needs a variant";
  return null;
}

/**
 * An item naming a friend is written only while that friendship stands, and holds the reader's friendship row FOR
 * SHARE until the insert commits (the `resolveFriendSeatsIn` rule, `games.ts`). The purge locks those rows before it
 * deletes the friend's feed items, so a write racing a friend's purge either waits and is then refused (the row is
 * gone) or commits first and is deleted by it: it can never restore a purged account's id. One statement, so the lock
 * spans the insert even when the caller passes no transaction.
 */
function friendHeld(input: FeedItemInput): SQL {
  if (input.friendUserId == null) return sql``;
  return sql`
      and exists (select 1 from ${friendLinks} wfl
        where wfl.user_id = ${input.userId} and wfl.friend_user_id = ${input.friendUserId} for share)`;
}

/**
 * The insert, apart so a test can render it: one row, only while the item is newer than the kind's FEED `enabledAt`, or
 * the reader has a device and the item is newer than the kind's PUSH stamp (push is its own choice, so it works with the
 * feed kind off; the feed's reads filter by their own stamp, so such a row is never drawn), nothing on a repeat.
 * Selected from one constant row LEFT JOINED to the reader's prefs, so a reader with no row reads as every column
 * null: off for every kind but a default-on one.
 */
export function recordFeedItemQuery(input: FeedItemInput): SQL {
  const now = (input.now ?? new Date()).toISOString();
  const enabledAt = kindEnabledAt(sql`wup`, sql`${input.kind}::text`);
  const pushEnabledAt = pushKindEnabledAt(sql`wup`, sql`${input.kind}::text`);
  return sql`insert into ${feedItems} (user_id, kind, dedupe_key, oracle_id, variant_id, friend_user_id, data, created_at)
    select ${input.userId}, ${input.kind}, ${input.dedupeKey}, ${input.oracleId ?? null}::uuid, ${input.variantId ?? null}::text,
      ${input.friendUserId ?? null}::text, ${JSON.stringify(input.data ?? {})}::jsonb, ${now}::timestamptz
    from (select 1) wone
    left join ${userPrefs} wup on wup.user_id = ${input.userId}
    where (${now}::timestamptz > ${enabledAt}
      or (exists (select 1 from ${pushSubscriptions} wps where wps.user_id = ${input.userId})
        and ${now}::timestamptz > ${pushEnabledAt})) ${friendHeld(input)}
    on conflict (user_id, kind, dedupe_key) do nothing
    returning id`;
}

/**
 * Records one event for one reader through `tx` (a transaction, or `db`). Returns whether a row was written: false
 * for a kind that is off, an item not newer than the kind's `enabledAt`, a reader with no prefs row (every kind
 * off but a default-on one) and a repeat. Throws on a malformed input.
 */
export async function recordFeedItem(tx: Executor, input: FeedItemInput): Promise<boolean> {
  const problem = feedItemProblem(input);
  if (problem) throw new Error(`recordFeedItem: ${problem}`);
  const done = await tx.execute(recordFeedItemQuery(input));
  const wrote = (done.rowCount ?? done.rows.length) > 0;
  // A NEW item announces itself to the reader's devices through the outbox, in this same executor (plan D1).
  if (wrote) await enqueuePush(tx, { userId: input.userId, kind: input.kind, itemKey: input.dedupeKey, batchKey: input.batchKey, now: input.now });
  return wrote;
}

/** When this reader was last given an item of `kind` about this card, or null: a rule that spaces notices reads it. */
export async function lastFeedItemAt(tx: Executor, userId: string, kind: FeedItemInput["kind"], oracleId: string): Promise<Date | null> {
  const r = await tx.execute<{ at: Date | string | null }>(
    sql`select max(lfi.created_at) as at from ${feedItems} lfi where lfi.user_id = ${userId} and lfi.kind = ${kind} and lfi.oracle_id = ${oracleId}`,
  );
  const at = r.rows[0]?.at;
  return at == null ? null : new Date(at);
}
