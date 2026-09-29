import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";

/**
 * The mana costs of `oracleIds`, one per id the catalog resolves: what `buildFillPlan`'s
 * `selectedCosts` wants for cards a caller places beside the plan itself.
 *
 * A plain module rather than an export of `app/decks/actions.ts`, whose `"use server"` would make
 * it a public server action.
 */
export async function costsOf(oracleIds: readonly string[]): Promise<(string | null)[]> {
  if (oracleIds.length === 0) return [];
  const rows = await db.select({ manaCost: cards.manaCost })
    .from(cards).where(inArray(cards.oracleId, [...oracleIds]));
  return rows.map((r) => r.manaCost ?? null);
}
