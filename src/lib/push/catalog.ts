/**
 * The catalog kinds' outbox rows (plan `2026-10-22-push.md`, D2 as amended; PR 3c). A new set or precon has no per-reader
 * row: Home reads it from `catalog_first_seen` at read time. So the CRON flush, never the ingest (which holds the
 * `catalog-ingest` lock), computes each subscribed reader's arrivals itself and queues one `push_outbox` row per arrival,
 * and the per-device machinery (held hours, collapse, landing, done-tracking, pruning) delivers them like any other row.
 *
 * An arrival is queued for a reader with a device, whose PUSH kind is on (`pushKindEnabledAt`) and available under their
 * switches (`catalogPushKinds`), when the feed lists it (`catalogBranch`: not the baseline, released, a release-type set or a
 * precon with no twin), its moment is newer than the kind's push stamp, and it is younger than the flush's stale window.
 * The unique index (user, kind, item key) makes every later run free; the row's `created_at` is the item's own moment, so
 * the stamp, the stale window and a device's subscribe time are judged on the event, as for a stored kind.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { pushOutbox, pushSubscriptions, userPrefs } from "../../db/schema";
import { catalogBranch, type CatalogGate } from "../feed/read";
import { CATALOG_KINDS, type CatalogKind } from "../feed/kinds";
import { catalogBatchKey, catalogPushKinds, parseCatalogKey } from "./catalog-rule";
import { pushKindEnabledAt } from "./kind-gate";

type Q = Pick<typeof db, "execute">;

/** The readers to look at: a device and a catalog kind's push ticked (switches are judged per reader after). */
export function catalogReadersQuery(): SQL {
  const ticked = sql.join(CATALOG_KINDS.map((k) => sql`(cup.push_kinds ->> ${k}::text) is not null`), sql` or `);
  return sql`select distinct cps.user_id as user_id
    from ${pushSubscriptions} cps
    join ${userPrefs} cup on cup.user_id = cps.user_id
    where ${ticked}`;
}

/** Newer than the kind's push stamp, inside the stale window and not after `now`. */
const pushGate = (kind: CatalogKind, now: Date, staleMs: number): CatalogGate => ({ moment, prefs }) =>
  sql`${moment} > ${pushKindEnabledAt(prefs, sql`${kind}::text`)}
    and ${moment} > ${new Date(now.getTime() - staleMs).toISOString()}::timestamptz
    and ${moment} <= ${now.toISOString()}::timestamptz`;

/** One reader's arrivals of one kind, queued; nothing on a repeat. Returns the ids it wrote. */
export function enqueueCatalogQuery(userId: string, kind: CatalogKind, now: Date, staleMs: number): SQL {
  return sql`insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
    select ${userId}, f.kind, f.key, ${catalogBatchKey(kind, now)}, '{}'::jsonb, f.created_at
    from (${catalogBranch(kind, userId, now, pushGate(kind, now, staleMs))}) f
    where exists (select 1 from ${pushSubscriptions} qps where qps.user_id = ${userId})
    on conflict (user_id, kind, item_key) do nothing
    returning id`;
}

/**
 * The catalog items these keys name, with the feed's columns, under the feed's arrival rules (no stamp: the flush judges it
 * per row with `stillWanted`). A key that names nothing the feed would list comes back absent, and the row is dropped as gone.
 */
export function catalogItemsByKeyQuery(userId: string, refs: readonly { kind: CatalogKind; key: string }[], now: Date): SQL | null {
  const branches: SQL[] = [];
  for (const kind of CATALOG_KINDS) {
    const ids = [...new Set(refs.flatMap((r) => (r.kind === kind ? [parseCatalogKey(kind, r.key)] : [])).filter((x): x is string => x !== null))];
    if (ids.length === 0) continue;
    branches.push(catalogBranch(kind, userId, now, ({ id }) => sql`${id} = any(${sql.param(ids)}::text[])`));
  }
  if (branches.length === 0) return null;
  return sql`select f.kind, f.key, f.created_at, f.code, f.name, f.file_name, f.oracle_id, f.variant_id,
      f.friend_public_id, f.friend_name, f.data, false as unseen
    from (${sql.join(branches, sql` union all `)}) f`;
}

export type CatalogEnqueueDeps = {
  now: Date;
  /** The flush's stale window: an arrival older than this is no longer news and is never queued. */
  staleMs: number;
  resolveEnv: (userId: string) => Promise<NodeJS.ProcessEnv>;
  q?: Q;
};

/**
 * Queues every subscribed reader's catalog arrivals. One reader failing (a strict switch read) leaves theirs for the next
 * run and never stops the others. Counts only.
 */
export async function enqueueCatalogArrivals(deps: CatalogEnqueueDeps): Promise<{ queued: number; failed: number }> {
  const q = deps.q ?? db;
  const { rows } = await q.execute<{ user_id: string }>(catalogReadersQuery());
  let queued = 0;
  let failed = 0;
  for (const { user_id: userId } of rows as { user_id: string }[]) {
    try {
      const kinds = catalogPushKinds(await deps.resolveEnv(userId));
      for (const kind of kinds) {
        const written = await q.execute<{ id: string }>(enqueueCatalogQuery(userId, kind, deps.now, deps.staleMs));
        queued += written.rows.length;
      }
    } catch {
      failed += 1;
    }
  }
  if (failed > 0) console.error(`[push-flush] ${failed} reader(s)' catalog arrivals were not queued`);
  return { queued, failed };
}
