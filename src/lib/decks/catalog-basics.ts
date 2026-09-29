import { and, ilike, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import type { FillCandidate } from "./fill";

/** The six basic land types a mana base can be built from. Snow-covered basics are a different
 *  card, and are offered only when the player owns them (through the pool). */
export const BASIC_NAMES = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"] as const;

/**
 * The catalog's basic lands, one per type, as `planFill`'s `basics` wants them: offered to the
 * basics step whatever the collection holds, because a basic is always owned in this app and never
 * a buy. `planFill` filters them by the deck's identity, so all six are returned for every deck.
 *
 * A plain module rather than an export of `app/decks/actions.ts`, whose `"use server"` would make
 * it a public server action.
 */
export async function loadCatalogBasics(): Promise<FillCandidate[]> {
  const rows = await db.select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
    oracleText: cards.oracleText, keywords: cards.keywords, manaCost: cards.manaCost,
    layout: cards.layout,
  }).from(cards).where(and(inArray(cards.name, [...BASIC_NAMES]), ilike(cards.typeLine, "Basic Land%")));
  const byName = new Map<string, FillCandidate>();
  for (const r of rows) {
    // One per type. A name is one oracle id in Scryfall's data, so this only guards a catalog
    // that ever held two, keeping the lowest id so the choice is stable between runs.
    const seen = byName.get(r.name);
    if (seen && seen.oracleId < r.oracleId) continue;
    byName.set(r.name, {
      ...r,
      owned: true, ownedQuantity: 0, inclusionPct: null,
    });
  }
  return [...byName.values()];
}
