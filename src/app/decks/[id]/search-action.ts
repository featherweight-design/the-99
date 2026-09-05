"use server";

import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards, collectionItems } from "../../../db/schema";
import { requireUserId } from "../../../lib/auth";
import { withinColorIdentity } from "../../../lib/cards/identity-where";
import type { Availability } from "../../../lib/decks/availability";
import { loadAvailability } from "../../../lib/decks/availability-query";
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
  /** Absent or null renders no marker — see DeckDetailCard.availability. */
  availability?: Availability | null;
};

/**
 * `colorIdentity: null` drops the identity constraint entirely, which an empty
 * array cannot express — `[]` is a colorless commander and filters to colorless
 * cards. Unresolved-row resolution passes null: matching ran against the whole
 * Scryfall catalogue, so an off-color card is still a valid answer to "what was
 * this line?", and it passes `ownedOnly: false` for the same reason.
 *
 * `deckId` is the vantage for availability, not a filter: the deck being built
 * must not count its own claims against itself. Optional so a caller with no
 * deck context still gets results, just with no markers.
 */
export async function searchCards(
  query: string, colorIdentity: string[] | null, ownedOnly: boolean, deckId?: string,
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
      colorIdentity === null ? undefined : withinColorIdentity(colorIdentity),
      eq(cards.commanderLegal, true),
      ownedOnly ? sql`${ownedQtySql} > 0` : undefined,
    ))
    .limit(20);
  // Scoped to the owned rows among the 20 we are about to return. This action
  // fires per keystroke, and the unscoped aggregate walks the player's whole
  // collection.
  //
  // Owned-only because `loadAvailability` is driven by the collection: a card
  // the player does not own cannot come back from it at all, so passing its
  // oracle id widens the array parameter and buys nothing. With `ownedOnly`
  // false — the resolution expander — a whole page of results can be unowned,
  // and then there is no query worth making.
  //
  // Availability is decoration: a failure here must leave the search working, so
  // the read is swallowed and every row falls back to no marker.
  const ownedIds = rows.filter((r) => r.ownedQty > 0).map((r) => r.oracleId);
  const availability =
    deckId && ownedIds.length > 0
      ? await loadAvailability(userId, { excludeDeckId: deckId, oracleIds: ownedIds }).catch(
          () => null,
        )
      : null;
  // Substring (not prefix) match is intentional: "gravetide" must find
  // "Muldrotha, the Gravetide". A scan over the ~35k-row cards table is cheap.
  return rows.map(({ oracleText, keywords, ...row }) => ({
    ...row,
    owned: row.ownedQty > 0,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText, keywords }),
    availability: availability?.get(row.oracleId) ?? null,
  }));
}
