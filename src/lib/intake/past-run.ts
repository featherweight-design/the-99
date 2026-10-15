import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cards, decks } from "../../db/schema";

/**
 * A pick of a past run the search no longer lists (History): what it is, and whether the player has
 * built it since. SERVER-ONLY. A decoration: the page draws the group from what this returns, and a
 * failed read draws the run without the group rather than not at all.
 */
export type GonePick = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  artCropUri: string | null;
  /** The newest deck the player has led by this commander, when there is one: why the pick went. */
  deck: { id: string; name: string } | null;
};

export async function loadGonePicks(userId: string, ids: readonly string[], since: Date): Promise<GonePick[]> {
  if (ids.length === 0) return [];
  const [found, built] = await Promise.all([
    db.select({ id: cards.oracleId, name: cards.name, image: cards.imageUri, crop: cards.artCropUri }).from(cards)
      .where(inArray(cards.oracleId, [...ids])),
    db.select({ commander: decks.commanderOracleId, id: decks.id, name: decks.name, createdAt: decks.createdAt }).from(decks)
      .where(and(eq(decks.userId, userId), inArray(decks.commanderOracleId, [...ids])))
      .orderBy(desc(decks.createdAt)),
  ]);
  const card = new Map(found.map((c) => [c.id, c]));
  // The query is newest first, so the first deck seen for a commander is its newest. Only a deck made
  // after the run counts: an older one did not make the pick go, so "you built it since" would be false.
  const deck = new Map<string, { id: string; name: string }>();
  for (const d of built.filter((b) => b.createdAt >= since)) if (!deck.has(d.commander)) deck.set(d.commander, { id: d.id, name: d.name });
  return ids.flatMap((id) => {
    const c = card.get(id);
    // A card the catalog dropped is not drawn: there is nothing to name.
    return c ? [{ oracleId: id, name: c.name, imageUri: c.image, artCropUri: c.crop, deck: deck.get(id) ?? null }] : [];
  });
}
