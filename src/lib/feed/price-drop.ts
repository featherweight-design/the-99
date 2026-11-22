/**
 * The price-drop writer (menu and Home G2; plan `2026-10-22-menu-home.md`, "The feed model"). Run by the price job
 * (`scripts/seed-prices.ts`) AFTER its transaction commits and OUTSIDE the `catalog-ingest` lock, non-fatally: a
 * failure here is logged and never changes the ingest's exit code.
 *
 * One run, in order:
 * 1. BACKFILL: a wishlist line with no `price_at_add_cents` (older than the column, or added while its card had no
 *    live price) takes today's cheapest as its baseline, or its chosen printing's price when the line names one. A
 *    line backfilled today cannot drop today.
 * 2. Only readers whose `price-drop` kind is ON are read (`feed_kinds`), and only their unmet lines (a line the
 *    collection reaches is collected, as every wishlist read leaves it out).
 * 3. Each reader's switches are resolved (one overrides snapshot for the run): the kind needs the feed and the
 *    wishlist (`availableFeedKinds`), as the read does.
 * 4. Today's cheapest is the figure every buy tag draws (`loadPrices`, `priceState`, `priceOf`), never a second rule;
 *    a line that names a printing watches THAT printing's figure (`lineNowCents`), and has none while it is sold out.
 * 5. `priceDropped` decides; a drop is one `recordFeedItem` (dedupe: card and ISO week) and `price_noticed_at`, in
 *    one transaction.
 *
 * `wishlist_items` carries the `user_data_touch` trigger, so a baseline or a notice moves the reader's stamp once:
 * Home's cache misses that one visit, which also draws the new item.
 */
import { newBatchKey } from "../push/enqueue";
import { feedOrPushWanted } from "../push/kind-gate";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs, wishlistItems } from "../../db/schema";
import { cheapestNow, loadPrices, type PriceRead } from "../decks/price-query";
import { priceOf, priceState } from "../decks/price";
import { heldCopies } from "../wishlist/held";
import { resolveEnv } from "../flags/resolve";
import { readSwitchSnapshot } from "../flags/snapshot";
import { availableFeedKinds } from "./flag";
import { priceDropKey, priceDropped } from "./price-drop-rule";
import { lastFeedItemAt, recordFeedItem } from "../social/feed-write";

/** The lines that still need a baseline, every reader's: a kind turned on later must find one waiting. One row per
    card and chosen printing (null: any printing), because the two are priced differently. */
export function baselineMissingQuery() {
  return sql`select distinct wi.oracle_id as oracle_id, wi.scryfall_id as scryfall_id
    from ${wishlistItems} wi where wi.price_at_add_cents is null`;
}

/** Fills the baselines named, only where still empty, so a line written meanwhile by an add keeps its own. A line is
    matched by its card AND its chosen printing (`is not distinct from`: null names "any printing"). */
export function backfillQuery(ids: readonly string[], printingIds: readonly (string | null)[], cents: readonly number[]) {
  return sql`update ${wishlistItems} wi set price_at_add_cents = v.cents
    from unnest(${sql.param([...ids])}::uuid[], ${sql.param([...printingIds])}::uuid[], ${sql.param([...cents])}::int[]) as v(oracle_id, scryfall_id, cents)
    where wi.oracle_id = v.oracle_id and wi.scryfall_id is not distinct from v.scryfall_id and wi.price_at_add_cents is null`;
}

/** Every unmet, baselined line of every reader who wants price-drop news: the feed kind on, or a device with its push on. */
export function priceDropCandidatesQuery() {
  return sql`select wi.user_id as user_id, wi.oracle_id as oracle_id, wi.scryfall_id as scryfall_id,
      wi.price_at_add_cents as at_add_cents, wi.price_noticed_at as noticed_at,
      pr.set_code as set_code, pr.collector_number as collector_number
    from ${wishlistItems} wi
    join ${userPrefs} up on up.user_id = wi.user_id
    left join printings pr on pr.scryfall_id = wi.scryfall_id
    where ${feedOrPushWanted(sql`up`, sql`wi.user_id`, "price-drop")}
      and wi.price_at_add_cents is not null
      and ${heldCopies(sql`wi.user_id`, sql`wi.oracle_id`, sql`wi.scryfall_id`)} < wi.quantity
    order by wi.user_id, wi.oracle_id`;
}

/** One line as it stands now, row-locked: its baseline, chosen printing and stamp, and whether the collection still
    leaves it unmet (as the line counts it: only the chosen printing's copies when it names one). */
export function currentLineQuery(userId: string, oracleId: string) {
  return sql`select wi.price_at_add_cents as at_add_cents, wi.scryfall_id as scryfall_id, wi.price_noticed_at as noticed_at,
      ${heldCopies(sql`wi.user_id`, sql`wi.oracle_id`, sql`wi.scryfall_id`)} < wi.quantity as unmet
    from ${wishlistItems} wi where wi.user_id = ${userId} and wi.oracle_id = ${oracleId} for update`;
}

/**
 * The figure a line watches now, in cents: its chosen printing's own price when it names one (null while that
 * printing is sold out or unpriced, so no alert fires), else the card's cheapest. The same `priceState` and `priceOf`
 * every buy tag draws.
 */
export function lineNowCents(read: PriceRead, line: { oracle_id: string; scryfall_id: string | null }): number | null {
  if (!line.scryfall_id) return cheapestNow(read, line.oracle_id);
  const fact = read.named?.get(line.scryfall_id);
  return fact ? priceOf(fact, priceState(fact, read.newestAsOf)) : null;
}

export type PriceDropRun = { backfilled: number; candidates: number; switchedOff: number; noticed: number; failed: number };

type Candidate = { user_id: string; oracle_id: string; scryfall_id: string | null; at_add_cents: number; noticed_at: Date | string | null; set_code: string | null; collector_number: string | null };

/**
 * One run of the writer. `base` is the environment the job runs under (the script passes `process.env`); each
 * reader's switches are resolved on top of it.
 */
export async function noticePriceDrops(base: NodeJS.ProcessEnv, clock: () => Date = () => new Date()): Promise<PriceDropRun> {
  const run: PriceDropRun = { backfilled: 0, candidates: 0, switchedOff: 0, noticed: 0, failed: 0 };

  const missing = (await db.execute<{ oracle_id: string; scryfall_id: string | null }>(baselineMissingQuery())).rows;
  if (missing.length > 0) {
    const read = await loadPrices([...new Set(missing.map((m) => m.oracle_id))], [], missing.flatMap((m) => (m.scryfall_id ? [m.scryfall_id] : [])));
    const ids: string[] = [];
    const printingIds: (string | null)[] = [];
    const cents: number[] = [];
    for (const m of missing) {
      const c = lineNowCents(read, m);
      if (c !== null) { ids.push(m.oracle_id); printingIds.push(m.scryfall_id); cents.push(c); }
    }
    if (ids.length > 0) run.backfilled = (await db.execute(backfillQuery(ids, printingIds, cents))).rowCount ?? 0;
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

  const read = await loadPrices(
    [...new Set(live.map((r) => r.oracle_id))],
    [],
    live.flatMap((r) => (r.scryfall_id ? [r.scryfall_id] : [])),
  );
  // One run, one batch: a reader's drops from this run are one push, whenever in the run each is written.
  const batchKey = newBatchKey("price-drop");
  for (const r of live) {
    const nowCents = lineNowCents(read, r);
    // The moment of THIS item, read when it is recorded and used for its cooldown, week, timestamp and stamp: a job
    // that runs for a while must not date a late reader's item before a Home visit or a re-enable that came since.
    const now = clock();
    // Cheap first, off the candidate read; the transaction decides again on what is true at the write.
    if (!priceDropped({ atAddCents: r.at_add_cents, nowCents, noticedAt: r.noticed_at === null ? null : new Date(r.noticed_at), now })) continue;
    try {
      const wrote = await db.transaction(async (tx) => {
        // The collection's own per-user lock, then the line: a collection write or a wishlist edit between the read
        // above and here is seen, never stamped over.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${r.user_id}, 0))`);
        const line = (await tx.execute<{ at_add_cents: number | null; scryfall_id: string | null; noticed_at: Date | string | null; unmet: boolean }>(
          currentLineQuery(r.user_id, r.oracle_id),
        )).rows[0];
        // Gone, met by the collection, re-added since (a different baseline), or another printing chosen since (the
        // figure above is the old one's): not this notice's line any more.
        if (!line || !line.unmet || line.at_add_cents !== r.at_add_cents || line.scryfall_id !== r.scryfall_id) return false;
        // The cooldown outlives the line: a want removed and added again starts with no stamp, but the feed remembers.
        const told = await lastFeedItemAt(tx, r.user_id, "price-drop", r.oracle_id);
        const stamped = line.noticed_at === null ? null : new Date(line.noticed_at);
        const lastNoticed = told && (!stamped || told > stamped) ? told : stamped;
        if (!priceDropped({ atAddCents: line.at_add_cents, nowCents, noticedAt: lastNoticed, now })) return false;
        const written = await recordFeedItem(tx, {
          userId: r.user_id,
          kind: "price-drop",
          dedupeKey: priceDropKey(r.oracle_id, now),
          oracleId: r.oracle_id,
          // The printing the line watched, as it was named when the drop was written: the item says "at SLD 2125",
          // and a later change of the choice does not rewrite what was told.
          data: {
            fromCents: r.at_add_cents,
            toCents: nowCents,
            ...(r.set_code !== null && r.collector_number !== null ? { setCode: r.set_code, collectorNumber: r.collector_number } : {}),
          },
          batchKey,
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
