import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import type { HeldCard } from "./fill";

/**
 * The cards a caller places BESIDE the plan, as `buildFillPlan`'s `selected` wants them: one per
 * id the catalog resolves, at one copy each.
 *
 * Whole cards rather than their costs (H26): a selected land or land-backed spell is a land drop
 * the finished deck already has, and a plan that saw only its pips built the full land count
 * beside it. Thorin's v1 shipped 41 lands against 37 that way.
 *
 * A plain module rather than an export of `app/decks/actions.ts`, whose `"use server"` would make
 * it a public server action.
 */
export async function placedCardsOf(oracleIds: readonly string[]): Promise<HeldCard[]> {
  if (oracleIds.length === 0) return [];
  return db.select({
    typeLine: cards.typeLine,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
    layout: cards.layout,
    manaCost: cards.manaCost,
  }).from(cards).where(inArray(cards.oracleId, [...oracleIds]));
}
