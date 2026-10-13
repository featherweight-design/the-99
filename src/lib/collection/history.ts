import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { HistoryRow } from "../../db/schema";
import { cartSourceDecks } from "../decks/mark-bought";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import { HISTORY_RETENTION_DAYS } from "./write";

/** The anchor and the hand entries after it, shared by the count and the keys below. */
const handEntriesSince = (userId: string) => sql`
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
    ),
    hand as (
      -- Rows past the retention window are treated as pruned even before the lazy prune has run,
      -- so the keys never name a holding only an aged-out entry touched; the entry still counts.
      select case when e.created_at > now() - make_interval(days => ${HISTORY_RETENTION_DAYS}) then e.rows end as rows
      from collection_history e, anchor a
      where e.user_id = ${userId}
        and e.kind in ('add', 'edit', 'revert')
        and case
          when a.seq is not null then e.seq > a.seq
          when a.at is not null then e.created_at > a.at
          else true
        end
    )`;

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
  const rows = await db.execute<{ n: number }>(sql`${handEntriesSince(userId)} select count(*)::int as n from hand`);
  return rows.rows[0]?.n ?? 0;
}

/**
 * The holdings those same hand changes touched, as `collectionItemKey`s: what the Replace preview
 * tags `edited`. An entry whose rows have aged out (pruned to null) names nothing, so a holding
 * only that entry touched is not tagged; the count above still includes it.
 */
export async function editedKeysSinceUpload(userId: string): Promise<Set<string>> {
  const res = await db.execute<{ rows: HistoryRow[] | null }>(sql`${handEntriesSince(userId)} select rows from hand`);
  const keys = new Set<string>();
  for (const entry of res.rows) {
    for (const r of entry.rows ?? []) keys.add(collectionItemKey({ ...r, finish: r.finish as CollectionItemIdentity["finish"] }));
  }
  return keys;
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
  /**
   * Copies it added and copies it took away, summed over its rows. What the list draws
   * (`+12 · −3`): `raised` and `lowered` count ROWS, and a row raised from 1 to 4 is one row and
   * three copies.
   */
  copiesUp: number;
  copiesDown: number;
  /**
   * Every row it changed ends at no copies: an edit the list labels as a removal (plan
   * Decision 2 folds removal into `edit`). Computed from the rows so the list needs no detail read.
   */
  removesOnly: boolean;
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
  /** The file an upload entry came from (`csv_uploads.filename`); null for any other kind. */
  uploadFilename: string | null;
  /** The first changed row's card name: what an add, edit or removal is titled by. */
  firstName: string | null;
  /**
   * The deck a Shopping purchase came from (source `shopping:<deck id>`), resolved at read time so
   * a renamed deck reads its new name. `name` is null when that deck has since been deleted: the
   * source has no FK, so the id outlives the deck. Null for every entry not sourced from Shopping.
   */
  shoppingDeck: { id: string; name: string | null } | null;
  /** Bought from the all-decks cart (source `shopping:cart:<deck ids>`): no one deck to name. */
  shoppingCart: boolean;
  /**
   * The decks a cart purchase was bought for (the ids its source records), resolved at read time: the
   * first `CART_DECKS_NAMED` living decks by name, the living ones past them, and those since deleted.
   * Null for every entry not sourced from the cart.
   */
  cartDecks: CartDecks | null;
};

export const CART_DECKS_NAMED = 3;
export type CartDecks = { named: { id: string; name: string }[]; more: number; gone: number };

/** Pure half of the cart's deck line: `living` maps the ids that still exist to their names. */
export function cartDecksOf(ids: readonly string[], living: ReadonlyMap<string, string>): CartDecks {
  const alive = ids.filter((id) => living.has(id));
  return {
    named: alive.slice(0, CART_DECKS_NAMED).map((id) => ({ id, name: living.get(id)! })),
    more: Math.max(alive.length - CART_DECKS_NAMED, 0),
    gone: ids.length - alive.length,
  };
}

/** Fills `cartDecks` on a page of entries with ONE read of the player's own decks. */
async function withCartDecks<T extends HistoryListEntry>(userId: string, entries: T[]): Promise<T[]> {
  const ids = [...new Set(entries.flatMap((e) => cartSourceDecks(e.source) ?? []))].filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return entries;
  const res = await db.execute<{ id: string; name: string }>(sql`
    select d.id::text as id, d.name from decks d
    where d.user_id = ${userId} and d.id::text in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
  const living = new Map(res.rows.map((r) => [r.id, r.name]));
  return entries.map((e) => {
    const listed = cartSourceDecks(e.source);
    return listed ? { ...e, cartDecks: cartDecksOf(listed, living) } : e;
  });
}

export type HistoryEntry = HistoryListEntry & { rows: HistoryRow[] };

type ListRow = {
  id: string; seq: string | number; created_at: Date | string; kind: HistoryListEntry["kind"];
  source: string | null; raised: number; lowered: number; row_count: number; removes_only: boolean;
  // bigint: one row's move fits an integer, a sum of rows need not. The driver hands back text.
  copies_up: string | number; copies_down: string | number;
  reverts_id: string | null; reverted_by: string | null;
  reverts_visible: boolean; reverted_by_visible: boolean;
  upload_filename: string | null; first_name: string | null;
  shopping_deck_id: string | null; shopping_deck_name: string | null;
  rows?: HistoryRow[];
};

/**
 * The fields both reads share. Every entry it returns is inside the retention window and still
 * holds its rows, so what a player sees is exact whether or not the lazy prune has run yet.
 * Aliased and qualified throughout: the two link checks are correlated subqueries over the same
 * table, the shape that compares a row with itself when written bare (AGENTS.md).
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`);

export const listColumns = sql`
  h.id, h.seq, h.created_at, h.kind, h.source, h.raised, h.lowered,
  jsonb_array_length(h.rows) as row_count, h.reverts_id, h.reverted_by,
  (
    jsonb_array_length(h.rows) > 0
    and not exists (
      select 1 from jsonb_array_elements(h.rows) e where jsonb_typeof(e -> 'after') <> 'null'
    )
  ) as removes_only,
  (
    select coalesce(sum(greatest(
      coalesce((e -> 'after' ->> 'quantity')::int, 0) - coalesce((e -> 'before' ->> 'quantity')::int, 0), 0
    )), 0)::bigint
    from jsonb_array_elements(h.rows) e
  ) as copies_up,
  (
    select coalesce(sum(greatest(
      coalesce((e -> 'before' ->> 'quantity')::int, 0) - coalesce((e -> 'after' ->> 'quantity')::int, 0), 0
    )), 0)::bigint
    from jsonb_array_elements(h.rows) e
  ) as copies_down,
  exists (
    select 1 from collection_history t
    where t.id = h.reverts_id and t.rows is not null
      and t.created_at >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})
  ) as reverts_visible,
  exists (
    select 1 from collection_history t
    where t.id = h.reverted_by and t.rows is not null
      and t.created_at >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})
  ) as reverted_by_visible,
  -- The upload's filename, for titling an upload entry: the entry's source is csv_uploads:<id>.
  -- Scoped to the entry's own user, so a source naming another account's upload can never leak a name.
  (
    select u.filename from csv_uploads u
    where u.user_id = h.user_id
      -- The source is csv_uploads:<uuid>. Parsed to a uuid so the primary key serves the lookup; the guard
      -- keeps the cast off any source that is not that shape.
      and u.id = case when h.source ~ '^csv_uploads:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      then substr(h.source, 13)::uuid end
  ) as upload_filename,
  -- The deck a Shopping purchase came from: the source is shopping:<deck uuid>, written by markBought.
  -- The name is read now, never copied into the entry, so a rename shows; a deleted deck reads null.
  -- Scoped to the entry's own user like the upload above, and guarded the same way.
  case when h.source ~ '^shopping:${sql.raw(UUID)}$' then substr(h.source, 10) end as shopping_deck_id,
  (
    select d.name from decks d
    where d.user_id = h.user_id
      and d.id = case when h.source ~ '^shopping:${sql.raw(UUID)}$' then substr(h.source, 10)::uuid end
  ) as shopping_deck_name,
  h.rows -> 0 ->> 'name' as first_name
`;

const inWindow = (userId: string) => sql`
  h.user_id = ${userId} and h.rows is not null
  and h.created_at >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})
`;

function toListEntry(r: ListRow): HistoryListEntry {
  return {
    id: r.id, seq: Number(r.seq), createdAt: new Date(r.created_at), kind: r.kind, source: r.source,
    raised: r.raised, lowered: r.lowered, rowCount: r.row_count, removesOnly: r.removes_only,
    copiesUp: Number(r.copies_up), copiesDown: Number(r.copies_down),
    revertsId: r.reverts_id, revertedBy: r.reverted_by,
    revertsVisible: r.reverts_visible, revertedByVisible: r.reverted_by_visible,
    uploadFilename: r.upload_filename, firstName: r.first_name,
    shoppingDeck: r.shopping_deck_id ? { id: r.shopping_deck_id, name: r.shopping_deck_name } : null,
    shoppingCart: cartSourceDecks(r.source) !== null,
    cartDecks: null,
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
  const page = await withCartDecks(userId, rows.rows.slice(0, HISTORY_PAGE_SIZE).map(toListEntry));
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
  if (!r) return null;
  const [entry] = await withCartDecks(userId, [toListEntry(r)]);
  return { ...entry, rows: r.rows ?? [] };
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

/** Holdings (`collection_items` rows) and copies now: the base the upload previews count against. */
export async function collectionTotals(userId: string): Promise<{ holdings: number; copies: number }> {
  const res = await db.execute<{ holdings: number; copies: number }>(sql`
    select count(*)::int as holdings, coalesce(sum(quantity), 0)::int as copies
    from collection_items where user_id = ${userId}`);
  return res.rows[0] ?? { holdings: 0, copies: 0 };
}

/** When the newest confirmed upload was confirmed: the date the Replace warning quotes. */
export async function lastUploadConfirmedAt(userId: string): Promise<Date | null> {
  const res = await db.execute<{ at: Date | string | null }>(sql`
    select max(confirmed_at) as at from csv_uploads where user_id = ${userId} and confirmed_at is not null`);
  const at = res.rows[0]?.at;
  return at ? new Date(at) : null;
}

/**
 * Whether the player has any history inside the window: the History tab's gate on an empty
 * collection (an entry exists once anything was ever changed, even a removal back to nothing).
 */
export async function collectionHasHistory(userId: string): Promise<boolean> {
  const r = await db.execute<{ yes: boolean }>(sql`
    select exists (select 1 from collection_history h where ${inWindow(userId)}) as yes
  `);
  return r.rows[0]?.yes === true;
}
