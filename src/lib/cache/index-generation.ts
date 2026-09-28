/**
 * Which commander index a cached deck mix was derived from.
 *
 * A mix is five integers resolved down the basis chain, and every rung of that chain reads
 * `commander_support` or `identity_composition` — both written by the monthly `Commander
 * index` job. `cacheForUser` already carries the CATALOG generation, and that is a different
 * stamp. An index rebuild does stamp `catalog_refreshes` (`build-commander-index.ts`), but only
 * at its END, and a catalog copy carries staging's `computed_at` across. This generation is read
 * off the index itself, so an entry built before a rebuild or a copy is never served after it for
 * the cache's one-hour ceiling as the deck's current comparison.
 *
 * The window is small and the event is rare — an hour, once a month. It is worth closing
 * anyway because of WHICH hour: the first index run that writes role averages flips every
 * deck in the app from an asserted baseline to a measured one, and that is the single moment
 * this feature exists for. Serving the old figure through it, on the page that explains what
 * changed, is the worst hour of the month to be stale in.
 *
 * Everything below mirrors `catalog-generation.ts` deliberately, including the reasons — the
 * zone-free timestamp, the 60-second cache, the fallback that fails toward the old behaviour
 * rather than throwing, and the memoised wrapper built on first use rather than at module
 * scope. `generationKey` is imported rather than re-derived.
 */
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "../../db";
import { generationKey } from "./catalog-generation";

/** Used when the stamp cannot be read, and when no index run has ever completed. */
const UNSTAMPED = "0";

/**
 * The read itself, uncached and exported — same reason as its catalog twin: `unstable_cache`
 * raises outside a request, so a script reaching for this answer must not have to rewrite
 * the query to get it.
 *
 * THE COMPLETE SET, enumerated from the loader rather than named one at a time.
 * `loadSkeletonForCommanders` makes exactly four reads — `loadPairRow`, `loadCommanderRow`,
 * `loadCompositionRow` and `loadStaples` — so these are its four tables and there is no
 * fifth:
 *
 *   commander_support        timestamp + role count
 *   commander_pair_support   timestamp + role count
 *   identity_composition     timestamp
 *   format_staples           NO TIMESTAMP COLUMN EXISTS, so its own figures are the
 *                            observable: a row count and the sum of `commanders`.
 *
 * `format_staples` nearly got a one-line proxy instead — `db:build:staples` writes it and
 * `identity_composition` in the same transaction, so that timestamp looked like enough.
 * **It is not, and the publish says so in its own comment.** The staples delete-and-insert
 * is unconditional; the composition one is guarded by `if (compRows.length > 0)`, because
 * an empty composition is a LEGITIMATE state — no commander carries one until the first
 * widened index run. So a run in that state replaces every staple row and leaves the
 * composition timestamp exactly where it was, which is precisely when a proxy has to hold
 * and precisely when it does not.
 *
 * The sum is not a checksum and is not trying to be. It moves when any commander count
 * moves, which is what a re-derivation does; two different derivations summing alike would
 * need to be the same size AND offset against each other, and that run rides an index the
 * timestamps above already observe.
 *
 * They move on different schedules — the index job rebuilds the first two, `db:build:staples`
 * replaces the third and fourth, and it can be dispatched alone.
 *
 * The sharper problem is that **the role write carries no timestamp at all.**
 * `deriveAndWriteRoleTargets` sets `avg_ramp`/`avg_draw`/`avg_removal`/`avg_wipes` and does
 * not touch `computed_at` — deliberately, because `computed_at >= runStartedAt` is the index
 * run's own ownership record and moving it in a later pass would corrupt that. So a token
 * built from `max(computed_at)` alone would sit still through the single event this module
 * exists for: the first run that writes role averages and flips every deck in the app from
 * an asserted baseline to a measured one.
 *
 * The role COUNTS close that. They go 0 to ~3,279 at the flip and move on any later
 * re-derivation that reaches a different number of commanders, which is every one that
 * matters. Not a checksum — two derivations covering the same commanders with different
 * figures read alike — and the timestamps carry those, since a re-derivation is part of an
 * index run that stamps them.
 *
 * Epoch millis computed in SQL, because the columns carry no zone and a `Date` built from
 * their rendering takes the reading host's clock with it.
 */
export async function readIndexGeneration(): Promise<string> {
  try {
    const [row] = await db.select({
      support: sql<string | null>`(select (extract(epoch from max(computed_at)) * 1000)::bigint from commander_support)`,
      pair: sql<string | null>`(select (extract(epoch from max(computed_at)) * 1000)::bigint from commander_pair_support)`,
      identity: sql<string | null>`(select (extract(epoch from max(computed_at)) * 1000)::bigint from identity_composition)`,
      staples: sql<string | null>`(select count(*) from format_staples)`,
      staplesWeight: sql<string | null>`(select coalesce(sum(commanders), 0) from format_staples)`,
      supportRoles: sql<string | null>`(select count(*) from commander_support where avg_ramp is not null)`,
      pairRoles: sql<string | null>`(select count(*) from commander_pair_support where avg_ramp is not null)`,
    }).from(sql`(select 1) as _`);

    const parts = [
      generationKey(row?.support),
      generationKey(row?.pair),
      generationKey(row?.identity),
      generationKey(row?.staples),
      generationKey(row?.staplesWeight),
      generationKey(row?.supportRoles),
      generationKey(row?.pairRoles),
    ];
    // All of them unstamped is the same answer the whole token gives when nothing has been
    // built, so it collapses to the constant rather than to "0.0.0.0" — one spelling for
    // one state.
    return parts.every((p) => p === UNSTAMPED) ? UNSTAMPED : parts.join(".");
  } catch {
    return UNSTAMPED;
  }
}

let cached: (() => Promise<string>) | null = null;

export async function indexGeneration(): Promise<string> {
  try {
    cached ??= unstable_cache(readIndexGeneration, ["index-generation"], { revalidate: 60 });
    return await cached();
  } catch {
    return UNSTAMPED;
  }
}
