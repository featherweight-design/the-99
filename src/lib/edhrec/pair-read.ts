import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  cards, commanderPairSupport, commanderPairSupportCards, edhrecPairCache,
} from "../../db/schema";
import { canonicalPair, fetchPair } from "./pair";
import { edhrecInit } from "./client";
import { parseEdhrecPayload } from "./parse";
import type { CompositionCounts, EdhrecData } from "./parse";

/**
 * ALL-OR-NOTHING, the same rule `readComposition` applies in the parser.
 *
 * Substituting 0 for a null turns "we do not know" into a real count, and these ten figures
 * carry invariants a reader may lean on — `basic + nonbasic = land` among them. A partial
 * row (a future widening, a hand repair, an ingest interrupted between columns) would
 * otherwise report a 37-land deck holding no basics and no nonbasics.
 *
 * Gating on `avgLand` alone was the same bug in a narrower form: it is the one column whose
 * absence the previous check could see, and every other null fell through to a zero.
 */
export function compositionFrom(header: {
  avgLand: number | null; avgBasic: number | null; avgNonbasic: number | null;
  avgCreature: number | null; avgInstant: number | null; avgSorcery: number | null;
  avgArtifact: number | null; avgEnchantment: number | null;
  avgPlaneswalker: number | null; avgBattle: number | null;
}): CompositionCounts | null {
  const values = {
    land: header.avgLand, basic: header.avgBasic, nonbasic: header.avgNonbasic,
    creature: header.avgCreature, instant: header.avgInstant, sorcery: header.avgSorcery,
    artifact: header.avgArtifact, enchantment: header.avgEnchantment,
    planeswalker: header.avgPlaneswalker, battle: header.avgBattle,
  };
  return Object.values(values).some((v) => v === null)
    ? null
    : (values as CompositionCounts);
}

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
    composition: compositionFrom(header),
    manaCurve: header.avgCurve,
  };
}

/**
 * A parse is only an ANSWER when it carries cards.
 *
 * `parseEdhrecPayload` degrades to an empty `topCards` on a shape it does not recognise, so
 * a 200 carrying no cardlists parses to a perfectly non-null `EdhrecData` describing nothing.
 * `synergyStateFrom` exists because of that, and the same trap reached this path from the
 * other side: the demand fetch would have RETURNED that empty parse, cached it for thirty
 * days, and `suggestions-read` prefers a pair result over `mergeEdhrecData` — so one bad
 * page would have replaced a working merge with an empty list until the TTL expired.
 *
 * The same rule was applied to `toPairRows` one round earlier and this sibling was missed.
 */
export function usable(payload: unknown): EdhrecData | null {
  const data = parseEdhrecPayload(payload);
  return data !== null && data.topCards.length > 0 ? data : null;
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
    return usable(cached.payload);
  }

  const result = await fetchPair(nameA, nameB, (url) => fetch(url, edhrecInit()));
  const fresh = result.data !== null && result.data.topCards.length > 0 ? result.data : null;
  // Prefer stale over nothing, exactly as `resolveEdhrecData` does: a transient failure on a
  // pair we already have should not cost the reader the data.
  if (fresh === null) return cached ? usable(cached.payload) : null;

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
  return fresh;
}
