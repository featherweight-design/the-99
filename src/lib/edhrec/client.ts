import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { commanderSupport, edhrecCache } from "../../db/schema";
import { commanderSlug } from "./slug";
import { edhrecPageMissing } from "./missing-page";
import { parseEdhrecPayload, type EdhrecData } from "./parse";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const edhrecUrl = (commanderName: string) =>
  `https://json.edhrec.com/pages/commanders/${commanderSlug(commanderName)}.json`;

// Timeout so a hung EDHREC request falls through to stale/degraded handling
// instead of stalling the recommendations page.
export const edhrecInit = (): RequestInit => ({
  headers: { "User-Agent": "the-99/1.0" },
  signal: AbortSignal.timeout(10_000),
});

export type EdhrecFetchResult = {
  /** Parsed payload when available (fresh, cached, or stale-on-error). */
  data: EdhrecData | null;
  /**
   * True only when EDHREC itself couldn't be reached AND we have no cache
   * to fall back on — i.e. a real service outage that impacts the user.
   * 404/403 responses (commander not indexed on EDHREC) do NOT set this —
   * they're data-shaped absences, not service unreachability.
   */
  unreachable: boolean;
};

export type EdhrecCacheRow = {
  commanderOracleId: string;
  payload: unknown;
  fetchedAt: Date;
  /** When the commander index last fetched this commander (`commander_support.computed_at`),
      or null when the index holds no row for it. */
  indexComputedAt: Date | null;
};

/**
 * True when a cached page is older than the index's own fetch of the same commander, and so
 * describes an EDHREC snapshot the index has since replaced (How it works §5.2, ruled 2026-09-29).
 *
 * The index scores a commander from its own fetch and the live half reads this cache, so without
 * this one commander could show figures from two snapshots up to a month apart. A retired row is
 * not deleted: it is still the stale-on-error fallback when EDHREC cannot be reached.
 *
 * The marker is per commander, and it already lives on both databases: the index build stamps
 * `computed_at` when it writes that commander, and `db:copy:index` carries the column to
 * production exactly. So production knows when ITS index changed for this commander without a
 * ledger row of its own.
 *
 * TWO CLOCKS, and why skew cannot matter. Both stamps are JS `new Date()`: `computed_at` on the
 * index runner (the CI job building staging), `fetched_at` on the app server at the live read.
 * On production the index stamp only arrives with a copy, which runs after a build of hours, so
 * every read that can be compared against it follows that stamp by hours, not seconds. On staging
 * a live read during the build can fall seconds either side of the stamp for that commander, and
 * either answer is a page from the same build window.
 */
export function cacheRowRetired(row: Pick<EdhrecCacheRow, "fetchedAt" | "indexComputedAt">): boolean {
  return row.indexComputedAt != null && row.fetchedAt < row.indexComputedAt;
}

/**
 * One query for many commanders — the fanout would otherwise issue one SELECT each. The index's
 * stamp rides along in the same statement, so the retirement compares a consistent pair: a copy
 * landing between two reads costs at most one extra fetch, and stores nothing to undo.
 */
export function edhrecCacheQuery(oracleIds: string[]) {
  return db
    .select({
      commanderOracleId: edhrecCache.commanderOracleId,
      payload: edhrecCache.payload,
      fetchedAt: edhrecCache.fetchedAt,
      indexComputedAt: commanderSupport.computedAt,
    })
    .from(edhrecCache)
    .leftJoin(commanderSupport, eq(commanderSupport.commanderOracleId, edhrecCache.commanderOracleId))
    .where(inArray(edhrecCache.commanderOracleId, oracleIds));
}

export async function readEdhrecCache(oracleIds: string[]): Promise<Map<string, EdhrecCacheRow>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await edhrecCacheQuery(oracleIds);
  return new Map(rows.map((r) => [r.commanderOracleId, r]));
}

/**
 * Cache-decision + fetch logic, driven by an already-read cache row so callers
 * can bulk-read. `cached` undefined means "no row", not "not looked up".
 */
export async function resolveEdhrecData(
  commanderOracleId: string,
  commanderName: string,
  cached: EdhrecCacheRow | undefined,
): Promise<EdhrecFetchResult> {
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS && !cacheRowRetired(cached)) {
    return { data: parseEdhrecPayload(cached.payload), unreachable: false };
  }

  try {
    const res = await fetch(edhrecUrl(commanderName), edhrecInit());
    // 4xx = this commander isn't on EDHREC (e.g. non-legendary in the candidate
    // pool, name→slug mismatch, novel legendary not yet indexed, or a transient
    // 403/429). That's a per-commander data absence, not a service outage —
    // do not flip degraded. Prefer stale cache when available so a transient
    // 4xx on a previously-cached commander doesn't drop otherwise-good data.
    if (res.status >= 400 && res.status < 500) {
      // Except a RETIRED row EDHREC confirms has no page: the index has since read the commander
      // anew, and serving the older page would put the two snapshots side by side again (§5.2).
      // A throttle or an ambiguous 403 confirms nothing, so it keeps the stale page as before.
      if (cached && !(cacheRowRetired(cached) && (await pageConfirmedMissing(res.status, commanderName)))) {
        return { data: parseEdhrecPayload(cached.payload), unreachable: false };
      }
      return { data: null, unreachable: false };
    }
    if (!res.ok) throw new Error(`edhrec ${res.status}`);
    const payload = await res.json();
    const now = new Date();
    // The write is its own try: a page EDHREC has just answered is the current snapshot whether
    // or not storing it succeeds, and falling through to the catch below would serve the cached
    // row instead, which may be the very page the index retired (§5.2). An unstored page costs
    // one more fetch on the next read, and nothing else.
    try {
      await db.insert(edhrecCache)
        .values({ commanderOracleId, payload, fetchedAt: now })
        .onConflictDoUpdate({
          target: edhrecCache.commanderOracleId,
          set: { payload, fetchedAt: now },
        });
    } catch {
      // not a fallback: the fresh page is still what this read answers with.
    }
    return { data: parseEdhrecPayload(payload), unreachable: false };
  } catch {
    // not a fallback: an unreachable EDHREC is reported as degraded, which no page stores.
    // Network error, timeout, or 5xx. If we have any cache — even stale — the
    // user still gets synergy data, so we're not user-visibly degraded.
    if (cached) return { data: parseEdhrecPayload(cached.payload), unreachable: false };
    return { data: null, unreachable: true };
  }
}

/**
 * Whether a 4xx says the commander has no EDHREC page at all, rather than that EDHREC is
 * throttling: a 404 does, a 403 only when the HTML page is missing too (#712), anything else not.
 * The index's own fetch draws the same line, so the two halves agree on what "absent" means.
 */
async function pageConfirmedMissing(status: number, commanderName: string): Promise<boolean> {
  if (status === 404) return true;
  if (status === 403) return edhrecPageMissing(commanderSlug(commanderName));
  return false;
}

export async function getEdhrecData(
  commanderOracleId: string,
  commanderName: string,
): Promise<EdhrecFetchResult> {
  const cache = await readEdhrecCache([commanderOracleId]);
  return resolveEdhrecData(commanderOracleId, commanderName, cache.get(commanderOracleId));
}

/**
 * Fetch + parse with NO cache read and NO cache write. The index job needs both
 * halves skipped, for separate reasons:
 *
 * - Not reading: TTL_MS is 30 days, so a monthly index built through
 *   resolveEdhrecData would re-serve rows fetched 29 days ago and stamp them
 *   computed_at = now, making effective freshness up to 60 days.
 * - Not writing: the index walks ~3,000 commanders at ~94KB of payload each.
 *   Caching those is 300-400MB of jsonb for commanders nobody owns.
 *
 * Returns the same EdhrecFetchResult shape, so synergyStateFrom() applies to it
 * verbatim and the index and live paths cannot disagree about what "absent" means.
 */
export async function fetchEdhrecUncached(commanderName: string): Promise<EdhrecFetchResult> {
  try {
    const res = await fetch(edhrecUrl(commanderName), edhrecInit());
    // 429 means the service is throttling the index run, which is temporary and
    // says nothing about whether this commander is indexed. Treating it as absent
    // would overwrite a good row (and delete all its support cards) with an empty
    // absent row; instead, route it through the degraded path so the previous row
    // survives. A resumed run would then see that row as done and skip it,
    // compounding the loss.
    if (res.status === 429) return { data: null, unreachable: true };
    // 403 is ambiguous: a throttle, or a slug EDHREC has no page for at all. The
    // HTML page tells them apart, and only its 404 makes this absent — see
    // edhrecPageMissing for why anything else stays unreachable (#712).
    if (res.status === 403) {
      const missing = await edhrecPageMissing(commanderSlug(commanderName));
      return { data: null, unreachable: !missing };
    }
    // Other 4xx = not indexed on EDHREC. A data-shaped absence, not an outage.
    if (res.status >= 400 && res.status < 500) return { data: null, unreachable: false };
    if (!res.ok) throw new Error(`edhrec ${res.status}`);
    return { data: parseEdhrecPayload(await res.json()), unreachable: false };
  } catch {
    // not a fallback: reported as unreachable, which makes the list degraded and unstored.
    return { data: null, unreachable: true };
  }
}
