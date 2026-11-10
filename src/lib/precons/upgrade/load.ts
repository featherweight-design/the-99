import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

import { db } from "../../../db";
import { cards, commanderSupportCards, preconCards, precons } from "../../../db/schema";
import { cheapestNow, loadPrices } from "../../decks/price-query";
import { loadSupportMeta } from "../../edhrec/support-read";
import type { EdhrecTag } from "../../edhrec/parse";
import { loadPreconOverview } from "../overview-read";
import { POOL_READ_MAX } from "./constants";
import type { OverviewPlan } from "./detect";
import { assembleDeck, assemblePool, mergeTags, overviewPlans, type DeckLine, type PoolRow } from "./inputs";

/**
 * Upgrade this precon's reads: one catalog precon's deck, its commander's EDHREC tags, the candidate pool and the stored
 * Overview's plans. SERVER-ONLY: it imports the database. Free and model-free; the page reads it to offer the strategies, and
 * a press reads it again to run one. Nothing here is the reader's: a precon is the catalog's, so there is no `userId`.
 */

export type UpgradeLoad = {
  fileName: string;
  /** The catalog precon's name, never a player-typed one: it reaches a prompt. */
  deckName: string;
  commanderIds: string[];
  deck: ReturnType<typeof assembleDeck>;
  deckIds: Set<string>;
  tags: EdhrecTag[];
  overview: OverviewPlan[];
  pool: ReturnType<typeof assemblePool>;
};

export async function loadUpgradeInputs(fileName: string, env: NodeJS.ProcessEnv): Promise<UpgradeLoad | null> {
  const [precon] = await db.select({ name: precons.name }).from(precons).where(eq(precons.fileName, fileName)).limit(1);
  if (!precon) return null;

  const lines: DeckLine[] = await db.select({
    oracleId: cards.oracleId, name: cards.name, manaCost: cards.manaCost, typeLine: cards.typeLine, oracleText: cards.oracleText,
    keywords: cards.keywords, quantity: preconCards.quantity, isCommander: preconCards.isCommander,
  }).from(preconCards).innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .where(eq(preconCards.fileName, fileName)).orderBy(preconCards.position);
  const commanderIds = lines.filter((l) => l.isCommander).map((l) => l.oracleId);
  if (commanderIds.length === 0) return null;
  const deckIds = new Set(lines.map((l) => l.oracleId));

  const [meta, poolRows, overview] = await Promise.all([
    loadSupportMeta(commanderIds),
    readPool(commanderIds, [...deckIds]),
    loadPreconOverview(fileName, env).catch(() => null),
  ]);
  const read = await loadPrices([...deckIds, ...poolRows.map((r) => r.oracleId)]);
  const cents = new Map([...deckIds, ...poolRows.map((r) => r.oracleId)].map((id) => [id, cheapestNow(read, id)] as const));

  return {
    fileName, deckName: precon.name, commanderIds, deckIds,
    deck: assembleDeck(lines, cents),
    tags: mergeTags(commanderIds.map((id) => meta.get(id)?.tags ?? [])),
    overview: overviewPlans(overview?.content ?? null),
    pool: assemblePool(poolRows, cents, deckIds),
  };
}

/** The commanders' most-included cards that the deck does not hold, one row per card at its highest inclusion across a partnered pair. */
async function readPool(commanderIds: string[], deckIds: string[]): Promise<PoolRow[]> {
  const rows = await db.select({
    oracleId: cards.oracleId, name: cards.name, manaCost: cards.manaCost, typeLine: cards.typeLine, oracleText: cards.oracleText,
    keywords: cards.keywords, inclusion: commanderSupportCards.inclusion,
  }).from(commanderSupportCards).innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    .where(and(inArray(commanderSupportCards.commanderOracleId, commanderIds), notInArray(commanderSupportCards.oracleId, deckIds)))
    .orderBy(sql`${commanderSupportCards.inclusion} desc nulls last`, desc(cards.name))
    .limit(POOL_READ_MAX * commanderIds.length);
  const best = new Map<string, PoolRow>();
  for (const r of rows) {
    const seen = best.get(r.oracleId);
    if (!seen || (r.inclusion ?? -1) > (seen.inclusion ?? -1)) best.set(r.oracleId, r);
  }
  return [...best.values()].sort((a, b) => (b.inclusion ?? -1) - (a.inclusion ?? -1)).slice(0, POOL_READ_MAX);
}
