// The Collection's combos view data: every two-card combo the reader owns BOTH pieces of, or exactly ONE.
// Loaded when the view opens (`GET /api/collection-combos`), never with the list: the list carries only the
// chip's count (`comboPairCount`).
//
// WHAT EACH SIDE MEANS
//   both: `ownBothQuery`, which already excludes any pair a single deck holds both of, so an own-both pair is
//         always "in no deck together". There is no "Both in <deck>" state to carry.
//   one:  `ownOneQuery`: one piece held, the other not. The missing piece carries the reader's cheapest live
//         price in their store (null reads as silence) and the drafts that already ask for it ("Wanted by").
//
// A PAIR, NOT A CARD: `distinctPairs` folds A+B and B+A, and a pair recorded under two variants, into one row.
// The payload ships raw `produces` features; the view maps the result word.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { cheapestLiveCents } from "../cards/price-lookup";
import { loadOwnedPrintingPrices } from "../cards/prices";
import type { Store } from "../stores/rows";
import { distinctPairs, ownBothQuery, ownOneQuery, type DistinctPair, type PairRow } from "./near-miss";

export type ComboSide = "both" | "one";

/** The most pairs one response carries, most popular first. `total` says how many there were. */
export const MAX_COMBO_PAIRS = 300;

export type ComboPiece = { oracleId: string; name: string; imageUri: string | null; artCropUri: string | null };

export type CollectionComboPair = {
  variantId: string;
  produces: string[];
  popularity: number | null;
  a: ComboPiece;
  b: ComboPiece;
  /** Own-one only: the piece the reader does not hold, an oracle id of `a` or `b`. */
  missingId?: string;
  /** Own-one only: cheapest live price of the missing piece in the reader's store, null when none is read. */
  missingCents?: number | null;
  /** Own-one only: the reader's decks whose draft list already holds the missing piece. */
  wantedBy?: { id: string; name: string }[];
};

export type CollectionCombos = { side: ComboSide; total: number; pairs: CollectionComboPair[] };

/** Wanted-by rows grouped by card. Rooted in the READER's own decks: another reader's deck can never appear. */
async function wantedByDecks(userId: string, oracleIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const out = new Map<string, { id: string; name: string }[]>();
  if (oracleIds.length === 0) return out;
  const rows = await db
    .select({ oracleId: deckCards.oracleId, id: decks.id, name: decks.name })
    .from(deckCards)
    .innerJoin(decks, eq(decks.id, deckCards.deckId))
    .where(and(eq(decks.userId, userId), inArray(deckCards.oracleId, oracleIds)));
  for (const r of rows) {
    const list = out.get(r.oracleId);
    if (list) list.push({ id: r.id, name: r.name });
    else out.set(r.oracleId, [{ id: r.id, name: r.name }]);
  }
  return out;
}

export async function loadCollectionCombos(args: { userId: string; store: Store; side: ComboSide }): Promise<CollectionCombos> {
  const { userId, store, side } = args;
  const query = side === "both" ? ownBothQuery(userId, null) : ownOneQuery(userId);
  const rows = (await db.execute(query)).rows as PairRow[];
  const all: DistinctPair[] = distinctPairs(rows, { oneSided: side === "one" });
  const picked = all.slice(0, MAX_COMBO_PAIRS);
  if (picked.length === 0) return { side, total: all.length, pairs: [] };

  const pieceIds = [...new Set(picked.flatMap((p) => [p.a.oracleId, p.b.oracleId]))];
  const art = await db
    .select({ oracleId: cards.oracleId, imageUri: cards.imageUri, artCropUri: cards.artCropUri })
    .from(cards)
    .where(inArray(cards.oracleId, pieceIds));
  const artById = new Map(art.map((r) => [r.oracleId, r]));
  const piece = (p: { oracleId: string; name: string }): ComboPiece => ({
    oracleId: p.oracleId,
    name: p.name,
    imageUri: artById.get(p.oracleId)?.imageUri ?? null,
    artCropUri: artById.get(p.oracleId)?.artCropUri ?? null,
  });

  const missingIds = side === "one" ? [...new Set(picked.map((p) => p.missingId).filter((id): id is string => !!id))] : [];
  // A failed price read costs the price, never the list: silence is the honest outcome.
  const [prices, wanted] = await Promise.all([
    side === "one" ? loadOwnedPrintingPrices(missingIds, store).catch(() => null) : Promise.resolve(null),
    side === "one" ? wantedByDecks(userId, missingIds).catch(() => new Map<string, { id: string; name: string }[]>()) : Promise.resolve(new Map<string, { id: string; name: string }[]>()),
  ]);

  const pairs = picked.map((p): CollectionComboPair => {
    const base = { variantId: p.variantId, produces: p.produces, popularity: p.popularity, a: piece(p.a), b: piece(p.b) };
    if (side === "both" || !p.missingId) return base;
    return {
      ...base,
      missingId: p.missingId,
      missingCents: prices ? cheapestLiveCents(prices.get(p.missingId)) : null,
      wantedBy: wanted.get(p.missingId) ?? [],
    };
  });
  return { side, total: all.length, pairs };
}
