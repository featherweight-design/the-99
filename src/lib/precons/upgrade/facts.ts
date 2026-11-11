import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../../../db";
import { cards, decks } from "../../../db/schema";

/** What a result row draws of a card besides its name: its mana value and its color identity. */
export type CardFacts = { cmc: number; identity: string[] };

/** The facts of these cards by oracle id: a card the catalog does not hold has none, and its row draws without them. */
export async function readCardFacts(oracleIds: readonly string[]): Promise<Map<string, CardFacts>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db
    .select({ id: cards.oracleId, cmc: cards.cmc, identity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.oracleId, [...oracleIds]));
  return new Map(rows.map((r) => [r.id, { cmc: r.cmc, identity: r.identity }]));
}

/** Which of these runs the reader started a deck from: the runs a press no longer opens on. */
export async function readStartedRuns(userId: string, runIds: readonly string[]): Promise<Set<string>> {
  if (runIds.length === 0) return new Set();
  const rows = await db
    .select({ run: decks.builtFromUpgradeId })
    .from(decks)
    .where(and(eq(decks.userId, userId), isNotNull(decks.builtFromUpgradeId), inArray(decks.builtFromUpgradeId, [...runIds])));
  return new Set(rows.flatMap((r) => (r.run ? [r.run] : [])));
}
