import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isGameCardWhere } from "../cards/game-card-where";
import { nameSearch } from "../cards/name-search";

/**
 * Card search's reads (plan `2026-10-16-card-search.md`, PR A): any catalog card by name, and the reader's own
 * signals on a card. Search is a doorway into card details, so a row carries only what the result row draws
 * (lock 3): the art, the name, and what the reader owns and where.
 */

/** At most this many results, the read's own limit (README call 1: a foot line says to type more at 20). */
export const SEARCH_LIMIT = 20;

/** At most this many cards' signals in one read: the recent list's length (README call 5). */
export const SIGNALS_LIMIT = 8;

export type CardSearchHit = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  /** The Secret Lair name the query matched, when the oracle name did not (`printed as {flavor}`). */
  flavorName: string | null;
};

export type CardSignals = {
  /** Copies the reader holds, across every printing. */
  owned: number;
  /** The reader's decks holding the card, its commander or partner included, by name. */
  decks: string[];
  /** On the reader's wishlist and not yet collected. False while the wishlist is off for them. */
  wishlist: boolean;
};

export type CardSearchRow = CardSearchHit & CardSignals;

/**
 * Every game card whose name matches, best match first (G3): the name starting with the query, then a word in it
 * starting with it, then any match, then by name. No legality, identity or ownership filter: search looks up any
 * card, and a card a reader does not own is the common answer.
 */
export async function searchAllCards(query: string): Promise<CardSearchHit[]> {
  const match = nameSearch(query);
  if (!match) return [];
  const { flavorHits } = match;
  const rows = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      imageUri: cards.imageUri,
      flavorName: flavorHits.flavorName,
    })
    .from(cards)
    .leftJoin(flavorHits, eq(flavorHits.oracleId, cards.oracleId))
    .where(and(match.where, isGameCardWhere()))
    .orderBy(match.rank, asc(cards.name))
    .limit(SEARCH_LIMIT);
  return rows.map((r) => ({ ...r, flavorName: match.shownFlavor(r.name, r.flavorName) }));
}

/**
 * The reader's own signals on each card (lock 8: never another player's). Every subquery is scoped to `userId` in
 * its own SQL and correlates on an aliased, qualified column, never a bare one (the Drizzle projection rule).
 *
 * A wishlist line the collection already reaches is collected, and every own read leaves it out (`wishlist.ts`), so
 * the bookmark asks `quantity > owned` rather than whether a row exists.
 */
export function cardSignalsSql(userId: string, oracleIds: string[], wishlist: boolean) {
  return sql`
    select c.oracle_id as "oracleId",
      coalesce((
        select sum(ci.quantity) from collection_items ci
        where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id
      ), 0)::int as owned,
      coalesce((
        select array_agg(d.name order by d.name, d.id) from decks d
        where d.user_id = ${userId}
          and (
            d.commander_oracle_id = c.oracle_id
            or d.partner_oracle_id = c.oracle_id
            or exists (select 1 from deck_cards dc where dc.deck_id = d.id and dc.oracle_id = c.oracle_id)
          )
      ), '{}') as decks,
      ${wishlist ? sql`exists (
        select 1 from wishlist_items w
        where w.user_id = ${userId} and w.oracle_id = c.oracle_id
          and w.quantity > coalesce((
            select sum(ci2.quantity) from collection_items ci2
            where ci2.user_id = ${userId} and ci2.oracle_id = c.oracle_id
          ), 0)
      )` : sql`false`} as wishlist
    from cards c
    where c.oracle_id in (${sql.join(oracleIds.map((id) => sql`${id}::uuid`), sql`, `)})
  `;
}

/** Signals for each card asked about, keyed by oracle id. A card the catalog lacks is absent. */
export async function loadCardSignals(
  userId: string,
  oracleIds: readonly string[],
  opts: { wishlist: boolean },
): Promise<Map<string, CardSignals>> {
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return new Map();
  const { rows } = await db.execute<{ oracleId: string; owned: number; decks: string[]; wishlist: boolean }>(
    cardSignalsSql(userId, ids, opts.wishlist),
  );
  return new Map(rows.map((r) => [r.oracleId, { owned: Number(r.owned), decks: r.decks, wishlist: r.wishlist }]));
}

/** The hits with the reader's signals laid on; a hit with none reads as not owned, in no deck, not wished. */
export function withSignals(hits: readonly CardSearchHit[], signals: ReadonlyMap<string, CardSignals>): CardSearchRow[] {
  return hits.map((h) => ({ ...h, ...(signals.get(h.oracleId) ?? { owned: 0, decks: [], wishlist: false }) }));
}
