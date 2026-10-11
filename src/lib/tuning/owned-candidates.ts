import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, collectionItems, commanderSupportCards } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { priceOf, priceState } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import { printedIn } from "../sets/printed-in";

/**
 * The cards the player owns that this deck could take, for a run whose "owned only" limit is set.
 *
 * WHY THE MODEL IS SHOWN THEM. `limitsRules` told the model "every suggested add must be a card
 * the player already owns" and showed it nothing about what the player owns (ownership is kept out
 * of the pack so it cannot sway a ranking), so it guessed, and the validator dropped every guess
 * (`notOwned`): Soldiers on staging asked for five adds and kept none. Owned-only is the player's
 * OWN rule, not a per-card fact leaking in to bias a choice, so the model is handed the list the
 * rule selects from. With the limit off nothing here runs and ownership still reaches the model
 * nowhere (`suggestionRules.ownershipNotRanking`).
 *
 * WHAT QUALIFIES, in the order the validator would check it: on a commander index row for these
 * commanders, owned, commander-legal, inside the colour identity, not already in the deck, not a
 * basic land, a copy FREE of every other deck (the same "sleeveable" rule `resolveAnswer` applies,
 * or a card listed here would be dropped as `notOwned` after the model chose it), printed in a
 * selected set, and under the price cap (a card with no usable price passes, as in the validator).
 *
 * RANKED by the commander index's inclusion for the commander, which is a fact about the CARD in
 * decks like this one and says nothing about who owns it. A partner pair reads both commanders'
 * lists, the larger inclusion of the two for a card on both.
 */
export type OwnedCandidate = { oracleId: string; name: string; typeLine: string };

/**
 * Most names sent. A name and type line run about 12 tokens, so the list is under 1,000 tokens at
 * this size, which the model reads against the 99 it already gets. More than this has stopped being
 * a shortlist: the model needs candidates it can compare, not the whole collection.
 */
export const OWNED_SHORTLIST_MAX = 80;

/** Rows per page, and the most pages read: 2,000 ranked owned cards is deeper than any commander's index list that a collection overlaps. */
const PAGE = 200;
const MAX_PAGES = 10;

export async function loadOwnedCandidates(args: {
  userId: string;
  deckId: string;
  commanderOracleIds: readonly string[];
  colorIdentity: readonly string[];
  inDeck: ReadonlySet<string>;
  limits: { capCents: number | null; sets: readonly string[] };
  max?: number;
}): Promise<OwnedCandidate[]> {
  const { userId, deckId, commanderOracleIds, colorIdentity, inDeck, limits } = args;
  const max = args.max ?? OWNED_SHORTLIST_MAX;
  if (commanderOracleIds.length === 0) return [];

  const capCents = limits.capCents;
  const out: OwnedCandidate[] = [];
  // Ranked rows are read a page at a time until the shortlist is full or the index is exhausted. The
  // free-copy and price tests need the other tables' reads, so they cannot sit in this query; a single
  // fixed read-ahead would let a collection whose top-ranked cards are claimed elsewhere (or over the
  // cap) come back empty, and an empty list sends the run to cards to buy while the player owns fits.
  for (let page = 0; page < MAX_PAGES && out.length < max; page++) {
    const rows = await db
      .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine })
      .from(commanderSupportCards)
      .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
      .where(and(
        inArray(commanderSupportCards.commanderOracleId, [...commanderOracleIds]),
        eq(cards.commanderLegal, true),
        // `isBasicLand`'s own word test (grouping.ts): "Basic Snow Land" is a basic too.
        sql`${cards.typeLine} !~ '\\yBasic\\y'`,
        // The identity, the deck and the set limit are filtered in the query, before the page cut.
        sql`${cards.colorIdentity} <@ ${sql.param([...colorIdentity])}::text[]`,
        ...(inDeck.size > 0 ? [sql`${cards.oracleId} <> all(${sql.param([...inDeck])}::uuid[])`] : []),
        sql`${printedIn(cards.oracleId, limits.sets)}`,
        sql`exists (select 1 from ${collectionItems} ci where ci.user_id = ${userId} and ci.oracle_id = ${cards.oracleId})`,
      ))
      .groupBy(cards.oracleId)
      // The name breaks ties, so a page boundary never repeats or skips a card.
      .orderBy(sql`max(${commanderSupportCards.inclusion}) desc nulls last`, cards.name)
      .limit(PAGE)
      .offset(page * PAGE);
    if (rows.length === 0) break;

    const ids = rows.map((r) => r.oracleId);
    const [availability, priced] = await Promise.all([
      loadAvailability(userId, { oracleIds: ids, excludeDeckId: deckId }),
      capCents === null ? null : loadPrices(ids),
    ]);
    for (const r of rows) {
      const free = availability.get(r.oracleId);
      if (free !== undefined && free.free <= 0) continue;
      if (priced !== null && capCents !== null) {
        const fact = priced.prices.get(r.oracleId) ?? null;
        const cents = fact ? priceOf(fact, priceState(fact, priced.newestAsOf)) : null;
        if (cents !== null && cents > capCents) continue;
      }
      out.push({ oracleId: r.oracleId, name: r.name, typeLine: r.typeLine });
      if (out.length >= max) break;
    }
    if (rows.length < PAGE) break;
  }
  return out;
}
