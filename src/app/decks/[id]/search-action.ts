"use server";

import { and, arrayContained, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards } from "../../../db/schema";
import { requireUserId } from "../../../lib/auth";

export async function searchCards(
  query: string, colorIdentity: string[], ownedOnly: boolean,
): Promise<{ oracleId: string; name: string; typeLine: string; owned: boolean }[]> {
  const userId = await requireUserId();
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return [];
  // The query string is parameterized (no SQL injection risk); escaping stops
  // user-typed %/_/\ from acting as LIKE wildcards and changing match behavior.
  const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
  const ownedSql = sql<boolean>`exists (select 1 from collection_items ci where ci.oracle_id = ${cards.oracleId} and ci.user_id = ${userId})`;
  // All constraints live in SQL so LIMIT can't starve results when early
  // name matches are off-color or unowned.
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      owned: ownedSql,
    })
    .from(cards)
    .where(and(
      ilike(cards.name, `%${escaped}%`),
      colorIdentity.length === 0
        ? sql`cardinality(${cards.colorIdentity}) = 0`
        : arrayContained(cards.colorIdentity, colorIdentity),
      eq(cards.commanderLegal, true),
      ownedOnly ? ownedSql : undefined,
    ))
    .limit(20);
  // Substring (not prefix) match is intentional: "gravetide" must find
  // "Muldrotha, the Gravetide". A scan over the ~35k-row cards table is cheap.
  return rows;
}
