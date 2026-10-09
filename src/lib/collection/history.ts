import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { HistoryRow } from "../../db/schema";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import { HISTORY_RETENTION_DAYS } from "./write";

/**
 * How many changes the player made by hand since their last confirmed upload: the figure the
 * Replace warning quotes ("in-app edits will be overwritten", brief §A). Adds, edits and reverts
 * all count; an upload does not.
 *
 * Anchored on the newest confirmed upload. When that upload wrote a ledger entry, "since" is by
 * the ledger's own order (`seq`), which no clock can disorder. When it did not (confirmed with the
 * switch off, or before the ledger existed), it is by that upload's `confirmed_at`. A player who
 * never uploaded counts every change they made.
 */
export async function editsSinceUpload(userId: string): Promise<number> {
  const rows = await db.execute<{ n: number }>(sql`
    with last_upload as (
      select u.id, u.confirmed_at from csv_uploads u
      where u.user_id = ${userId} and u.confirmed_at is not null
      order by u.confirmed_at desc
      limit 1
    ),
    anchor as (
      select
        (select lu.confirmed_at from last_upload lu) as at,
        (select h.seq from collection_history h, last_upload lu
          where h.user_id = ${userId} and h.source = 'csv_uploads:' || lu.id) as seq
    )
    select count(*)::int as n
    from collection_history e, anchor a
    where e.user_id = ${userId}
      and e.kind in ('add', 'edit', 'revert')
      and case
        when a.seq is not null then e.seq > a.seq
        when a.at is not null then e.created_at > a.at
        else true
      end
  `);
  return rows.rows[0]?.n ?? 0;
}

/** How many entries one page of history holds. */
export const HISTORY_PAGE_SIZE = 50;

/** One entry as the history list draws it: its counts, never its rows. */
export type HistoryListEntry = {
  id: string;
  seq: number;
  createdAt: Date;
  kind: "upload_replace" | "upload_add" | "add" | "edit" | "revert";
  source: string | null;
  raised: number;
  lowered: number;
  /** How many rows it changed; a Replace can touch hundreds. */
  rowCount: number;
  /** Set on a revert: the entry it reverted. */
  revertsId: string | null;
  /** Set on a reverted entry: the revert that reverted it. Hides the entry's revert control. */
  revertedBy: string | null;
  /**
   * Whether the entry at the other end of `revertsId` / `revertedBy` is still in the window.
   * The two age out separately: an entry still reads as reverted (or as a revert) once the
   * other has aged out, and the link to it is no longer drawn (brief §F).
   */
  revertsVisible: boolean;
  revertedByVisible: boolean;
};

export type HistoryEntry = HistoryListEntry & { rows: HistoryRow[] };

type ListRow = {
  id: string; seq: string | number; created_at: Date | string; kind: HistoryListEntry["kind"];
  source: string | null; raised: number; lowered: number; row_count: number;
  reverts_id: string | null; reverted_by: string | null;
  reverts_visible: boolean; reverted_by_visible: boolean;
  rows?: HistoryRow[];
};

/**
 * The fields both reads share. Every entry it returns is inside the retention window and still
 * holds its rows, so what a player sees is exact whether or not the lazy prune has run yet.
 * Aliased and qualified throughout: the two link checks are correlated subqueries over the same
 * table, the shape that compares a row with itself when written bare (AGENTS.md).
 */
const listColumns = sql`
  h.id, h.seq, h.created_at, h.kind, h.source, h.raised, h.lowered,
  jsonb_array_length(h.rows) as row_count, h.reverts_id, h.reverted_by,
  exists (
    select 1 from collection_history t
    where t.id = h.reverts_id and t.rows is not null
      and t.created_at >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})
  ) as reverts_visible,
  exists (
    select 1 from collection_history t
    where t.id = h.reverted_by and t.rows is not null
      and t.created_at >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})
  ) as reverted_by_visible
`;

const inWindow = (userId: string) => sql`
  h.user_id = ${userId} and h.rows is not null
  and h.created_at >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})
`;

function toListEntry(r: ListRow): HistoryListEntry {
  return {
    id: r.id, seq: Number(r.seq), createdAt: new Date(r.created_at), kind: r.kind, source: r.source,
    raised: r.raised, lowered: r.lowered, rowCount: r.row_count,
    revertsId: r.reverts_id, revertedBy: r.reverted_by,
    revertsVisible: r.reverts_visible, revertedByVisible: r.reverted_by_visible,
  };
}

/**
 * One page of `userId`'s history, newest first. `before` is the `seq` the previous page ended
 * on; `nextBefore` is null on the last page. Paged by `seq`, the ledger's own order, so an
 * entry written while the player pages never shifts a page they have not read yet.
 */
export async function listHistory(
  userId: string,
  opts: { before?: number } = {},
): Promise<{ entries: HistoryListEntry[]; nextBefore: number | null }> {
  const before = opts.before ?? null;
  const rows = await db.execute<ListRow>(sql`
    select ${listColumns}
    from collection_history h
    where ${inWindow(userId)}
      and (${before}::bigint is null or h.seq < ${before}::bigint)
    order by h.seq desc
    limit ${HISTORY_PAGE_SIZE + 1}
  `);
  const page = rows.rows.slice(0, HISTORY_PAGE_SIZE).map(toListEntry);
  const more = rows.rows.length > HISTORY_PAGE_SIZE;
  return { entries: page, nextBefore: more ? page[page.length - 1].seq : null };
}

/** One entry with every row it changed, or null when it is not the player's or has aged out. */
export async function getHistoryEntry(userId: string, id: string): Promise<HistoryEntry | null> {
  const rows = await db.execute<ListRow>(sql`
    select ${listColumns}, h.rows
    from collection_history h
    where ${inWindow(userId)} and h.id = ${id}
  `);
  const r = rows.rows[0];
  return r ? { ...toListEntry(r), rows: r.rows ?? [] } : null;
}

/**
 * Whether a revert would do something other than the exact inverse of what its entry did,
 * because the collection has moved since (brief §F: the confirmation says so). Compared per row
 * as copies moved: the entry's change against the revert's, which should be its negation.
 */
export function revertDiffers(
  entryRows: Pick<HistoryRow, "oracleId" | "setCode" | "collectorNumber" | "finish" | "before" | "after">[],
  planRows: Pick<HistoryRow, "oracleId" | "setCode" | "collectorNumber" | "finish" | "before" | "after">[],
): boolean {
  const moved = (r: { before: { quantity: number } | null; after: { quantity: number } | null }) =>
    (r.after?.quantity ?? 0) - (r.before?.quantity ?? 0);
  const plan = new Map(planRows.map((r) => [keyOf(r), moved(r)]));
  return entryRows.some((r) => (plan.get(keyOf(r)) ?? 0) !== -moved(r));
}

const keyOf = (r: { oracleId: string; setCode: string; collectorNumber: string; finish: string }) =>
  collectionItemKey(r as CollectionItemIdentity);
