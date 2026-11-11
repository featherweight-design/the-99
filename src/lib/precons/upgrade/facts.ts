import { inArray } from "drizzle-orm";
import { db } from "../../../db";
import { cards } from "../../../db/schema";

/** What a result row draws of a card besides its name: its mana value, its color identity and its art. */
export type CardFacts = { cmc: number; identity: string[]; art: string | null };

/** The facts of these cards by oracle id: a card the catalog does not hold has none, and its row draws without them. */
export async function readCardFacts(oracleIds: readonly string[]): Promise<Map<string, CardFacts>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db
    .select({ id: cards.oracleId, cmc: cards.cmc, identity: cards.colorIdentity, art: cards.imageUri })
    .from(cards)
    .where(inArray(cards.oracleId, [...oracleIds]));
  return new Map(rows.map((r) => [r.id, { cmc: r.cmc, identity: r.identity, art: r.art }]));
}
