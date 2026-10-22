/**
 * Queueing a push (plan `2026-10-22-push.md`, D1). The outbox row is written by the SAME statement that writes the feed
 * item (`recordFeedItemQuery`, a data-modifying CTE), so a committed feed item always has its push and a failed enqueue
 * can never leave one without it, whatever executor the caller passes (a transaction or `db`). A `push_outbox` row is
 * written only while the reader has at least one device AND the kind's PUSH is on AND the item is newer than the kind's push
 * stamp (`pushKindEnabledAt`), nothing on a repeat (the unique index). The row holds no words: its `item_key` is the feed
 * item's own opaque key (`item:<id>`, never a writer's dedupe key, which can name another account), and the flush resolves
 * the words from the feed's own read, so a push says exactly what Home says and a withdrawn offer is never pushed.
 *
 * It checks no switch: a device exists only if the reader subscribed while push was available, and the flush judges the
 * switch and the keys again before anything is sent.
 */
import { sql, type SQL } from "drizzle-orm";

import { pushOutbox, pushSubscriptions, userPrefs } from "../../db/schema";
import type { StoredKind } from "../feed/kinds";
import { pushKindEnabledAt } from "./kind-gate";

/** One job run writes its items within seconds; items of a kind for a reader inside one window are one push. */
export const BATCH_WINDOW_MS = 15 * 60_000;

export type PushEnqueue = {
  userId: string;
  kind: StoredKind;
  /** The feed item's opaque key: a SQL expression over the feed insert's own row, or a literal for a test. */
  itemKey: string | SQL;
  batchKey?: string;
  now?: Date;
  /** An extra condition, e.g. that the feed insert it rides on wrote a row. */
  when?: SQL;
};

/** The default batch: the kind and the 15-minute window `now` falls in. A writer that knows its job run passes its own. */
export const defaultBatchKey = (kind: StoredKind, now: Date): string => `${kind}:${Math.floor(now.getTime() / BATCH_WINDOW_MS)}`;

export function enqueuePushQuery(input: PushEnqueue): SQL {
  const now = input.now ?? new Date();
  const batch = input.batchKey ?? defaultBatchKey(input.kind, now);
  return sql`insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
    select ${input.userId}, ${input.kind}, ${input.itemKey}, ${batch}, '{}'::jsonb, ${now.toISOString()}::timestamptz
    from (select 1) pone
    left join ${userPrefs} pup on pup.user_id = ${input.userId}
    where ${input.when ?? sql`true`}
      and exists (select 1 from ${pushSubscriptions} pps where pps.user_id = ${input.userId})
      and ${now.toISOString()}::timestamptz > ${pushKindEnabledAt(sql`pup`, sql`${input.kind}::text`)}
    on conflict (user_id, kind, item_key) do nothing`;
}
