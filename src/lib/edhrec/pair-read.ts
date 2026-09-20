import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  cards, commanderPairSupport, commanderPairSupportCards, edhrecPairCache,
} from "../../db/schema";
import { canonicalPair, fetchPair } from "./pair";
import { edhrecInit } from "./client";
import { parseEdhrecPayload } from "./parse";
import type { EdhrecData } from "./parse";

/**
 * A stored pair's support list, rebuilt into the shape `mergeEdhrecData` would have returned.
 *
 * SERVER-ONLY (imports the Drizzle client).
 *
 * Returning `EdhrecData` rather than a new shape is deliberate: `suggestions-read` already
 * consumes that shape from two paths, and a third shape there would mean a third branch in
 * every consumer. The pair table is a better SOURCE for the same answer, not a different
 * answer.
 */
export async function readPairSupport(a: string, b: string): Promise<EdhrecData | null> {
  // Through `canonicalPair`, always. `decks` stores the pair in a meaningful order — the
  // primary commander first — while the table stores it canonically, so passing a deck's own
  // order straight through silently misses every row whose primary carries the larger id.
  const pair = canonicalPair(a, b);

  const [header] = await db
    .select()
    .from(commanderPairSupport)
    .where(
      and(
        eq(commanderPairSupport.commanderOracleId, pair.commanderOracleId),
        eq(commanderPairSupport.partnerOracleId, pair.partnerOracleId),
      ),
    );
  if (!header || header.synergyState !== "ok") return null;

  // Joined to `cards` for NAMES: the table stores oracle ids, and every consumer downstream
  // keys on a lowercased name. Ordered by `position`, which is the whole reason that column
  // exists — `rankOf` ranks by list position, so rebuilding the list by inclusion would
  // silently change what "top" means.
  const rows = await db
    .select({
      name: cards.name,
      inclusion: commanderPairSupportCards.inclusion,
      synergy: commanderPairSupportCards.synergy,
      position: commanderPairSupportCards.position,
    })
    .from(commanderPairSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderPairSupportCards.oracleId))
    .where(
      and(
        eq(commanderPairSupportCards.commanderOracleId, pair.commanderOracleId),
        eq(commanderPairSupportCards.partnerOracleId, pair.partnerOracleId),
      ),
    )
    .orderBy(commanderPairSupportCards.position);

  if (rows.length === 0) return null;

  const inclusionByName: Record<string, number> = {};
  const synergyByName: Record<string, number> = {};
  for (const r of rows) {
    const key = r.name.toLowerCase();
    // Null stays OUT of the map rather than entering as 0 — a 0 draws a real bar for no data,
    // which is the rule the live parse follows and the one these figures were stored under.
    if (r.inclusion !== null) inclusionByName[key] = r.inclusion;
    if (r.synergy !== null) synergyByName[key] = r.synergy;
  }

  return {
    topCards: rows.map((r) => r.name),
    inclusionByName,
    synergyByName,
    tags: [],
    bracketCounts: header.bracketCounts,
    budgetCounts: {},
    similarNames: [],
    deckCount: header.deckCount,
    rank: header.rank,
    saltScore: null,
    composition:
      header.avgLand === null
        ? null
        : {
            land: header.avgLand,
            basic: header.avgBasic ?? 0,
            nonbasic: header.avgNonbasic ?? 0,
            creature: header.avgCreature ?? 0,
            instant: header.avgInstant ?? 0,
            sorcery: header.avgSorcery ?? 0,
            artifact: header.avgArtifact ?? 0,
            enchantment: header.avgEnchantment ?? 0,
            planeswalker: header.avgPlaneswalker ?? 0,
            battle: header.avgBattle ?? 0,
          },
    manaCurve: header.avgCurve,
  };
}

/** 30 days, matching the single-commander demand cache. */
const PAIR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The DEMAND path: a pair nobody has built, fetched on request and cached.
 *
 * The monthly index only fetches pairs present in `decks` — there are ~2,847 possible
 * combinations and that job runs at `max-parallel: 1` precisely so EDHREC never sees a second
 * request stream from us. So the first deck to use a new pairing has no stored row, and this
 * is what serves it: one fetch, cached for the same 30 days the single-commander cache uses.
 *
 * Returns null on any failure rather than throwing. A pair page is an enrichment — the caller
 * falls back to `mergeEdhrecData`, which is what it did before pairs existed at all.
 */
export async function resolvePairEdhrecData(
  a: string,
  b: string,
  nameA: string,
  nameB: string,
): Promise<EdhrecData | null> {
  const pair = canonicalPair(a, b);
  // Canonical on the READ too, not just the write. The CHECK constrains storage; passing a
  // deck's own column order straight through would simply miss every row whose primary
  // carries the larger id, silently and forever.
  const [cached] = await db
    .select()
    .from(edhrecPairCache)
    .where(
      and(
        eq(edhrecPairCache.commanderOracleId, pair.commanderOracleId),
        eq(edhrecPairCache.partnerOracleId, pair.partnerOracleId),
      ),
    );
  if (cached && Date.now() - cached.fetchedAt.getTime() < PAIR_TTL_MS) {
    return parseEdhrecPayload(cached.payload);
  }

  const result = await fetchPair(nameA, nameB, (url) => fetch(url, edhrecInit()));
  // Prefer stale over nothing, exactly as `resolveEdhrecData` does: a transient failure on a
  // pair we already have should not cost the reader the data.
  if (result.data === null) return cached ? parseEdhrecPayload(cached.payload) : null;

  const now = new Date();
  await db
    .insert(edhrecPairCache)
    .values({ ...pair, payload: result.rawPayload ?? {}, fetchedAt: now })
    .onConflictDoUpdate({
      target: [edhrecPairCache.commanderOracleId, edhrecPairCache.partnerOracleId],
      set: { payload: sql`excluded.payload`, fetchedAt: sql`excluded.fetched_at` },
    })
    .catch(() => {
      // A cache write failing must not cost the reader the answer it already has.
    });
  return result.data;
}
