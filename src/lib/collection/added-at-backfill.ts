/**
 * Dates the holdings the column found already there (Date added, PR 1). SERVER/SCRIPT-ONLY, run once per
 * database by `scripts/backfill-added-at.ts`, which names its target by Neon branch.
 *
 * A holding with a null `added_at` takes the EARLIEST of two sources, and says how sure it is:
 *  - the first confirmed upload whose stored file (`pendingItems`, kept forever) holds it. INEXACT when that
 *    is the account's FIRST confirmed upload (the file that filled the collection: every holding of it shares
 *    that day), exact when a later file brought it;
 *  - the earliest hand entry in the ledger that raised it from nothing (`add`, `edit`: Add cards, I got it, a
 *    precon add), always exact. An upload's own entries are `upload_*` kinds (`kindOf`), so an `add` entry is a
 *    hand change by construction and a file's holdings are dated by the upload source above. Ledger entries are kept 90 days, so this only reaches recent ones.
 * A holding in neither stays null: it sorts last and reads as unknown. Only rows with a null `added_at` are
 * touched, so a re-run changes nothing it already settled.
 */
export type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

/** Every holding that would be dated, with its date and exactness. `$1` null = every account. */
const CHOSEN = `
with firsts as (
  select user_id, min(confirmed_at) as t0 from csv_uploads where confirmed_at is not null group by user_id
), from_upload as (
  select u.user_id, pi->>'oracleId' as oracle_id, lower(coalesce(pi->>'setCode', '')) as set_code,
         coalesce(pi->>'collectorNumber', '') as collector_number,
         coalesce(pi->>'finish', case when (pi->>'foil')::boolean then 'foil' else 'nonfoil' end) as finish,
         min(u.confirmed_at) as at
  from csv_uploads u, jsonb_array_elements(u.preview_payload->'pendingItems') pi
  where u.confirmed_at is not null and ($1::text is null or u.user_id = $1)
  group by 1, 2, 3, 4, 5
), from_ledger as (
  select h.user_id, r->>'oracleId' as oracle_id, r->>'setCode' as set_code, r->>'collectorNumber' as collector_number,
         r->>'finish' as finish, min(h.created_at) as at
  from collection_history h, jsonb_array_elements(h.rows) r
  where h.rows is not null and h.kind in ('add', 'edit') and h.reverts_id is null
    and ($1::text is null or h.user_id = $1)
    and (r->'before' is null or jsonb_typeof(r->'before') = 'null')
    and r->'after' is not null and jsonb_typeof(r->'after') <> 'null'
  group by 1, 2, 3, 4, 5
), candidates as (
  select f.user_id, f.oracle_id, f.set_code, f.collector_number, f.finish, f.at, (f.at > t.t0) as exact
  from from_upload f join firsts t using (user_id)
  union all
  select user_id, oracle_id, set_code, collector_number, finish, at, true from from_ledger
), chosen as (
  select distinct on (user_id, oracle_id, set_code, collector_number, finish)
         user_id, oracle_id, set_code, collector_number, finish, at, exact
  from candidates order by user_id, oracle_id, set_code, collector_number, finish, at asc, exact desc
)`;

const JOIN = `
  from chosen c
  join collection_items ci on ci.user_id = c.user_id and ci.oracle_id::text = c.oracle_id and ci.set_code = c.set_code
   and ci.collector_number = c.collector_number and ci.finish = c.finish
  where ci.added_at is null`;

export type BackfillReport = { undated: number; dated: number; exact: number; inexact: number };

export async function backfillAddedAt(db: Queryable, opts: { userId?: string; dryRun?: boolean } = {}): Promise<BackfillReport> {
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
  const r = (await db.query(
    `${CHOSEN}, done as (
       update collection_items ci set added_at = c.at, added_exact = c.exact
       from chosen c
       where ci.user_id = c.user_id and ci.oracle_id::text = c.oracle_id and ci.set_code = c.set_code
         and ci.collector_number = c.collector_number and ci.finish = c.finish and ci.added_at is null
       returning c.exact
     ) select count(*)::int as dated, count(*) filter (where exact)::int as exact from done`, params,
  )).rows[0] as { dated: number; exact: number };
  return { undated, dated: r.dated, exact: r.exact, inexact: r.dated - r.exact };
}
