import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isLandFace } from "../cards/facet";
import { landProduces, type LandManaByCard } from "../mana/supply";

/** The Colors card's land supply for a deck's lands. Null when the read failed: the card then stays
 *  a shell, because drawing every land as making nothing would state what the read never learned. */
export async function loadLandMana(
  deckCards: readonly { oracleId: string; typeLine: string }[],
  deckColors: readonly string[],
): Promise<LandManaByCard | null> {
  const ids = deckCards.filter((c) => isLandFace(c.typeLine)).map((c) => c.oracleId);
  if (ids.length === 0) return {};
  try {
    const rows = await db
      .select({ oracleId: cards.oracleId, typeLine: cards.typeLine, oracleText: cards.oracleText })
      .from(cards)
      .where(inArray(cards.oracleId, ids));
    return Object.fromEntries(rows.map((r) => [r.oracleId, landProduces(r.typeLine, r.oracleText, deckColors)]));
  } catch {
    return null;
  }
}
