// The loaders behind the deck's four figures. Everything they return is
// computed by the pure functions in `./stats`; this file only fetches.
//
// USER-SCOPED, ALWAYS. Every query filters `decks.user_id`, so a deck id
// belonging to someone else comes back absent rather than as a stat block. A
// caller holding one deck id passes it as the narrowing, never as the
// authorisation.
//
// BOTH COMMANDERS COUNT. They are not `deck_cards` rows — `decks` holds them in
// their own two columns — so the decklist join alone would draw a colour spread
// with the deck's identity anchor missing from it, and a curve short the one
// card the deck is guaranteed to cast. They are read separately and folded in
// at one copy each.
//
// Cost to complete is NOT computed here. It is `loadShoppingRollup`, which
// already answers "what does this deck have to buy, and what does that cost"
// through the seniority model and the ManaPool read — a second definition would
// be a second answer. Its `pricedCopies` rides along for the same reason it
// does there: an unpriced copy is neither free nor unknown, and a surface
// saying "$18.40" needs to be able to say "12 of 15 priced" beside it.

import { eq, inArray, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckCards, deckGames, decks } from "../../db/schema";
import {
  colourSpread,
  manaCurve,
  recordFromCounts,
  type ColourSpread,
  type GameResult,
  type ManaCurve,
  type PlayRecord,
} from "./stats";
import { loadShoppingRollup, type DeckShopping } from "./shopping-rollup";

export type DeckStats = {
  deckId: string;
  record: PlayRecord;
  colours: ColourSpread;
  curve: ManaCurve;
  /**
   * What the cards this deck still has to buy cost. Null when the deck buys
   * nothing — distinct from a zero total, which is what a deck with copies to
   * buy and no price for any of them would read as.
   */
  cost: DeckShopping | null;
};

type DeckIds = { userId: string; deckIds?: string[] };

/** `cards` a second time, for the partner — a table joined twice needs a name
 *  for each side or the columns are ambiguous. */
const partner = alias(cards, "partner_cards");

/** The deck ids this user owns, narrowed to `deckIds` when one was passed. A
 *  requested id the user does not own simply does not come back. */
async function ownedDeckIds({ userId, deckIds }: DeckIds): Promise<string[]> {
  if (deckIds && deckIds.length === 0) return [];
  const rows = await db
    .select({ id: decks.id })
    .from(decks)
    .where(
      deckIds
        ? and(eq(decks.userId, userId), inArray(decks.id, deckIds))
        : eq(decks.userId, userId),
    );
  return rows.map((r) => r.id);
}

/**
 * Every deck's stats, or the stats of the decks named.
 *
 * A FIXED NUMBER OF READS, not one per deck. The ownership narrowing runs
 * first, then the decklist join, the commander read, the grouped game tally and
 * the shopping roll-up — itself a buy-row query and a price query — each answer
 * for the whole set at once and the four run in parallel. Home's roll-up over
 * every deck therefore costs the same round trips as a single deck page.
 *
 * A deck with no cards, no games and nothing to buy still gets an entry — the
 * zero state is a real answer and a caller should not have to distinguish
 * "empty deck" from "deck I failed to ask about".
 */
export async function loadDeckStats(input: DeckIds): Promise<Map<string, DeckStats>> {
  const ids = await ownedDeckIds(input);
  const stats = new Map<string, DeckStats>();
  if (ids.length === 0) return stats;

  const [listRows, commanderRows, gameRows, rollup] = await Promise.all([
    db
      .select({
        deckId: deckCards.deckId,
        quantity: deckCards.quantity,
        cmc: cards.cmc,
        typeLine: cards.typeLine,
        colorIdentity: cards.colorIdentity,
      })
      .from(deckCards)
      .innerJoin(cards, eq(cards.oracleId, deckCards.oracleId))
      .where(inArray(deckCards.deckId, ids)),
    db
      .select({
        deckId: decks.id,
        cmc: cards.cmc,
        typeLine: cards.typeLine,
        colorIdentity: cards.colorIdentity,
        partnerCmc: partner.cmc,
        partnerTypeLine: partner.typeLine,
        partnerColorIdentity: partner.colorIdentity,
      })
      .from(decks)
      .innerJoin(cards, eq(cards.oracleId, decks.commanderOracleId))
      // LEFT, because most decks have no partner. An inner join here would drop
      // every single-commander deck out of this read entirely.
      .leftJoin(partner, eq(partner.oracleId, decks.partnerOracleId))
      .where(inArray(decks.id, ids)),
    // Grouped in Postgres rather than reading one row per game: the record is
    // three counts, and a deck with fifty games has no reason to send fifty
    // rows across for them.
    db
      .select({
        deckId: deckGames.deckId,
        result: deckGames.result,
        games: sql<number>`count(*)::int`,
      })
      .from(deckGames)
      .where(and(eq(deckGames.userId, input.userId), inArray(deckGames.deckId, ids)))
      .groupBy(deckGames.deckId, deckGames.result),
    // Narrowed to the decks being answered for: a deck page asking for one deck
    // should not pay to price the rest of the player's shopping list. The
    // seniority model behind it stays user-wide — see loadShoppingRollup.
    loadShoppingRollup(input.userId, ids),
  ]);

  type StatCard = { quantity: number; cmc: number; typeLine: string; colorIdentity: string[] };
  const listByDeck = new Map<string, StatCard[]>();
  const push = (deckId: string, card: StatCard) => {
    const list = listByDeck.get(deckId) ?? [];
    list.push(card);
    listByDeck.set(deckId, list);
  };

  for (const row of listRows) push(row.deckId, row);
  for (const row of commanderRows) {
    push(row.deckId, {
      quantity: 1,
      cmc: row.cmc,
      typeLine: row.typeLine,
      colorIdentity: row.colorIdentity,
    });
    if (row.partnerTypeLine !== null && row.partnerColorIdentity !== null) {
      push(row.deckId, {
        quantity: 1,
        cmc: row.partnerCmc ?? 0,
        typeLine: row.partnerTypeLine,
        colorIdentity: row.partnerColorIdentity,
      });
    }
  }

  // The grouped counts are tallied as counts. Expanding them back into one
  // object per game would make this loader's cost grow with a player's whole
  // game history to produce three numbers.
  const countsByDeck = new Map<string, { result: GameResult; games: number }[]>();
  for (const row of gameRows) {
    const list = countsByDeck.get(row.deckId) ?? [];
    list.push({ result: row.result as GameResult, games: row.games });
    countsByDeck.set(row.deckId, list);
  }

  for (const deckId of ids) {
    const list = listByDeck.get(deckId) ?? [];
    const counts = countsByDeck.get(deckId) ?? [];
    stats.set(deckId, {
      deckId,
      record: recordFromCounts(counts),
      colours: colourSpread(list),
      curve: manaCurve(list),
      cost: rollup.byDeck.get(deckId) ?? null,
    });
  }

  return stats;
}

/** One deck, for a deck page. Absent — null — when the user does not own it. */
export async function loadOneDeckStats(
  deckId: string,
  userId: string,
): Promise<DeckStats | null> {
  const stats = await loadDeckStats({ userId, deckIds: [deckId] });
  return stats.get(deckId) ?? null;
}
