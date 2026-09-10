"use server";

import { and, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards, collectionItems, printings } from "../../../db/schema";
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
  /**
   * The Secret Lair name this row was found by, when the query matched that rather than
   * `name` (#467). Null whenever the oracle name matched too: the row's title already
   * carries the run the player typed, and a second name beside it would be noise.
   */
  flavorName: string | null;
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
  // The Secret Lair names this query caught (#467), one row per card rather than per printing:
  // a card can have several renamed printings and one row each would multiply the result list.
  //
  // Resolved once, ahead of the scan, rather than as a correlated subquery — the select list and
  // the WHERE clause both need it, and correlated it would be evaluated per candidate card, twice
  // over. Only a few hundred printings have a flavor name at all, and the partial index means
  // this reads those and nothing else.
  const flavorHits = db
    .select({
      oracleId: printings.oracleId,
      flavorName: sql<string>`min(${printings.flavorName})`.as("flavor_name"),
    })
    .from(printings)
    .where(ilike(printings.flavorName, `%${escaped}%`))
    .groupBy(printings.oracleId)
    .as("flavor_hits");
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      ownedQty: ownedQtySql,
      oracleText: cards.oracleText, keywords: cards.keywords,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
      flavorName: flavorHits.flavorName,
    })
    .from(cards)
    .leftJoin(ownedTotals, eq(ownedTotals.oracleId, cards.oracleId))
    .leftJoin(flavorHits, eq(flavorHits.oracleId, cards.oracleId))
    .where(and(
      // A player typing the name off the front of a Secret Lair card is typing the only
      // name that card shows them, so the flavor name is a first-class way in.
      or(ilike(cards.name, `%${escaped}%`), isNotNull(flavorHits.flavorName)),
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
  const lowerQuery = q.toLowerCase();
  return rows.map(({ oracleText, keywords, ...row }) => ({
    ...row,
    // Dropped when the title itself matched: the flavor name is there to explain a row
    // whose name does not contain what the player typed, and nothing else.
    flavorName: row.name.toLowerCase().includes(lowerQuery) ? null : row.flavorName,
    owned: row.ownedQty > 0,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText, keywords }),
    availability: availability?.get(row.oracleId) ?? null,
  }));
}
