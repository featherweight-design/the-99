/**
 * Queueing a push (plan `2026-10-22-push.md`, D1). Called by `recordFeedItem` right after it WRITES a new feed item, in
 * the same executor, so a rolled-back event queues nothing. One statement: a `push_outbox` row for (reader, kind,
 * item), only while the reader has at least one device AND the kind's push is on AND the item is newer than the kind's
 * push stamp (`pushKindEnabledAt`), nothing on a repeat (the unique index). The row holds no words: the flush resolves
 * them from the feed's own read, so a push says exactly what Home says and a withdrawn offer is never pushed.
 *
 * It checks no switch: a device exists only if the reader subscribed while push was available, and the flush judges the
 * switch and the keys again before anything is sent.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { pushOutbox, pushSubscriptions, userPrefs } from "../../db/schema";
import type { StoredKind } from "../feed/kinds";
import { pushKindEnabledAt } from "./kind-gate";

/** One job run writes its items within seconds; items of a kind for a reader inside one window are one push. */
export const BATCH_WINDOW_MS = 15 * 60_000;

export type PushEnqueue = { userId: string; kind: StoredKind; itemKey: string; batchKey?: string; now?: Date };

/** The default batch: the kind and the 15-minute window `now` falls in. A writer that knows its job run passes its own. */
export const defaultBatchKey = (kind: StoredKind, now: Date): string => `${kind}:${Math.floor(now.getTime() / BATCH_WINDOW_MS)}`;

export function enqueuePushQuery(input: PushEnqueue): SQL {
  const now = input.now ?? new Date();
  const batch = input.batchKey ?? defaultBatchKey(input.kind, now);
  return sql`insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
    select ${input.userId}, ${input.kind}, ${input.itemKey}, ${batch}, '{}'::jsonb, ${now.toISOString()}::timestamptz
    from (select 1) pone
    left join ${userPrefs} pup on pup.user_id = ${input.userId}
    where exists (select 1 from ${pushSubscriptions} pps where pps.user_id = ${input.userId})
      and ${now.toISOString()}::timestamptz > ${pushKindEnabledAt(sql`pup`, sql`${input.kind}::text`)}
    on conflict (user_id, kind, item_key) do nothing`;
}

export async function enqueuePush(tx: Pick<typeof db, "execute">, input: PushEnqueue): Promise<void> {
  await tx.execute(enqueuePushQuery(input));
}
