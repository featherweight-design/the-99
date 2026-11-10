import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

import { db } from "../../../db";
import { cards, commanderSupportCards, preconCards, precons } from "../../../db/schema";
import { cheapestNow, loadPrices } from "../../decks/price-query";
import { loadSupportMeta } from "../../edhrec/support-read";
import { loadPreconOverview } from "../overview-read";
import { POOL_READ_MAX } from "./constants";
import type { OverviewPlan } from "./detect";
import {
  alternateCommander, assembleDeck, assemblePool, mergeLines, optionFor, overviewPlans, withCommanders,
  type CommanderOption, type DeckLine, type PoolRow,
} from "./inputs";

/**
 * Upgrade this precon's reads, in two steps. SERVER-ONLY: it imports the database. Nothing here is the reader's: a precon is
 * the catalog's, so there is no `userId`. Both are model-free.
 *
 * `loadUpgradeBase`: the cheap read the panel needs: the deck's lines, the ways to lead it (the face commander(s), and the
 * Overview's alternate when the box has one the deck can back), each with the index's tags and prose, and the Overview's plans.
 * `loadUpgradeFor`: what one press needs on top, for the commander picked: the deck read with that commander, the candidate
 * pool from THAT commander's own list, and every price.
 */

export type UpgradeBase = {
  fileName: string;
  /** The catalog precon's name, never a player-typed one: it reaches a prompt. */
  deckName: string;
  /** Every card of the list, one line per card, with the box's own commander(s) flagged. */
  lines: DeckLine[];
  /** The face option first, then the alternate when the box has one. Not yet filtered by what the deck can back (`run.ts`). */
  options: CommanderOption[];
  overview: OverviewPlan[];
};

export type UpgradeLoad = {
  fileName: string;
  deckName: string;
  option: CommanderOption;
  /** The box's own commander, when the press leads with the alternate (it is one of the 99 then). */
  formerCommander: string | null;
  commanderIds: string[];
  deck: ReturnType<typeof assembleDeck>;
  pool: ReturnType<typeof assemblePool>;
};

export async function loadUpgradeBase(fileName: string, env: NodeJS.ProcessEnv): Promise<UpgradeBase | null> {
  const [precon] = await db.select({ name: precons.name }).from(precons).where(eq(precons.fileName, fileName)).limit(1);
  if (!precon) return null;

  const rows: DeckLine[] = await db.select({
    oracleId: cards.oracleId, name: cards.name, manaCost: cards.manaCost, typeLine: cards.typeLine, oracleText: cards.oracleText,
    keywords: cards.keywords, cmc: cards.cmc, commanderLegal: cards.commanderLegal, quantity: preconCards.quantity, isCommander: preconCards.isCommander,
  }).from(preconCards).innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .where(eq(preconCards.fileName, fileName)).orderBy(preconCards.position);
  const lines = mergeLines(rows);
  const face = lines.filter((l) => l.isCommander).map((l) => l.oracleId);
  if (face.length === 0) return null;

  const overview = await loadPreconOverview(fileName, env).catch(() => null);
  const alt = alternateCommander(overview?.content ?? null, lines);
  const meta = await loadSupportMeta(alt ? [...face, alt.oracleId] : face);
  return {
    fileName, deckName: precon.name, lines,
    options: [optionFor(lines, face, true, meta), ...(alt ? [optionFor(lines, [alt.oracleId], false, meta)] : [])],
    overview: overviewPlans(overview?.content ?? null),
  };
}

/** `ceiling` is the bracket the run is held to: below 3 no game changer is offered, as none could be kept (`hold.ts`). */
export async function loadUpgradeFor(base: UpgradeBase, option: CommanderOption, ceiling: number): Promise<UpgradeLoad> {
  const lines = withCommanders(base.lines, option.commanderIds);
  const deckIds = new Set(lines.map((l) => l.oracleId));
  const poolRows = await readPool(option.commanderIds, [...deckIds], ceiling < 3);
  const ids = [...deckIds, ...poolRows.map((r) => r.oracleId)];
  const read = await loadPrices(ids);
  const cents = new Map(ids.map((id) => [id, cheapestNow(read, id)] as const));
  const face = base.options[0];
  return {
    fileName: base.fileName, deckName: base.deckName, option,
    formerCommander: option.isFace ? null : face.cards.map((c) => c.name).join(" + "),
    commanderIds: option.commanderIds,
    deck: assembleDeck(lines, cents),
    pool: assemblePool(poolRows, cents, deckIds),
  };
}

/** The commanders' most-included cards that the deck does not hold, one row per card at its highest inclusion across a partnered pair. */
async function readPool(commanderIds: string[], deckIds: string[], noGameChangers: boolean): Promise<PoolRow[]> {
  const rows = await db.select({
    oracleId: cards.oracleId, name: cards.name, manaCost: cards.manaCost, typeLine: cards.typeLine, oracleText: cards.oracleText,
    keywords: cards.keywords, inclusion: commanderSupportCards.inclusion,
  }).from(commanderSupportCards).innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    .where(and(inArray(commanderSupportCards.commanderOracleId, commanderIds), notInArray(commanderSupportCards.oracleId, deckIds), noGameChangers ? sql`${cards.gameChanger} is not true` : undefined))
    .orderBy(sql`${commanderSupportCards.inclusion} desc nulls last`, desc(cards.name))
    .limit(POOL_READ_MAX * commanderIds.length);
  const best = new Map<string, PoolRow>();
  for (const r of rows) {
    const seen = best.get(r.oracleId);
    if (!seen || (r.inclusion ?? -1) > (seen.inclusion ?? -1)) best.set(r.oracleId, r);
  }
  return [...best.values()].sort((a, b) => (b.inclusion ?? -1) - (a.inclusion ?? -1)).slice(0, POOL_READ_MAX);
}
