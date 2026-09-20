import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { cards, commanderPairSupport, commanderPairSupportCards } from "../../db/schema";
import { canonicalPair } from "./pair";
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
