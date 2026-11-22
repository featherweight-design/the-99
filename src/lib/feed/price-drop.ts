/**
 * The price-drop writer (menu and Home G2; plan `2026-10-22-menu-home.md`, "The feed model"). Run by the price job
 * (`scripts/seed-prices.ts`) AFTER its transaction commits and OUTSIDE the `catalog-ingest` lock, non-fatally: a
 * failure here is logged and never changes the ingest's exit code.
 *
 * One run, in order:
 * 1. BASELINES: a wishlist line with no `price_at_add_cents` (older than the column, or added while its card had no
 *    live price) takes today's cheapest as its baseline, or its chosen printing's price when the line names one. A
 *    line backfilled today cannot drop today. Every figure is read in the reader's store (store preference, design
 *    #3200: `storeOf`, their `STORE_PREFERENCE_ENABLED` and `preferred_store`), and the line records it
 *    (`price_store`, null for a Mana Pool baseline older than the column). A line whose baseline is another store's
 *    is RE-BASELINED in the reader's store and its notice cleared, so changing store never reads as a drop. A store
 *    with no live figure for the card leaves the baseline empty, for a later run to fill.
 * 2. Only readers whose `price-drop` kind is ON are read (`feed_kinds`), and only their unmet lines (a line the
 *    collection reaches is collected, as every wishlist read leaves it out).
 * 3. Each reader's switches are resolved (one overrides snapshot for the run): the kind needs the feed and the
 *    wishlist (`availableFeedKinds`), as the read does.
 * 4. Today's cheapest is the figure every buy tag draws (`loadPrices`, `priceState`, `priceOf`), never a second rule;
 *    a line that names a printing watches THAT printing's figure (`lineNowCents`), and has none while it is sold out.
 *    It is read in the reader's store, and a line whose baseline is not in that store (the reader changed store after
 *    step 1 read their choice) is skipped: two stores' figures are never compared.
 * 5. `priceDropped` decides; a drop is one `recordFeedItem` (dedupe: card and ISO week) and `price_noticed_at`, in
 *    one transaction. The item records its store (`data.store`), and the feed and the push show it only while it is
 *    the reader's (`storedFeedBranch`).
 *
 * `wishlist_items` carries the `user_data_touch` trigger, so a baseline or a notice moves the reader's stamp once:
 * Home's cache misses that one visit, which also draws the new item.
 */
import { newBatchKey } from "../push/enqueue";
import { feedOrPushWanted } from "../push/kind-gate";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs, wishlistItems } from "../../db/schema";
import type { Store } from "../stores/rows";
import { storeOf } from "../stores/preference";
import { cheapestNow, loadPrices, type PriceRead } from "../decks/price-query";
import { priceOf, priceState } from "../decks/price";
import { heldCopies } from "../wishlist/held";
import { resolveEnv } from "../flags/resolve";
import { readSwitchSnapshot } from "../flags/snapshot";
import { availableFeedKinds } from "./flag";
import { priceDropKey, priceDropped } from "./price-drop-rule";
import { lastFeedItemAt, recordFeedItem } from "../social/feed-write";

/** The lines that may need a baseline, every reader's (a kind turned on later must find one waiting): those with none,
    and any line that is, or whose reader's choice is, another store than Mana Pool. Which of them need one is decided
    per reader, by their resolved store (`needsBaseline`); with no reader choosing a store this is the empty lines alone. */
export function baselineCandidatesQuery() {
  return sql`select wi.user_id as user_id, wi.oracle_id as oracle_id, wi.scryfall_id as scryfall_id,
      wi.price_at_add_cents is null as missing, coalesce(wi.price_store, 'manapool') as price_store,
      up.preferred_store as preferred_store
    from ${wishlistItems} wi
    left join ${userPrefs} up on up.user_id = wi.user_id
    where wi.price_at_add_cents is null
      or coalesce(wi.price_store, 'manapool') <> 'manapool'
      or coalesce(up.preferred_store, 'manapool') <> 'manapool'`;
}

type BaselineRow = { user_id: string; oracle_id: string; scryfall_id: string | null; missing: boolean; price_store: string; preferred_store: string | null };

/** Whether a line needs a baseline in `store`: it has none, or the one it has is another store's. */
export function needsBaseline(line: { missing: boolean; price_store: string }, store: Store): boolean {
  return line.missing || line.price_store !== store;
}

/**
 * Writes the baselines named, each in its reader's store, one line apiece (a reader, a card, a chosen printing:
 * `is not distinct from`, null names "any printing"). Only where the line still needs it, so a line an add wrote
 * meanwhile in that same store keeps its own. A line moving store also loses its notice stamp, so its first drop in
 * the new store can be told; a line merely filled keeps it. `cents` is null for a line moving to a store with no
 * live figure for it: emptied, the next run fills it. `preferred` is each reader's `preferred_store` as the run read
 * it: a reader who changed store since (and may have added a line in the new one) is left for the next run, never
 * written in the store the old choice named.
 */
export function baselineQuery(
  userIds: readonly string[], ids: readonly string[], printingIds: readonly (string | null)[],
  cents: readonly (number | null)[], stores: readonly Store[], preferred: readonly (string | null)[],
) {
  return sql`update ${wishlistItems} wi set price_at_add_cents = v.cents, price_store = v.store,
      price_noticed_at = case when coalesce(wi.price_store, 'manapool') = v.store then wi.price_noticed_at end
    from unnest(${sql.param([...userIds])}::text[], ${sql.param([...ids])}::uuid[], ${sql.param([...printingIds])}::uuid[],
      ${sql.param([...cents])}::int[], ${sql.param([...stores])}::text[], ${sql.param([...preferred])}::text[])
      as v(user_id, oracle_id, scryfall_id, cents, store, preferred)
    where wi.user_id = v.user_id and wi.oracle_id = v.oracle_id and wi.scryfall_id is not distinct from v.scryfall_id
      and (wi.price_at_add_cents is null or coalesce(wi.price_store, 'manapool') <> v.store)
      and (select bp.preferred_store from ${userPrefs} bp where bp.user_id = wi.user_id) is not distinct from v.preferred`;
}

/** One `loadPrices` per store, over the lines priced in it. Mana Pool alone while nobody has chosen a store. */
async function pricesByStore<L extends { oracle_id: string; scryfall_id: string | null }>(lines: readonly { line: L; store: Store }[]) {
  const reads = new Map<Store, PriceRead>();
  for (const store of new Set(lines.map((l) => l.store))) {
    const mine = lines.filter((l) => l.store === store).map((l) => l.line);
    reads.set(store, await loadPrices([...new Set(mine.map((m) => m.oracle_id))], [], mine.flatMap((m) => (m.scryfall_id ? [m.scryfall_id] : [])), store));
  }
  return reads;
}

/** Every unmet, baselined line of every reader who wants price-drop news: the feed kind on, or a device with its push on. */
export function priceDropCandidatesQuery() {
  return sql`select wi.user_id as user_id, wi.oracle_id as oracle_id, wi.scryfall_id as scryfall_id,
      wi.price_at_add_cents as at_add_cents, wi.price_noticed_at as noticed_at,
      coalesce(wi.price_store, 'manapool') as price_store, up.preferred_store as preferred_store,
      pr.set_code as set_code, pr.collector_number as collector_number
    from ${wishlistItems} wi
    join ${userPrefs} up on up.user_id = wi.user_id
    left join printings pr on pr.scryfall_id = wi.scryfall_id
    where ${feedOrPushWanted(sql`up`, sql`wi.user_id`, "price-drop")}
      and wi.price_at_add_cents is not null
      and ${heldCopies(sql`wi.user_id`, sql`wi.oracle_id`, sql`wi.scryfall_id`)} < wi.quantity
    order by wi.user_id, wi.oracle_id`;
}

/** One line as it stands now, row-locked: its baseline and its store, chosen printing and stamp, and whether the collection still
    leaves it unmet (as the line counts it: only the chosen printing's copies when it names one). */
export function currentLineQuery(userId: string, oracleId: string) {
  return sql`select wi.price_at_add_cents as at_add_cents, coalesce(wi.price_store, 'manapool') as price_store,
      wi.scryfall_id as scryfall_id, wi.price_noticed_at as noticed_at,
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

/** `backfilled` counts every baseline written (a fill, or a move to the reader's store); `awaiting`, the lines whose
    store has no live figure for them (kept or left empty, so no drop is judged); `otherStore`, the baselined lines
    skipped because their baseline is still another store's (the reader changed store after this run's first step). */
export type PriceDropRun = { backfilled: number; awaiting: number; candidates: number; switchedOff: number; otherStore: number; noticed: number; failed: number };

type Candidate = {
  user_id: string; oracle_id: string; scryfall_id: string | null; at_add_cents: number; noticed_at: Date | string | null;
  price_store: string; preferred_store: string | null; set_code: string | null; collector_number: string | null;
};

/**
 * One run of the writer. `base` is the environment the job runs under (the script passes `process.env`); each
 * reader's switches are resolved on top of it.
 */
export async function noticePriceDrops(base: NodeJS.ProcessEnv, clock: () => Date = () => new Date()): Promise<PriceDropRun> {
  const run: PriceDropRun = { backfilled: 0, awaiting: 0, candidates: 0, switchedOff: 0, otherStore: 0, noticed: 0, failed: 0 };
  // One overrides snapshot for the run; each reader's switches resolved once on top of `base`.
  let snapshot: Awaited<ReturnType<typeof readSwitchSnapshot>> | null = null;
  const envs = new Map<string, NodeJS.ProcessEnv>();
  const envOf = async (userId: string) => {
    snapshot ??= await readSwitchSnapshot();
    let env = envs.get(userId);
    if (!env) envs.set(userId, (env = resolveEnv(base, snapshot, userId)));
    return env;
  };

  const lines = (await db.execute<BaselineRow>(baselineCandidatesQuery())).rows;
  const due: { line: BaselineRow; store: Store }[] = [];
  for (const line of lines) {
    const store = storeOf(await envOf(line.user_id), line.preferred_store);
    if (needsBaseline(line, store)) due.push({ line, store });
  }
  if (due.length > 0) {
    const reads = await pricesByStore(due);
    const userIds: string[] = [];
    const ids: string[] = [];
    const printingIds: (string | null)[] = [];
    const cents: (number | null)[] = [];
    const stores: Store[] = [];
    const preferred: (string | null)[] = [];
    for (const { line, store } of due) {
      const c = lineNowCents(reads.get(store)!, line);
      if (c === null) run.awaiting += 1;
      // An empty line with no figure stays empty; a line in another store is emptied, never left in that store.
      if (c === null && line.missing) continue;
      userIds.push(line.user_id); ids.push(line.oracle_id); printingIds.push(line.scryfall_id); cents.push(c); stores.push(store);
      preferred.push(line.preferred_store);
    }
    if (ids.length > 0) run.backfilled = (await db.execute(baselineQuery(userIds, ids, printingIds, cents, stores, preferred))).rowCount ?? 0;
  }

  const rows = (await db.execute<Candidate>(priceDropCandidatesQuery())).rows;
  if (rows.length === 0) return run;
  const live: { line: Candidate; store: Store }[] = [];
  for (const r of rows) {
    const env = await envOf(r.user_id);
    if (!availableFeedKinds(env).includes("price-drop")) { run.switchedOff += 1; continue; }
    const store = storeOf(env, r.preferred_store);
    if (r.price_store !== store) { run.otherStore += 1; continue; }
    live.push({ line: r, store });
  }
  run.candidates = live.length;
  if (live.length === 0) return run;

  const reads = await pricesByStore(live);
  // One run, one batch: a reader's drops from this run are one push, whenever in the run each is written.
  const batchKey = newBatchKey("price-drop");
  for (const { line: r, store } of live) {
    const nowCents = lineNowCents(reads.get(store)!, r);
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
        const line = (await tx.execute<{ at_add_cents: number | null; price_store: string; scryfall_id: string | null; noticed_at: Date | string | null; unmet: boolean }>(
          currentLineQuery(r.user_id, r.oracle_id),
        )).rows[0];
        // Gone, met by the collection, re-added since (a different baseline), or another printing chosen since (the
        // figure above is the old one's), or re-baselined in another store since: not this notice's line any more.
        if (!line || !line.unmet || line.at_add_cents !== r.at_add_cents || line.scryfall_id !== r.scryfall_id || line.price_store !== store) return false;
        // The cooldown outlives the line: a want removed and added again starts with no stamp, but the feed remembers.
        const told = await lastFeedItemAt(tx, r.user_id, "price-drop", r.oracle_id, store);
        const stamped = line.noticed_at === null ? null : new Date(line.noticed_at);
        const lastNoticed = told && (!stamped || told > stamped) ? told : stamped;
        if (!priceDropped({ atAddCents: line.at_add_cents, nowCents, noticedAt: lastNoticed, now })) return false;
        const written = await recordFeedItem(tx, {
          userId: r.user_id,
          kind: "price-drop",
          dedupeKey: priceDropKey(r.oracle_id, now, store),
          oracleId: r.oracle_id,
          // The printing the line watched, as it was named when the drop was written: the item says "at SLD 2125",
          // and a later change of the choice does not rewrite what was told.
          data: {
            fromCents: r.at_add_cents,
            toCents: nowCents,
            // The store both figures are in: the feed and the push show the drop only while it is the reader's.
            store,
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
