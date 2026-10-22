/**
 * The one writer of `feed_items` (menu and Home, G1). The jobs that know an event call it (PR 5: the price job, the
 * collection write for combos, the trade-match notice), each inside or after its own transaction.
 *
 * - A kind that is OFF for the reader is not written (handoff: "Kinds off in Settings are not written for you at all,
 *   no backfill when turned on"). The test is in the INSERT itself, against the reader's `feed_kinds`, so a reader
 *   turning the kind off while the job runs never gets a row the next statement would have refused.
 * - The same event twice writes once: `(user_id, kind, dedupe_key)` is unique, and a repeat does nothing.
 * - Catalog kinds are never written here: they are read from `catalog_first_seen` (`read.ts`).
 *
 * Writing a row moves no data stamp (`feed_items` has no trigger): the feed is read per request.
 */
import { sql, type SQL } from "drizzle-orm";

import type { db } from "../../db";
import { feedItems, userPrefs } from "../../db/schema";
import { isStoredKind, type StoredKind } from "./kinds";

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

/** The insert, apart so a test can render it: one row, only while the kind is on for the reader, nothing on a repeat. */
export function recordFeedItemQuery(input: FeedItemInput): SQL {
  const now = (input.now ?? new Date()).toISOString();
  return sql`insert into ${feedItems} (user_id, kind, dedupe_key, oracle_id, variant_id, friend_user_id, data, created_at)
    select ${input.userId}, ${input.kind}, ${input.dedupeKey}, ${input.oracleId ?? null}::uuid, ${input.variantId ?? null}::text,
      ${input.friendUserId ?? null}::text, ${JSON.stringify(input.data ?? {})}::jsonb, ${now}::timestamptz
    from ${userPrefs} wup
    where wup.user_id = ${input.userId} and (wup.feed_kinds ->> ${input.kind}) is not null
    on conflict (user_id, kind, dedupe_key) do nothing
    returning id`;
}

/**
 * Records one event for one reader through `tx` (a transaction, or `db`). Returns whether a row was written: false
 * for a kind that is off, a reader with no prefs row (every kind off) and a repeat. Throws on a malformed input.
 */
export async function recordFeedItem(tx: Executor, input: FeedItemInput): Promise<boolean> {
  const problem = feedItemProblem(input);
  if (problem) throw new Error(`recordFeedItem: ${problem}`);
  const done = await tx.execute(recordFeedItemQuery(input));
  return (done.rowCount ?? done.rows.length) > 0;
}
