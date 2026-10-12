// "Your collection, put to work" (handoff R1 call 7, R2 CollectionCard): the collection's reads. SERVER-ONLY.
//
// PER COPY OWNED (ruling 3, lock 3): each owned copy is in a deck or not by `min(owned, needed by the decks in
// scope)`, so a card several decks play counts once per copy, never once per deck. Basics are not counted.
// Value is priced by the buy tag's rule (`loadPrices`, the cheapest copy in stock today), the rule Money uses.
// Both scopes are counted here, All decks and Finished only, so the client never needs the whole collection.
//
// WANTED BY YOUR COMMANDERS (G9): one index read over every deck's commander, and for a partner deck the
// pair's own list (`commander_pair_support_cards`, never either commander's alone, as `readCutSupport` reads
// it), for owned cards at 20% or more of those decks.

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, commanderPairSupport, commanderPairSupportCards, commanderSupport, commanderSupportCards } from "../../db/schema";
import { isBasicLand } from "../decks/grouping";
import { summarisePrices, type PricedCard } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import { chainArt } from "../cards/chain-art";
import { canonicalPair } from "../edhrec/pair-order";
import type { LineupCollection } from "./types";

/** The lowest cut the card offers; the reads keep nothing under it. */
export const WANT_FLOOR_PCT = 20;

type Need = { deckId: string; oracleId: string; quantity: number };
type Head = { deckId: string; commander: string; partner: string | null };

export async function readCollection(userId: string, needs: readonly Need[], heads: readonly Head[], brews: ReadonlySet<string>): Promise<{ collection: LineupCollection; asOf: Date | null }> {
  const owned = (await db
    .select({ oracleId: collectionItems.oracleId, name: cards.name, typeLine: cards.typeLine, imageUri: cards.imageUri, copies: sql<number>`sum(${collectionItems.quantity})::int` })
    .from(collectionItems)
    .innerJoin(cards, eq(cards.oracleId, collectionItems.oracleId))
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId, cards.name, cards.typeLine, cards.imageUri))
    .filter((r) => r.copies > 0 && !isBasicLand(r.typeLine));
  const ids = owned.map((r) => r.oracleId);
  const singles = heads.filter((h) => !h.partner);
  const pairs = heads.filter((h) => h.partner).map((h) => ({ deckId: h.deckId, ...canonicalPair(h.commander, h.partner!) }));
  const [read, single, pair] = await Promise.all([
    loadPrices(ids),
    ids.length === 0 || singles.length === 0 ? [] : db
      .select({ commander: commanderSupportCards.commanderOracleId, oracleId: commanderSupportCards.oracleId, inclusion: commanderSupportCards.inclusion })
      .from(commanderSupportCards)
      .innerJoin(commanderSupport, eq(commanderSupport.commanderOracleId, commanderSupportCards.commanderOracleId))
      .where(and(
        eq(commanderSupport.synergyState, "ok"),
        inArray(commanderSupportCards.commanderOracleId, [...new Set(singles.map((h) => h.commander))]),
        inArray(commanderSupportCards.oracleId, ids),
        gte(commanderSupportCards.inclusion, WANT_FLOOR_PCT),
      )),
    ids.length === 0 || pairs.length === 0 ? [] : db
      .select({ a: commanderPairSupportCards.commanderOracleId, b: commanderPairSupportCards.partnerOracleId, oracleId: commanderPairSupportCards.oracleId, inclusion: commanderPairSupportCards.inclusion })
      .from(commanderPairSupportCards)
      .innerJoin(commanderPairSupport, and(
        eq(commanderPairSupport.commanderOracleId, commanderPairSupportCards.commanderOracleId),
        eq(commanderPairSupport.partnerOracleId, commanderPairSupportCards.partnerOracleId),
      ))
      .where(and(
        eq(commanderPairSupport.synergyState, "ok"),
        inArray(commanderPairSupportCards.commanderOracleId, [...new Set(pairs.map((p) => p.commanderOracleId))]),
        inArray(commanderPairSupportCards.oracleId, ids),
        gte(commanderPairSupportCards.inclusion, WANT_FLOOR_PCT),
      )),
  ]);

  const needAll = new Map<string, number>();
  const needFinished = new Map<string, number>();
  const wantsByCard = new Map<string, { deckId: string; n: number }[]>();
  for (const n of needs) {
    needAll.set(n.oracleId, (needAll.get(n.oracleId) ?? 0) + n.quantity);
    if (!brews.has(n.deckId)) needFinished.set(n.oracleId, (needFinished.get(n.oracleId) ?? 0) + n.quantity);
    wantsByCard.set(n.oracleId, [...(wantsByCard.get(n.oracleId) ?? []), { deckId: n.deckId, n: n.quantity }]);
  }
  const priced = (oracleId: string, quantity: number): PricedCard => ({ quantity, price: read.prices.get(oracleId) ?? null });
  const scope = (need: ReadonlyMap<string, number>) => {
    const inDeck = owned.map((r) => ({ id: r.oracleId, q: Math.min(r.copies, need.get(r.oracleId) ?? 0) }));
    return {
      inDeckCopies: inDeck.reduce((n, r) => n + r.q, 0),
      inDeckCents: summarisePrices(inDeck.filter((r) => r.q > 0).map((r) => priced(r.id, r.q)), read.newestAsOf).totalCents,
    };
  };

  const hits = new Map<string, { deckId: string; pct: number }[]>();
  const add = (oracleId: string, deckId: string, pct: number | null) => {
    if (pct === null) return;
    hits.set(oracleId, [...(hits.get(oracleId) ?? []), { deckId, pct }]);
  };
  for (const r of single) for (const h of singles) if (h.commander === r.commander) add(r.oracleId, h.deckId, r.inclusion);
  for (const r of pair) for (const p of pairs) if (p.commanderOracleId === r.a && p.partnerOracleId === r.b) add(r.oracleId, p.deckId, r.inclusion);

  const wanted = owned.filter((r) => hits.has(r.oracleId));
  // Each wanted name previews the printing card details opens: the one the player owns (the chain, at the draw).
  const art = await chainArt(userId, null, wanted.map((r) => r.oracleId));
  return {
    asOf: read.newestAsOf,
    collection: {
      copies: owned.reduce((n, r) => n + r.copies, 0),
      cards: owned.length,
      ...(({ totalCents, pricedCopies }) => ({ valueCents: totalCents, pricedCopies }))(summarisePrices(owned.map((r) => priced(r.oracleId, r.copies)), read.newestAsOf)),
      all: scope(needAll),
      finished: scope(needFinished),
      wanted: wanted.map((r) => ({
        oracleId: r.oracleId,
        name: r.name,
        imageUri: art.get(r.oracleId) ?? r.imageUri,
        owned: r.copies,
        wants: wantsByCard.get(r.oracleId) ?? [],
        hits: hits.get(r.oracleId)!,
      })),
    },
  };
}
