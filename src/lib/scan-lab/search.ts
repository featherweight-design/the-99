import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isGameCardWhere } from "../cards/game-card-where";
import { nameSearch } from "../cards/name-search";

export type ScanLabCardHit = { oracleId: string; name: string; flavorName: string | null; imageUri: string | null };

/**
 * The lab's "What card was it?" search: every game card whose name, or Secret Lair name, matches,
 * with its art. The Add cards sheet's matching (`nameSearch`), without its owned counts: the lab
 * names a card, not a holding, so it never reads the collection.
 */
export async function searchLabCards(query: string): Promise<ScanLabCardHit[]> {
  const match = nameSearch(query);
  if (!match) return [];
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, flavorName: match.flavorHits.flavorName })
    .from(cards)
    .leftJoin(match.flavorHits, eq(match.flavorHits.oracleId, cards.oracleId))
    .where(and(match.where, isGameCardWhere()))
    .orderBy(asc(cards.name))
    .limit(20);
  return rows.map((r) => ({ ...r, flavorName: match.shownFlavor(r.name, r.flavorName) }));
}
