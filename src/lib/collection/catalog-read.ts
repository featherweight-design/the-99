import { and, asc, eq, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, printings, sets } from "../../db/schema";
import { isGameCardWhere } from "../cards/game-card-where";
import { nameSearch } from "../cards/name-search";
import { isFinish, type Finish } from "./key";

/**
 * The catalog reads behind the Add cards sheet and its edit mode (collection screens plan, PR 1):
 * finding a card, choosing its printing, and resolving the printing a write names.
 */

export type CatalogCardResult = {
  oracleId: string;
  name: string;
  typeLine: string;
  imageUri: string | null;
  manaCost: string | null;
  /** The Secret Lair name the query matched, when the oracle name did not. */
  flavorName: string | null;
  /** Copies of this card the player holds, across every printing. */
  owned: number;
};

/**
 * Every game card whose name matches, owned or not (handoff B2: never owned cards only).
 * Unlike the deck builder's search there is no legality, identity or ownership filter: a player
 * owns banned cards too, and a collection is not a deck.
 */
export async function searchCollectionCatalog(userId: string, query: string): Promise<CatalogCardResult[]> {
  const match = nameSearch(query);
  if (!match) return [];
  const { flavorHits } = match;
  // Summed per card once and joined in, rather than a correlated subquery per candidate row. Left
  // a bigint: each holding fits an integer, their sum across printings need not.
  const ownedTotals = db
    .select({
      oracleId: collectionItems.oracleId,
      qty: sql<string>`sum(${collectionItems.quantity})`.as("qty"),
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId)
    .as("owned_totals");
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
      flavorName: flavorHits.flavorName,
      owned: sql<string | number>`coalesce(${ownedTotals.qty}, 0)`,
    })
    .from(cards)
    .leftJoin(ownedTotals, eq(ownedTotals.oracleId, cards.oracleId))
    .leftJoin(flavorHits, eq(flavorHits.oracleId, cards.oracleId))
    .where(and(match.where, isGameCardWhere()))
    .orderBy(asc(cards.name))
    .limit(20);
  return rows.map((r) => ({ ...r, owned: Number(r.owned), flavorName: match.shownFlavor(r.name, r.flavorName) }));
}

export type PrintingChoice = {
  scryfallId: string;
  setCode: string;
  setName: string | null;
  collectorNumber: string;
  releasedAt: string | null;
  imageUri: string | null;
  flavorName: string | null;
  /** The finishes this printing exists in, in Scryfall's own vocabulary. */
  finishes: Finish[];
  /** Copies the player holds of this printing, per finish; empty when none. */
  owned: Partial<Record<Finish, number>>;
};

/**
 * Every catalog printing of one card, newest set first, each with what the player holds of it:
 * the required printing step's tiles (`you own ×N`) and the printings `Add another printing`
 * leaves out. `getCardDetail` cannot answer this: an owned card's detail carries only the owned
 * printings, and an unowned card's carries no holdings.
 */
export async function loadPrintingChoices(userId: string, oracleId: string): Promise<PrintingChoice[]> {
  const [catalog, held] = await Promise.all([
    db
      .select({
        scryfallId: printings.scryfallId,
        setCode: printings.setCode,
        setName: sets.name,
        collectorNumber: printings.collectorNumber,
        releasedAt: sets.releasedAt,
        imageUri: printings.imageUri,
        flavorName: printings.flavorName,
        finishes: printings.finishes,
      })
      .from(printings)
      // sets.code is the primary key, so this is at most 1:1 and multiplies no rows.
      .leftJoin(sets, eq(sets.code, printings.setCode))
      .where(eq(printings.oracleId, oracleId))
      .orderBy(sql`${sets.releasedAt} desc nulls last`, asc(printings.setCode), asc(printings.collectorNumber)),
    db
      .select({
        setCode: collectionItems.setCode,
        collectorNumber: collectionItems.collectorNumber,
        finish: collectionItems.finish,
        quantity: collectionItems.quantity,
      })
      .from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), eq(collectionItems.oracleId, oracleId))),
  ]);
  return withHoldings(catalog, held);
}

/** One holding the player has of a card, as the Edit copies sheet starts from it. */
export type CardHolding = {
  setCode: string;
  collectorNumber: string;
  finish: Finish;
  quantity: number;
  /** Carried across a printing fix: the new row takes the old one's condition. */
  condition: string | null;
};

/** Every holding the player has of one card, one row per printing and finish. */
export async function loadCardHoldings(userId: string, oracleId: string): Promise<CardHolding[]> {
  const rows = await db
    .select({
      setCode: collectionItems.setCode,
      collectorNumber: collectionItems.collectorNumber,
      finish: collectionItems.finish,
      quantity: collectionItems.quantity,
      condition: collectionItems.condition,
    })
    .from(collectionItems)
    .where(and(eq(collectionItems.userId, userId), eq(collectionItems.oracleId, oracleId)))
    .orderBy(asc(collectionItems.setCode), asc(collectionItems.collectorNumber), asc(collectionItems.finish));
  return rows.flatMap((r) => (isFinish(r.finish) ? [{ ...r, finish: r.finish }] : []));
}

/**
 * Lays the player's holdings over a card's catalog printings, per printing and finish, keeping
 * the catalog's order. A holding no printing names (a bare import's) is on no tile.
 */
export function withHoldings(
  catalog: (Omit<PrintingChoice, "owned" | "finishes"> & { finishes: string[] })[],
  held: { setCode: string; collectorNumber: string; finish: string; quantity: number }[],
): PrintingChoice[] {
  const owned = new Map<string, Partial<Record<Finish, number>>>();
  for (const h of held) {
    if (!isFinish(h.finish)) continue;
    const k = `${h.setCode}|${h.collectorNumber}`;
    const by = owned.get(k) ?? {};
    by[h.finish] = (by[h.finish] ?? 0) + h.quantity;
    owned.set(k, by);
  }
  return catalog.map((p) => ({
    ...p,
    finishes: p.finishes.filter(isFinish),
    owned: owned.get(`${p.setCode}|${p.collectorNumber}`) ?? {},
  }));
}

export type PrintingRef = { oracleId: string; setCode: string; collectorNumber: string };

/**
 * The catalog printing each ref names, keyed `oracleId|setCode|collectorNumber`, with its id and
 * finishes. A write takes `scryfall_id` from here and never from the client:
 * `collection_items.scryfall_id` has no foreign key, so a forged id would store another card's
 * art against this holding. A ref the catalog does not hold is simply absent.
 */
export async function resolvePrintings(refs: PrintingRef[]): Promise<Map<string, { scryfallId: string; finishes: string[] }>> {
  const out = new Map<string, { scryfallId: string; finishes: string[] }>();
  if (refs.length === 0) return out;
  for (const r of await resolvePrintingsQuery(refs)) {
    out.set(printingRefKey(r), { scryfallId: r.scryfallId, finishes: r.finishes });
  }
  return out;
}

/**
 * The read behind `resolvePrintings`, apart so a test can render it. Each ref's card, set and
 * collector number are matched TOGETHER, never as independent lists: lists would accept one ref's
 * card with another's set and number, which is a printing nobody named.
 */
export function resolvePrintingsQuery(refs: PrintingRef[]) {
  return db
    .select({
      oracleId: printings.oracleId, setCode: printings.setCode, collectorNumber: printings.collectorNumber,
      scryfallId: printings.scryfallId, finishes: printings.finishes,
    })
    .from(printings)
    .where(or(...refs.map((r) => and(
      eq(printings.oracleId, r.oracleId),
      eq(printings.setCode, r.setCode),
      eq(printings.collectorNumber, r.collectorNumber),
    ))));
}

export const printingRefKey = (r: PrintingRef) => `${r.oracleId}|${r.setCode}|${r.collectorNumber}`;
