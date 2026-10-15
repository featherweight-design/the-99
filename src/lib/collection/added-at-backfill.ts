/**
 * Dates the holdings the column found already there (Date added, PR 1). SERVER/SCRIPT-ONLY, run once per
 * database by `scripts/backfill-added-at.ts`, which names its target by Neon branch.
 *
 * A holding with a null `added_at` is dated from the best evidence there is, and says how sure it is:
 *  - the ledger, when the holding's CURRENT ownership began with a hand entry (`add`, `edit` or `revert` raising it
 *    from nothing: Add cards, I got it, a precon add): that entry's time, EXACT. Valid only when no entry removed
 *    the holding after that raise and no upload that could have replaced the collection (anything but a pure Add)
 *    was confirmed after it, so a holding that was added, removed and brought back some other way is not dated
 *    to its first life. The ledger keeps 90 days, so this reaches recent holdings only. An upload's own
 *    entries are `upload_*` kinds (`kindOf`), so these entries are hand changes by construction;
 *  - else the first confirmed upload whose stored file (`pendingItems`, kept forever) holds it, INEXACT always:
 *    a snapshot says a holding was there by then, not when it arrived, and a Sync can leave a file's card unapplied.
 * A holding with neither stays null: it sorts last and reads as unknown. Only rows with a null `added_at` are
 * touched, so a re-run changes nothing it already settled. Each account is written in its own transaction under the
 * per-user advisory lock both collection writers take.
 */
export type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };
/** A pool: the writes run one account at a time on a connection of their own, inside a transaction. */
export type Pooled = Queryable & { connect: () => Promise<Queryable & { release: () => void }> };

/** Every holding that would be dated, with its date and exactness. `$1` null = every account. */
const CHOSEN = `
with from_upload as (
  select u.user_id, pi->>'oracleId' as oracle_id, lower(coalesce(pi->>'setCode', '')) as set_code,
         coalesce(pi->>'collectorNumber', '') as collector_number,
         coalesce(pi->>'finish', case when (pi->>'foil')::boolean then 'foil' else 'nonfoil' end) as finish,
         min(u.confirmed_at) as at
  from csv_uploads u, jsonb_array_elements(u.preview_payload->'pendingItems') pi
  where u.confirmed_at is not null and ($1::text is null or u.user_id = $1)
  group by 1, 2, 3, 4, 5
), from_ledger as (
  select h.user_id, r->>'oracleId' as oracle_id, r->>'setCode' as set_code, r->>'collectorNumber' as collector_number,
         r->>'finish' as finish,
         max(h.created_at) filter (
           where h.kind in ('add', 'edit', 'revert')
             and (r->'before' is null or jsonb_typeof(r->'before') = 'null')
             and r->'after' is not null and jsonb_typeof(r->'after') <> 'null'
         ) as raised_at,
         max(h.created_at) filter (where r->'after' is null or jsonb_typeof(r->'after') = 'null') as removed_at
  from collection_history h, jsonb_array_elements(h.rows) r
  where h.rows is not null and ($1::text is null or h.user_id = $1)
  group by 1, 2, 3, 4, 5
), anchors as (
  -- Uploads that can have REPLACED the collection: anything but a pure Add (no ledger entry is a Replace by
  -- construction, the Sync base's rule). One of them after a hand add may have removed the holding without a
  -- ledger entry (editing off), so the add no longer proves the current ownership began there.
  select u.user_id, u.confirmed_at from csv_uploads u
  where u.confirmed_at is not null and ($1::text is null or u.user_id = $1)
    and not exists (
      select 1 from collection_history h
      where h.user_id = u.user_id and h.source = 'csv_uploads:' || u.id::text and h.kind = 'upload_add'
    )
), candidates as (
  select user_id, oracle_id, set_code, collector_number, finish, at, false as exact from from_upload
  union all
  select user_id, oracle_id, set_code, collector_number, finish, raised_at, true
  from from_ledger l
  where raised_at is not null and (removed_at is null or raised_at > removed_at)
    and not exists (select 1 from anchors a where a.user_id = l.user_id and a.confirmed_at > l.raised_at)
), chosen as (
  select distinct on (user_id, oracle_id, set_code, collector_number, finish)
         user_id, oracle_id, set_code, collector_number, finish, at, exact
  from candidates order by user_id, oracle_id, set_code, collector_number, finish, exact desc, at asc
)`;

const JOIN = `
  from chosen c
  join collection_items ci on ci.user_id = c.user_id and ci.oracle_id::text = c.oracle_id and ci.set_code = c.set_code
   and ci.collector_number = c.collector_number and ci.finish = c.finish
  where ci.added_at is null`;

export type BackfillReport = { undated: number; dated: number; exact: number; inexact: number };

export async function backfillAddedAt(db: Pooled, opts: { userId?: string; dryRun?: boolean } = {}): Promise<BackfillReport> {
  const params = [opts.userId ?? null];
  const [{ n: undated }] = (await db.query(
    `select count(*)::int as n from collection_items where added_at is null and ($1::text is null or user_id = $1)`, params,
  )).rows as { n: number }[];
  if (opts.dryRun) {
    const [r] = (await db.query(
      `${CHOSEN} select count(*)::int as dated, count(*) filter (where c.exact)::int as exact ${JOIN}`, params,
    )).rows as { dated: number; exact: number }[];
    return { undated, dated: r.dated, exact: r.exact, inexact: r.dated - r.exact };
  }
  // ONE ACCOUNT PER TRANSACTION, under the per-user advisory lock both collection writers take
  // (`hashtextextended(user, 0)`). Without it a Replace could read a holding undated, let this commit its
  // date, then delete and reinsert its earlier snapshot, and the date would be lost with both succeeding.
  const users = ((await db.query(
    `select distinct user_id from collection_items where added_at is null and ($1::text is null or user_id = $1) order by user_id`, params,
  )).rows as { user_id: string }[]).map((r) => r.user_id);
  let dated = 0;
  let exact = 0;
  for (const userId of users) {
    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [userId]);
      const r = (await client.query(
        `${CHOSEN}, done as (
           update collection_items ci set added_at = c.at, added_exact = c.exact
           from chosen c
           where ci.user_id = c.user_id and ci.oracle_id::text = c.oracle_id and ci.set_code = c.set_code
             and ci.collector_number = c.collector_number and ci.finish = c.finish and ci.added_at is null
           returning c.exact
         ) select count(*)::int as dated, count(*) filter (where exact)::int as exact from done`, [userId],
      )).rows[0] as { dated: number; exact: number };
      await client.query("commit");
      dated += r.dated;
      exact += r.exact;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  return { undated, dated, exact, inexact: dated - exact };
}
