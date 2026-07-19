import { eq } from "drizzle-orm";
import { db } from "../../db";
import { edhrecCache } from "../../db/schema";
import { commanderSlug } from "./slug";
import { parseEdhrecPayload, type EdhrecData } from "./parse";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getEdhrecData(
  commanderOracleId: string,
  commanderName: string,
): Promise<EdhrecData | null> {
  const [cached] = await db.select().from(edhrecCache)
    .where(eq(edhrecCache.commanderOracleId, commanderOracleId));
  const fresh = cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS;
  if (fresh) return parseEdhrecPayload(cached.payload);

  try {
    const res = await fetch(
      `https://json.edhrec.com/pages/commanders/${commanderSlug(commanderName)}.json`,
      // Timeout so a hung EDHREC request falls through to stale/degraded
      // handling instead of stalling the recommendations page.
      { headers: { "User-Agent": "the-99/1.0" }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) throw new Error(`edhrec ${res.status}`);
    const payload = await res.json();
    const now = new Date();
    await db.insert(edhrecCache)
      .values({ commanderOracleId, payload, fetchedAt: now })
      .onConflictDoUpdate({
        target: edhrecCache.commanderOracleId,
        set: { payload, fetchedAt: now },
      });
    return parseEdhrecPayload(payload);
  } catch {
    if (cached) return parseEdhrecPayload(cached.payload); // stale-on-error
    return null;
  }
}
