import { and, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { parsePublicSlug, uuidRange } from "./slug";

/** The cards an id prefix covers, at most two (one is a hit; two is a prefix collision, refused rather than guessed). */
export function cardsByPrefixQuery(hex: string) {
  const { lo, hi } = uuidRange(hex);
  return db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards)
    .where(and(gte(cards.oracleId, lo), lte(cards.oracleId, hi))).limit(2);
}

export type Resolved = { kind: "ok"; oracleId: string; name: string; namePart: string } | { kind: "not-found" } | { kind: "ambiguous" };

/** A requested address to one card: by its id suffix alone, whatever the name part says. */
export async function resolvePublicSlug(slug: string): Promise<Resolved> {
  const parsed = parsePublicSlug(slug);
  if (!parsed) return { kind: "not-found" };
  const rows = await cardsByPrefixQuery(parsed.hex);
  if (rows.length === 0) return { kind: "not-found" };
  if (rows.length > 1) return { kind: "ambiguous" };
  return { kind: "ok", oracleId: rows[0].oracleId, name: rows[0].name, namePart: parsed.namePart };
}
