import { eq } from "drizzle-orm";
import { db } from "../../db";
import { edhrecCache } from "../../db/schema";
import { commanderSlug } from "./slug";
import { parseEdhrecPayload, type EdhrecData } from "./parse";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export async function getEdhrecData(
  commanderOracleId: string,
  commanderName: string,
): Promise<EdhrecFetchResult> {
  const [cached] = await db.select().from(edhrecCache)
    .where(eq(edhrecCache.commanderOracleId, commanderOracleId));
  const fresh = cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS;
  if (fresh) return { data: parseEdhrecPayload(cached.payload), unreachable: false };

  try {
    const res = await fetch(
      `https://json.edhrec.com/pages/commanders/${commanderSlug(commanderName)}.json`,
      // Timeout so a hung EDHREC request falls through to stale/degraded
      // handling instead of stalling the recommendations page.
      { headers: { "User-Agent": "the-99/1.0" }, signal: AbortSignal.timeout(10_000) },
    );
    // 4xx = this commander isn't on EDHREC (e.g. non-legendary in the candidate
    // pool, name→slug mismatch, novel legendary not yet indexed). That's a
    // per-commander data absence, not a service outage — do not flip degraded.
    if (res.status >= 400 && res.status < 500) {
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
