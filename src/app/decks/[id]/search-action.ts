"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cardBracketFlags, cards, collectionItems } from "../../../db/schema";
import { nameSearch } from "../../../lib/cards/name-search";
import { requireUserId } from "../../../lib/auth";
import type { CardNoteFacts } from "../../../lib/bracket/card-note";
import { isTutor } from "../../../lib/bracket/tutor-targets";
import { isGameCardWhere } from "../../../lib/cards/game-card-where";
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
  // Carried beside `manaCost` rather than derived from it: the optimistic row a
  // quick add draws feeds the what-changed strip's mana value, and a row that
  // arrived without a cost would average as a zero for the beat before the
  // revalidate lands — visibly pulling the deck's figure down and then back up.
  cmc: number;
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
  /**
   * What the card note and the fact marks read, or null for a card that carries none of the
   * four. REQUIRED rather than optional, so a fixture or resolver building a result has to
   * state it — an optional field is one a stand-in can leave out and still type-check, and
   * the row would then draw no note on a card that has one.
   *
   * Read ON THE SEARCH'S OWN ROW rather than through `loadCandidateFacts`, and that is the
   * whole of 8c's payload answer. Every one of the four is a property of the CARD: the game
   * changer is a column already on this row, the tutor reading is `isTutor` over the
   * oracle text this query already selects, and the two flags come off a table of 163 rows by
   * primary key. Measured on staging: 0.04ms for twenty ids, joined into the statement that
   * already runs, so no keystroke pays a round trip for it. What `loadCandidateFacts` adds is
   * `completesCombos` — a question about the DECK, which no keystroke changes and which
   * `useDeckComboMap` answers once per panel. The note does not read it.
   */
  facts: CardNoteFacts | null;
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
  const match = nameSearch(query);
  if (!match) return [];
  const { flavorHits } = match;
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
  // name matches are off-color or unowned. A scan over the ~35k-row cards table is cheap.
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      ownedQty: ownedQtySql,
      oracleText: cards.oracleText, keywords: cards.keywords,
      imageUri: cards.imageUri, manaCost: cards.manaCost, cmc: cards.cmc,
      flavorName: flavorHits.flavorName,
      gameChanger: cards.gameChanger,
      // Nullable through the left join: no row means neither flag applies, which is what
      // the table's absence means everywhere (`flags-read.ts`).
      massLandDenial: cardBracketFlags.massLandDenial,
      extraTurn: cardBracketFlags.extraTurn,
    })
    .from(cards)
    .leftJoin(ownedTotals, eq(ownedTotals.oracleId, cards.oracleId))
    .leftJoin(cardBracketFlags, eq(cardBracketFlags.oracleId, cards.oracleId))
    .leftJoin(flavorHits, eq(flavorHits.oracleId, cards.oracleId))
    .where(and(
      match.where,
      colorIdentity === null ? undefined : withinColorIdentity(colorIdentity),
      eq(cards.commanderLegal, true),
      // Sticker sheets are commander-legal on Scryfall and are never one of the 99 (isGameCard).
      isGameCardWhere(),
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
  return rows.map(({ oracleText, keywords, gameChanger, massLandDenial, extraTurn, ...row }) => ({
    ...row,
    facts: noteFacts({
      gameChanger: gameChanger ?? false,
      massLandDenial: massLandDenial ?? false,
      extraTurn: extraTurn ?? false,
      tutor: isTutor(oracleText),
    }),
    flavorName: match.shownFlavor(row.name, row.flavorName),
    owned: row.ownedQty > 0,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText, keywords }),
    availability: availability?.get(row.oracleId) ?? null,
  }));
}

/** Null for a card carrying none of the four, which is what the note and the marks draw anyway. */
function noteFacts(facts: CardNoteFacts): CardNoteFacts | null {
  return facts.gameChanger || facts.massLandDenial || facts.extraTurn || facts.tutor
    ? facts
    : null;
}
