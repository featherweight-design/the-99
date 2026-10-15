/**
 * The catalog's own image for each commander named, for the ones `loadOpeningArt` has no priced non-foil
 * printing to open. That helper expects its caller to keep the catalog art (`opening-printing.ts`), as the
 * seat picker does (`opponent-commanders.ts`), so a seat drawn later reads the same picture it was filled with.
 */
import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";

export async function loadCatalogArt(oracleIds: readonly string[]): Promise<Map<string, string>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db.select({ id: cards.oracleId, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, [...oracleIds]));
  return new Map(rows.flatMap((r) => (r.imageUri ? [[r.id, r.imageUri] as const] : [])));
}
