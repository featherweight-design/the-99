import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import {
  commanderPairSupport,
  commanderPairSupportCards,
  commanderSupport,
  commanderSupportCards,
} from "../../db/schema";
import { canonicalPair } from "../edhrec/pair";
import type { CutSupport } from "../tuning/cuts";

/**
 * The commander's (or the pair's own) EDHREC support list, as inclusion percents. Null when there
 * is no usable list: no row, a row whose page was absent or degraded, or a list with no cards.
 * The engine then runs without the inclusion signal and names it missing (ruling 6).
 *
 * A pair reads the PAIR's page only. Neither commander's own page describes the decks that run the
 * two together, and falling back to one would score the other's cards against the wrong decks.
 */
export async function readCutSupport(commander: string, partner: string | null): Promise<CutSupport | null> {
  const key = (t: typeof commanderPairSupport | typeof commanderPairSupportCards, pair: ReturnType<typeof canonicalPair>) => and(
    eq(t.commanderOracleId, pair.commanderOracleId),
    eq(t.partnerOracleId, pair.partnerOracleId),
  );
  // The header and its card rows are published together by an index copy; read apart, a copy
  // landing between the two statements would pair one generation's state with another's list.
  const { header, rows } = await db.transaction(async (tx) => {
    if (partner) {
      const pair = canonicalPair(commander, partner);
      const [[h], r] = await Promise.all([
        tx.select({ state: commanderPairSupport.synergyState, deckCount: commanderPairSupport.deckCount })
          .from(commanderPairSupport).where(key(commanderPairSupport, pair)),
        tx.select({ oracleId: commanderPairSupportCards.oracleId, inclusion: commanderPairSupportCards.inclusion })
          .from(commanderPairSupportCards).where(key(commanderPairSupportCards, pair)),
      ]);
      return { header: h, rows: r };
    }
    const [[h], r] = await Promise.all([
      tx.select({ state: commanderSupport.synergyState, deckCount: commanderSupport.deckCount })
        .from(commanderSupport).where(eq(commanderSupport.commanderOracleId, commander)),
      tx.select({ oracleId: commanderSupportCards.oracleId, inclusion: commanderSupportCards.inclusion })
        .from(commanderSupportCards).where(eq(commanderSupportCards.commanderOracleId, commander)),
    ]);
    return { header: h, rows: r };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  if (header?.state !== "ok" || rows.length === 0) return null;
  return {
    deckCount: header.deckCount,
    listed: rows.length,
    inclusion: new Map(rows.map((r) => [r.oracleId, r.inclusion])),
  };
}
