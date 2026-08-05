"use server";

import { and, arrayContained, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards, collectionItems } from "../../../db/schema";
import { requireUserId } from "../../../lib/auth";
import type { DeckDetailCard } from "../../../lib/decks/grouping";
import { cardTypeGroup, primaryRole } from "../../../lib/decks/read";

export type SearchResult = {
  oracleId: string;
  name: string;
  typeLine: string;
  owned: boolean;
  // Server-derived for the same reason as DeckSuggestion's: the client has no
  // way to classify a card, and a guessed group means the optimistic row jumps.
  cardTypeGroup: DeckDetailCard["cardTypeGroup"];
  role: DeckDetailCard["role"];
  imageUri: string | null;
  // Scryfall's cost string ("{2}{U}"), carried whole rather than as a mana
  // value: CostPips draws hybrid and Phyrexian symbols from their halves, and
  // a number cannot be taken back apart into them.
  manaCost: string | null;
  // Copies owned across every printing and finish, which is what the row draws
  // as "×N owned". A card is one row per (set, collector number, finish) in
  // `collection_items`, so this is a SUM rather than a count — four nonfoil and
  // one foil Sol Ring is "×5 owned", not "×2".
  ownedQty: number;
};

export async function searchCards(
  query: string, colorIdentity: string[], ownedOnly: boolean,
): Promise<SearchResult[]> {
  const userId = await requireUserId();
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return [];
  // The query string is parameterized (no SQL injection risk); escaping stops
  // user-typed %/_/\ from acting as LIKE wildcards and changing match behavior.
  const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
  // The user's collection, summed per card once and joined in — rather than a
  // correlated subquery, which the select list and the owned-only filter would
  // each evaluate per candidate row. One aggregate drives both the figure and
  // the boolean, so a row cannot claim a card is owned and then draw "×0 owned"
  // beside it. `::int` because the driver hands back sum() as a string.
  const ownedTotals = db
    .select({
      oracleId: collectionItems.oracleId,
      qty: sql<number>`sum(${collectionItems.quantity})::int`.as("qty"),
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId)
    .as("owned_totals");
  const ownedQtySql = sql<number>`coalesce(${ownedTotals.qty}, 0)`;
  // All constraints live in SQL so LIMIT can't starve results when early
  // name matches are off-color or unowned.
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      ownedQty: ownedQtySql,
      oracleText: cards.oracleText, keywords: cards.keywords,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
    })
    .from(cards)
    .leftJoin(ownedTotals, eq(ownedTotals.oracleId, cards.oracleId))
    .where(and(
      ilike(cards.name, `%${escaped}%`),
      colorIdentity.length === 0
        ? sql`cardinality(${cards.colorIdentity}) = 0`
        : arrayContained(cards.colorIdentity, colorIdentity),
      eq(cards.commanderLegal, true),
      ownedOnly ? sql`${ownedQtySql} > 0` : undefined,
    ))
    .limit(20);
  // Substring (not prefix) match is intentional: "gravetide" must find
  // "Muldrotha, the Gravetide". A scan over the ~35k-row cards table is cheap.
  return rows.map(({ oracleText, keywords, ...row }) => ({
    ...row,
    owned: row.ownedQty > 0,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText, keywords }),
  }));
}
