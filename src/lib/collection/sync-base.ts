import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { PendingItem } from "./pending";
import { quantitiesOf } from "./sync";

/**
 * THE BASE A SYNC MERGES AGAINST (plan `2026-10-15-collection-sync.md`, §The base read). The base is
 * the last FILE the collection was reconciled to, never the collection after it: the stored
 * `preview_payload.pendingItems` of the newest confirmed upload that is an ANCHOR.
 *
 * An anchor is a confirmed upload whose ledger entry (`collection_history.source =
 * 'csv_uploads:<id>'`):
 *   - is absent: an upload confirmed before the ledger, or with it off, which is a Replace by
 *     construction (Add came with the ledger);
 *   - or is an `upload_replace`;
 *   - or is an `upload_sync` made under **Everything** (`preview_payload.syncSummary.pick`, stored by
 *     the Sync's own confirm). A Sync under **Only what it adds** or **Only its tokens** did not take
 *     the file's removals, so its file is not what the collection was reconciled to;
 * and whose entry has not been reverted (`reverted_by` is null). Never an Add: its cards read as the
 * app's side.
 *
 * Owner-scoped in its own SQL: both the upload and the entry are matched on the reader's id.
 */

/** Read from a transaction (the write, under its lock) or the db (`measure:sync`'s snapshot). */
type Runner = Pick<typeof db, "execute">;

export type UploadSummary = { uploadId: string; confirmedAt: Date; items: Map<string, number> };

export type SyncBase =
  | { anchor: UploadSummary & { pendingItems: PendingItem[] }; earlier: UploadSummary[] }
  | { unavailable: "neverUploaded" | "noRecord" };

/** How many earlier uploads staleness compares the file with. */
export const EARLIER_UPLOADS = 5;

/** The newest anchor, beside whether the reader ever confirmed an upload at all. */
export const anchorQuery = (userId: string) => sql`
  select
    exists (
      select 1 from csv_uploads c where c.user_id = ${userId} and c.confirmed_at is not null
    ) as uploaded,
    a.id, a.confirmed_at, a.items
  from (select 1) one
  left join lateral (
    select u.id, u.confirmed_at, u.preview_payload -> 'pendingItems' as items
    from csv_uploads u
    left join collection_history h
      on h.user_id = u.user_id and h.source = 'csv_uploads:' || u.id::text
    where u.user_id = ${userId}
      and u.confirmed_at is not null
      and (
        h.id is null
        or (
          h.reverted_by is null
          and (
            h.kind = 'upload_replace'
            or (h.kind = 'upload_sync' and u.preview_payload -> 'syncSummary' ->> 'pick' = 'everything')
          )
        )
      )
    order by u.confirmed_at desc, u.id desc
    limit 1
  ) a on true`;

/**
 * The confirmed uploads before the anchor, newest first, for staleness: every one but an Add, whose file
 * is a partial list. A reverted upload and a partial Sync still read a whole export, so they stay.
 */
export const earlierQuery = (userId: string, anchorId: string) => sql`
  select u.id, u.confirmed_at, u.preview_payload -> 'pendingItems' as items
  from csv_uploads u
  left join collection_history h
    on h.user_id = u.user_id and h.source = 'csv_uploads:' || u.id::text
  where u.user_id = ${userId}
    and u.confirmed_at is not null
    and u.id <> ${anchorId}
    and u.confirmed_at <= (
      select an.confirmed_at from csv_uploads an where an.id = ${anchorId} and an.user_id = ${userId}
    )
    and (h.kind is null or h.kind <> 'upload_add')
  order by u.confirmed_at desc, u.id desc
  limit ${EARLIER_UPLOADS}`;

/** Whether stored items carry a full key: a preview written before migration 0008 has neither field. */
export function hasFullKeys(items: readonly PendingItem[]): boolean {
  return items.every((i) => typeof i.collectorNumber === "string" && typeof i.finish === "string");
}

const asDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

export async function readSyncBase(userId: string, q: Runner = db): Promise<SyncBase> {
  const { rows: [head] } = await q.execute<{
    uploaded: boolean; id: string | null; confirmed_at: Date | string | null; items: PendingItem[] | null;
  }>(anchorQuery(userId));
  if (!head?.uploaded) return { unavailable: "neverUploaded" };
  if (!head.id || !head.confirmed_at || !Array.isArray(head.items) || !hasFullKeys(head.items)) {
    return { unavailable: "noRecord" };
  }
  const { rows } = await q.execute<{ id: string; confirmed_at: Date | string; items: PendingItem[] | null }>(
    earlierQuery(userId, head.id),
  );
  return {
    anchor: {
      uploadId: head.id, confirmedAt: asDate(head.confirmed_at), items: quantitiesOf(head.items), pendingItems: head.items,
    },
    // An earlier file stored before 0008 cannot be keyed the way the anchor is: left out rather than guessed.
    earlier: rows
      .filter((r) => Array.isArray(r.items) && hasFullKeys(r.items))
      .map((r) => ({ uploadId: r.id, confirmedAt: asDate(r.confirmed_at), items: quantitiesOf(r.items!) })),
  };
}
