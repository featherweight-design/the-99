/**
 * The price-drop writer (menu and Home G2; plan `2026-10-22-menu-home.md`, "The feed model"). Run by the price job
 * (`scripts/seed-prices.ts`) AFTER its transaction commits and OUTSIDE the `catalog-ingest` lock, non-fatally: a
 * failure here is logged and never changes the ingest's exit code.
 *
 * One run, in order:
 * 1. BACKFILL: a wishlist line with no `price_at_add_cents` (older than the column, or added while its card had no
 *    live price) takes today's cheapest as its baseline. A line backfilled today cannot drop today.
 * 2. Only readers whose `price-drop` kind is ON are read (`feed_kinds`), and only their unmet lines (a line the
 *    collection reaches is collected, as every wishlist read leaves it out).
 * 3. Each reader's switches are resolved (one overrides snapshot for the run): the kind needs the feed and the
 *    wishlist (`availableFeedKinds`), as the read does.
 * 4. Today's cheapest is the figure every buy tag draws (`loadPrices`, `priceState`, `priceOf`), never a second rule.
 * 5. `priceDropped` decides; a drop is one `recordFeedItem` (dedupe: card and ISO week) and `price_noticed_at`, in
 *    one transaction.
 *
 * `wishlist_items` carries the `user_data_touch` trigger, so a baseline or a notice moves the reader's stamp once:
 * Home's cache misses that one visit, which also draws the new item.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { collectionItems, userPrefs, wishlistItems } from "../../db/schema";
import { cheapestNow, loadPrices } from "../decks/price-query";
import { resolveEnv } from "../switches/resolve";
import { readSwitchSnapshot } from "../switches/snapshot";
import { availableFeedKinds } from "./flag";
import { priceDropKey, priceDropped } from "./price-drop-rule";
import { recordFeedItem } from "./write";

/** The lines that still need a baseline, every reader's: a kind turned on later must find one waiting. */
export function baselineMissingQuery() {
  return sql`select distinct wi.oracle_id as oracle_id from ${wishlistItems} wi where wi.price_at_add_cents is null`;
}

/** Fills the baselines named, only where still empty, so a line written meanwhile by an add keeps its own. */
export function backfillQuery(ids: readonly string[], cents: readonly number[]) {
  return sql`update ${wishlistItems} wi set price_at_add_cents = v.cents
    from unnest(${sql.param([...ids])}::uuid[], ${sql.param([...cents])}::int[]) as v(oracle_id, cents)
    where wi.oracle_id = v.oracle_id and wi.price_at_add_cents is null`;
}

/** Every unmet, baselined line of every reader whose price-drop kind is on. */
export function priceDropCandidatesQuery() {
  return sql`select wi.user_id as user_id, wi.oracle_id as oracle_id, wi.price_at_add_cents as at_add_cents,
      wi.price_noticed_at as noticed_at
    from ${wishlistItems} wi
    join ${userPrefs} up on up.user_id = wi.user_id
    where (up.feed_kinds ->> 'price-drop') is not null
      and wi.price_at_add_cents is not null
      and coalesce((select sum(ci.quantity) from ${collectionItems} ci
                    where ci.user_id = wi.user_id and ci.oracle_id = wi.oracle_id), 0) < wi.quantity
    order by wi.user_id, wi.oracle_id`;
}

export type PriceDropRun = { backfilled: number; candidates: number; switchedOff: number; noticed: number; failed: number };

type Candidate = { user_id: string; oracle_id: string; at_add_cents: number; noticed_at: Date | string | null };

/**
 * One run of the writer. `base` is the environment the job runs under (the script passes `process.env`); each
 * reader's switches are resolved on top of it.
 */
export async function noticePriceDrops(base: NodeJS.ProcessEnv, now: Date = new Date()): Promise<PriceDropRun> {
  const run: PriceDropRun = { backfilled: 0, candidates: 0, switchedOff: 0, noticed: 0, failed: 0 };

  const missing = (await db.execute<{ oracle_id: string }>(baselineMissingQuery())).rows.map((r) => r.oracle_id);
  if (missing.length > 0) {
    const read = await loadPrices(missing);
    const ids: string[] = [];
    const cents: number[] = [];
    for (const id of missing) {
      const c = cheapestNow(read, id);
      if (c !== null) { ids.push(id); cents.push(c); }
    }
    if (ids.length > 0) run.backfilled = (await db.execute(backfillQuery(ids, cents))).rowCount ?? 0;
  }

  const rows = (await db.execute<Candidate>(priceDropCandidatesQuery())).rows;
  if (rows.length === 0) return run;
  const snapshot = await readSwitchSnapshot();
  const on = new Map<string, boolean>();
  for (const r of rows) {
    if (!on.has(r.user_id)) on.set(r.user_id, availableFeedKinds(resolveEnv(base, snapshot, r.user_id)).includes("price-drop"));
  }
  const live = rows.filter((r) => on.get(r.user_id));
  run.switchedOff = rows.length - live.length;
  run.candidates = live.length;
  if (live.length === 0) return run;

  const read = await loadPrices([...new Set(live.map((r) => r.oracle_id))]);
  for (const r of live) {
    const nowCents = cheapestNow(read, r.oracle_id);
    const noticedAt = r.noticed_at === null ? null : new Date(r.noticed_at);
    if (!priceDropped({ atAddCents: r.at_add_cents, nowCents, noticedAt, now })) continue;
    try {
      const wrote = await db.transaction(async (tx) => {
        const written = await recordFeedItem(tx, {
          userId: r.user_id,
          kind: "price-drop",
          dedupeKey: priceDropKey(r.oracle_id, now),
          oracleId: r.oracle_id,
          data: { fromCents: r.at_add_cents, toCents: nowCents },
          now,
        });
        // Only a notice that reached the feed starts the week: a kind turned off mid-run, or this week's item
        // already written, leaves the line as it was.
        if (written) {
          await tx.execute(sql`update ${wishlistItems} wi set price_noticed_at = ${now.toISOString()}::timestamptz
            where wi.user_id = ${r.user_id} and wi.oracle_id = ${r.oracle_id}`);
        }
        return written;
      });
      if (wrote) run.noticed += 1;
    } catch (error) {
      run.failed += 1;
      console.error(`price drop for ${r.oracle_id} could not be recorded`, error);
    }
  }
  return run;
}
