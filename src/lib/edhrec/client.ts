import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { edhrecCache } from "../../db/schema";
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
};

/** One query for many commanders — the fanout would otherwise issue one SELECT each. */
export async function readEdhrecCache(oracleIds: string[]): Promise<Map<string, EdhrecCacheRow>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db.select().from(edhrecCache)
    .where(inArray(edhrecCache.commanderOracleId, oracleIds));
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
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) {
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
      if (cached) return { data: parseEdhrecPayload(cached.payload), unreachable: false };
      return { data: null, unreachable: false };
    }
    if (!res.ok) throw new Error(`edhrec ${res.status}`);
    const payload = await res.json();
    const now = new Date();
    await db.insert(edhrecCache)
      .values({ commanderOracleId, payload, fetchedAt: now })
      .onConflictDoUpdate({
        target: edhrecCache.commanderOracleId,
        set: { payload, fetchedAt: now },
      });
    return { data: parseEdhrecPayload(payload), unreachable: false };
  } catch {
    // Network error, timeout, or 5xx. If we have any cache — even stale — the
    // user still gets synergy data, so we're not user-visibly degraded.
    if (cached) return { data: parseEdhrecPayload(cached.payload), unreachable: false };
    return { data: null, unreachable: true };
  }
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
    return { data: null, unreachable: true };
  }
}
