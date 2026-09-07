// Which cards a player has already committed to a deck, and to which one.
//
// Deck membership, not role coverage: `page.tsx` already flattens `roleCards`
// to exclude covered cards from the synergy panel, but that is a list of roles
// this commander wants, which says nothing about what the player has built.

import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, decks } from "../../db/schema";

export type CommittedRow = { oracleId: string; deckId: string; deckName: string };

/**
 * The deck a card is committed to. The id is carried alongside the name because
 * `decks.name` is not unique — nothing stops a player keeping two lists called
 * "Krenko" — and every question that groups by deck has to group by the id or
 * it merges them. The name is what gets drawn.
 */
export type CommittedDeck = { id: string; name: string };

/**
 * The first deck naming each card, from rows already in deck order.
 *
 * "First" has to mean what the deck list means by it, or a card in two decks
 * would name one deck on the commander page and sit under another on /decks.
 */
export function firstDeckPerCard(rows: CommittedRow[]): Map<string, CommittedDeck> {
  const byCard = new Map<string, CommittedDeck>();
  for (const row of rows) {
    if (!byCard.has(row.oracleId)) byCard.set(row.oracleId, { id: row.deckId, name: row.deckName });
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
  byCard: Map<string, CommittedDeck>,
): (T & { committedTo: string | null })[] {
  return cards.map((card) => ({ ...card, committedTo: byCard.get(card.oracleId)?.name ?? null }));
}

/**
 * The deck holding the most of a commander's owned support, and how much it holds.
 *
 * NOT the first deck met, which is what shipped and what named the same deck on every
 * commander page. The map is in deck order, so the first committed card met sits in the
 * alphabetically-first deck holding any support card at all — for a player with one
 * large deck, that deck for all three thousand commanders. The sentence read as a
 * finding about the commander and was an artefact of the sort.
 *
 * `count` is this deck's, not the total across every deck. Those two were previously
 * mismatched — a total attributed to a single named list — so the sentence credited one
 * deck with cards sitting in others. A figure and the deck it is attributed to have to
 * be counted over the same deck, or the sentence is simply false.
 *
 * Ties go to the earlier deck in the map, which is the read's own ordering with the
 * `decks.id` tiebreak already applied. Re-sorting names here would agree everywhere but
 * the one case a sort cannot see — two decks differing only in case — and there it would
 * name a deck the committed marks below do not point at.
 */
export function committedSupport(
  oracleIds: string[],
  byCard: Map<string, CommittedDeck>,
): { count: number; topDeck: string | null } {
  const wanted = new Set(oracleIds);
  // Keyed on the deck id, not its name: two lists can share a name, and grouping
  // on the name would credit one of them with the other's cards.
  const perDeck = new Map<string, { name: string; n: number }>();
  for (const [oracleId, deck] of byCard) {
    if (!wanted.has(oracleId)) continue;
    const seen = perDeck.get(deck.id);
    if (seen) seen.n += 1;
    else perDeck.set(deck.id, { name: deck.name, n: 1 });
  }
  let topDeck: string | null = null;
  let count = 0;
  // Strictly greater, so insertion order breaks a tie — see the note above.
  for (const deck of perDeck.values()) {
    if (deck.n > count) {
      count = deck.n;
      topDeck = deck.name;
    }
  }
  return { count, topDeck };
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
): Promise<Map<string, CommittedDeck>> {
  const rows = await db
    .select({ oracleId: deckCards.oracleId, deckId: decks.id, deckName: decks.name })
    .from(deckCards)
    .innerJoin(decks, eq(deckCards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    // Matches `listDecksWithStats` exactly, down to the collation-proofing and
    // the id tiebreak. See the note there for why neither is decoration.
    .orderBy(asc(sql`lower(${decks.name})`), asc(decks.id));

  return firstDeckPerCard(rows);
});
