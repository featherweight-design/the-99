/**
 * The seat notice's push (Rule 0 revisions, item 6): "<host> seated you at <pod>'s table." Its own `push_outbox` kind
 * (`SEAT_PUSH_KIND`), outside the feed's kinds: no feed item rides with it, so the row is written by this one statement from
 * `setTable` and `reseatTable`, inside their transaction (a rolled-back setup sends nothing), and the kick follows the commit.
 *
 * The row holds no words, like every outbox row: its `item_key` names the table (`table:<id>`), and the flush resolves the
 * host, the pod and the reader's deck from `unseenSeatNotices` (`social/rule-zero-notice.ts`), through the reader's own grant.
 * So a table closed, a seat removed, a pod left, or a notice already seen (the table opened first) is dropped at the flush.
 *
 * One row per (table, player), by the outbox's unique index: a reseat that keeps a player, or removes and re-adds them,
 * never pushes them twice. It is queued only while the reader has a device; no per-kind preference exists to judge.
 */
import { sql, type SQL } from "drizzle-orm";

import { pushOutbox, pushSubscriptions } from "../../db/schema";
import { SEAT_PUSH_KIND } from "../feed/kinds";

const PREFIX = "table:";

/** The outbox `item_key` of a table's seat notice. */
export const seatItemKey = (tableId: string): string => `${PREFIX}${tableId}`;

/** The table id inside a seat notice's `item_key`, or null for a key that is not one. */
export const tableIdOfSeatKey = (key: string): string | null => (key.startsWith(PREFIX) && key.length > PREFIX.length ? key.slice(PREFIX.length) : null);

/** Queue the notice for one seated player. Returns a row only when it queued one (a device, and not already queued). */
export function enqueueSeatPushQuery(userId: string, tableId: string, now: Date): SQL {
  return sql`insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
    select ${userId}, ${SEAT_PUSH_KIND}, ${seatItemKey(tableId)}, ${seatItemKey(tableId)}, '{}'::jsonb, ${now.toISOString()}::timestamptz
    where exists (select 1 from ${pushSubscriptions} sps where sps.user_id = ${userId})
    on conflict (user_id, kind, item_key) do nothing
    returning id`;
}
