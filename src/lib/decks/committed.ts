// Which cards a player has already committed to a deck, and to which one.
//
// Deck membership, not role coverage: `page.tsx` already flattens `roleCards`
// to exclude covered cards from the synergy panel, but that is a list of roles
// this commander wants, which says nothing about what the player has built.

import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, decks } from "../../db/schema";

export type CommittedRow = { oracleId: string; deckName: string };

/**
 * The first deck naming each card, from rows already in deck order.
 *
 * "First" has to mean what the deck list means by it, or a card in two decks
 * would name one deck on the commander page and sit under another on /decks.
 */
export function firstDeckPerCard(rows: CommittedRow[]): Map<string, string> {
  const byCard = new Map<string, string>();
  for (const row of rows) {
    if (!byCard.has(row.oracleId)) byCard.set(row.oracleId, row.deckName);
  }
  return byCard;
}

/**
 * Stamp a list of cards with the deck each is already committed to.
 *
 * Generic over the card because the two carriers — a role card and a synergy
 * card — share nothing but an oracle id, and the mark means the same on both.
 */
export function withCommitted<T extends { oracleId: string }>(
  cards: T[],
  byCard: Map<string, string>,
): (T & { committedTo: string | null })[] {
  return cards.map((card) => ({ ...card, committedTo: byCard.get(card.oracleId) ?? null }));
}

/**
 * How much of a commander's owned support the player has already spent.
 *
 * The scan is over the map rather than over the ids because the map already carries
 * the answer: `readCommittedDecks` builds it from rows in deck order, so the first
 * committed card met is in the first deck by that same ordering, `decks.id` tiebreak
 * included. Re-sorting the names here instead would agree with the read everywhere
 * except the one case a sort cannot see — two decks whose names differ only in case —
 * and there it would name a different deck than the marks below the sentence point at.
 */
export function committedSupport(
  oracleIds: string[],
  byCard: Map<string, string>,
): { count: number; firstDeck: string | null } {
  const wanted = new Set(oracleIds);
  let count = 0;
  let firstDeck: string | null = null;
  for (const [oracleId, deck] of byCard) {
    if (!wanted.has(oracleId)) continue;
    count++;
    firstDeck ??= deck;
  }
  return { count, firstDeck };
}

/**
 * One query for the whole page — every role list and the synergy panel read it.
 *
 * Request-scoped, the same way `loadCollectionPool` is: the scoring path and the
 * synergy read both want the map and neither is the other's caller, so memoising
 * is what makes "once per page" true without threading it through both.
 */
export const readCommittedDecks = cache(async function readCommittedDecks(
  userId: string,
): Promise<Map<string, string>> {
  const rows = await db
    .select({ oracleId: deckCards.oracleId, deckName: decks.name })
    .from(deckCards)
    .innerJoin(decks, eq(deckCards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    // Matches `listDecksWithStats` exactly, down to the collation-proofing and
    // the id tiebreak. See the note there for why neither is decoration.
    .orderBy(asc(sql`lower(${decks.name})`), asc(decks.id));

  return firstDeckPerCard(rows);
});
