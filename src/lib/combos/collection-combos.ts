// The Collection's combos view data: every two-card combo the reader owns BOTH pieces of, or exactly ONE.
// Loaded when the view opens (`GET /api/collection-combos`), never with the list: the list carries only the
// chip's count (`comboPairCount`).
//
// WHAT EACH SIDE MEANS
//   both: `ownBothPairsQuery`: every pair, assembled ones included, with `heldIn` naming the reader's deck that
//         holds both (alphabetical by name, then id, when several do). No `heldIn` is "In no deck together".
//         The card-detail clause's `ownBothQuery` still drops assembled pairs; this view is the one that draws them.
//   one:  `ownOneQuery`: one piece held, the other not. The missing piece carries the reader's cheapest live
//         price in their store (null reads as silence) and the drafts that already ask for it ("Wanted by").
//
// A PAIR, NOT A CARD: `distinctPairs` folds A+B and B+A, and a pair recorded under two variants, into one row.
// The payload ships raw `produces` features; the view maps the result word.
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { chainArt } from "../cards/chain-art";
import { cheapestLiveCents } from "../cards/price-lookup";
import { loadOwnedPrintingPrices } from "../cards/prices";
import type { Store } from "../stores/rows";
import { distinctPairs, ownBothPairsQuery, ownOneQuery, type DistinctPair, type PairRow } from "./near-miss";

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
  /** Own-both only: the reader's deck already holding both pieces. Absent when no deck does. */
  heldIn?: { id: string; name: string };
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
  // A deck WANTS a card when its draft list holds it or when it is the deck's commander or partner, the same
  // holding test `ownBothPairsQuery` uses (a commander is not a `deck_cards` row).
  const drafted = await db
    .select({ oracleId: deckCards.oracleId, id: decks.id, name: decks.name })
    .from(deckCards)
    .innerJoin(decks, eq(decks.id, deckCards.deckId))
    .where(and(eq(decks.userId, userId), inArray(deckCards.oracleId, oracleIds)));
  const led = await db
    .select({ id: decks.id, name: decks.name, commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .where(and(eq(decks.userId, userId), or(inArray(decks.commanderOracleId, oracleIds), inArray(decks.partnerOracleId, oracleIds))));
  const want = new Map<string, Map<string, string>>();
  const add = (oracleId: string | null, id: string, name: string) => {
    if (!oracleId || !oracleIds.includes(oracleId)) return;
    // Keyed on the deck id: a deck on several rows, or both drafting and leading a card, is wanted once.
    (want.get(oracleId) ?? want.set(oracleId, new Map()).get(oracleId)!).set(id, name);
  };
  for (const r of drafted) add(r.oracleId, r.id, r.name);
  for (const r of led) {
    add(r.commander, r.id, r.name);
    add(r.partner, r.id, r.name);
  }
  // Name then id, so the chips keep their order between loads (the same rule as the own-both holding deck).
  for (const [oracleId, decksOf] of want) {
    out.set(
      oracleId,
      [...decksOf].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name) || x.id.localeCompare(y.id)),
    );
  }
  return out;
}

const noDecks = new Map<string, { id: string; name: string }[]>();

export async function loadCollectionCombos(args: { userId: string; store: Store; side: ComboSide }): Promise<CollectionCombos> {
  const { userId, store, side } = args;
  const query = side === "both" ? ownBothPairsQuery(userId, { deck: true }) : ownOneQuery(userId);
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
  // The hover preview shows the printing card details opens: the copy the reader owns, else the catalog's.
  // Fail-soft: a failed read leaves the catalog art.
  const ownedArt = await chainArt(userId, null, pieceIds, store).catch(() => new Map<string, string | null>());
  const piece = (p: { oracleId: string; name: string }): ComboPiece => ({
    oracleId: p.oracleId,
    name: p.name,
    imageUri: ownedArt.get(p.oracleId) ?? artById.get(p.oracleId)?.imageUri ?? null,
    artCropUri: artById.get(p.oracleId)?.artCropUri ?? null,
  });

  const missingIds = side === "one" ? [...new Set(picked.map((p) => p.missingId).filter((id): id is string => !!id))] : [];
  // A failed price read costs the price, never the list: silence is the honest outcome.
  const [prices, wanted] = await Promise.all([
    side === "one" ? loadOwnedPrintingPrices(missingIds, store).catch(() => null) : Promise.resolve(null),
    side === "one" ? wantedByDecks(userId, missingIds).catch(() => noDecks) : Promise.resolve(noDecks),
  ]);

  const pairs = picked.map((p): CollectionComboPair => {
    const base = { variantId: p.variantId, produces: p.produces, popularity: p.popularity, a: piece(p.a), b: piece(p.b) };
    if (side === "both") return p.heldIn ? { ...base, heldIn: p.heldIn } : base;
    if (!p.missingId) return base;
    return {
      ...base,
      missingId: p.missingId,
      missingCents: prices ? cheapestLiveCents(prices.get(p.missingId)) : null,
      wantedBy: wanted.get(p.missingId) ?? [],
    };
  });
  return { side, total: all.length, pairs };
}
