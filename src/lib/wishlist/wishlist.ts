/**
 * The player's own wishlist (scope §2, Hugh's ruling Q7, 2026-10-12; Social R2). Card level: any printing will
 * do. A line's `quantity` is how many copies the player wants to own in all. Once the collection holds that many,
 * deck copies included, the card is COLLECTED and leaves the list (Social R2 G5, Hugh, 2026-10-15, reversing Q9's
 * "stays until cleared"): the collection write that reaches the want deletes the line and records it for the tab's
 * one-time strip (`collected.ts`). Every read here also leaves out a line the collection already reaches, so a read
 * never shows a collected card and never deletes one. Reads and writes here are the viewer's OWN rows only; a
 * friend's wishlist is read through `src/lib/social/wishlist.ts`, which joins the friendship.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, wishlistItems } from "../../db/schema";
import { loadPrices } from "../decks/price-query";
import type { PriceFact } from "../decks/price";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_WISHLIST_QUANTITY = 99;

/** A wanted count from untrusted input: a whole number from 1 to 99, or `null`. */
export function cleanQuantity(raw: unknown): number | null {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_WISHLIST_QUANTITY) return null;
  return n;
}

export type WishlistLine = { oracleId: string; quantity: number; owned: number; addedAt: Date };

/**
 * One owner's lines still WANTED (the collection holds fewer than wanted), with what it holds of each, newest
 * first. A collected line is left out here rather than deleted (G5: a read never deletes). Apart so a test can
 * render it.
 */
export function wishlistLinesQuery(ownerId: string, q: Pick<typeof db, "select"> = db) {
  const owned = q
    .select({ oracleId: collectionItems.oracleId, n: sql<number>`sum(${collectionItems.quantity})::int`.as("n") })
    .from(collectionItems)
    .where(eq(collectionItems.userId, ownerId))
    .groupBy(collectionItems.oracleId)
    .as("owned");
  return q
    .select({
      oracleId: wishlistItems.oracleId,
      quantity: wishlistItems.quantity,
      owned: sql<number>`coalesce(${owned.n}, 0)::int`,
      addedAt: wishlistItems.createdAt,
    })
    .from(wishlistItems)
    .leftJoin(owned, eq(owned.oracleId, wishlistItems.oracleId))
    .where(and(eq(wishlistItems.userId, ownerId), sql`coalesce(${owned.n}, 0) < ${wishlistItems.quantity}`))
    .orderBy(sql`${wishlistItems.createdAt} desc`, asc(wishlistItems.oracleId));
}

export async function loadWishlist(viewerId: string): Promise<WishlistLine[]> {
  return wishlistLinesQuery(viewerId);
}

/** A wishlist tile (Social R2 G1): the line, and the card it names as the collection's own grid draws it. */
export type WishlistTile = WishlistLine & {
  name: string;
  /** The catalog's full card image; null for a card Scryfall has no image of. */
  imageUri: string | null;
  layout: string;
  backImageUri: string | null;
  /** What one copy costs, from the price read every buy tag uses; null when the card has never been stocked. */
  price: PriceFact | null;
};

/** The viewer's wanted lines as tiles: the catalog's name and full card image, and the price read's figure. */
export async function loadWishlistTiles(viewerId: string): Promise<WishlistTile[]> {
  const lines = await wishlistLinesQuery(viewerId);
  if (lines.length === 0) return [];
  const ids = lines.map((l) => l.oracleId);
  const [faces, read] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, layout: cards.layout, backImageUri: cards.backImageUri })
      .from(cards)
      .where(inArray(cards.oracleId, ids)),
    loadPrices(ids),
  ]);
  const byId = new Map(faces.map((f) => [f.oracleId, f]));
  return lines.flatMap((l) => {
    const f = byId.get(l.oracleId);
    return f ? [{ ...l, name: f.name, imageUri: f.imageUri, layout: f.layout, backImageUri: f.backImageUri, price: read.prices.get(l.oracleId) ?? null }] : [];
  });
}

/**
 * How many copies the viewer wants of one card, for card details' Wishlist section, or null when the card is not
 * on the list (never put there, cleared, or collected). A malformed id reads as not on the list.
 */
export async function loadWishlistWant(viewerId: string, oracleId: string): Promise<number | null> {
  if (!UUID.test(oracleId)) return null;
  const [row] = await db
    .select({ quantity: wishlistItems.quantity })
    .from(wishlistItems)
    .where(and(
      eq(wishlistItems.userId, viewerId),
      eq(wishlistItems.oracleId, oracleId),
      sql`${wishlistItems.quantity} > (
        select coalesce(sum(ci.quantity), 0) from ${collectionItems} ci
        where ci.user_id = ${viewerId} and ci.oracle_id = ${oracleId}
      )`,
    ));
  return row?.quantity ?? null;
}

/**
 * What a want write did: `wanted`, the line stands; `held`, the want is no more than the collection already holds,
 * so there is nothing to want and no line stands (any earlier line for the card is gone); `null`, nothing was written
 * (bad input, or a card id the catalog does not hold).
 */
export type WantResult = "wanted" | "held" | null;

/**
 * Put a card on the viewer's wishlist wanting `quantity` copies, or change how many. A card id the catalog
 * does not hold writes nothing (checked in the statement, so no foreign-key error reaches the caller). A want the
 * collection already reaches, set new or lowered to what is held, leaves no line, and is NOT kept for the collected
 * strip: the player made that change in front of them, and the strip says what was collected "since you last looked".
 * Under the player's collection lock, so a collection write cannot land between the read of what is held and the
 * write.
 */
export async function setWishlistQuantity(viewerId: string, oracleId: unknown, rawQuantity: unknown = 1): Promise<WantResult> {
  const quantity = cleanQuantity(rawQuantity);
  if (typeof oracleId !== "string" || !UUID.test(oracleId) || quantity === null) return null;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${viewerId}, 0))`);
    const { rows: [card] } = await tx.execute<{ held: number }>(sql`
      select coalesce((
        select sum(ci.quantity) from ${collectionItems} ci where ci.user_id = ${viewerId} and ci.oracle_id = c.oracle_id
      ), 0)::int as held
      from ${cards} c where c.oracle_id = ${oracleId}
    `);
    if (!card) return null;
    if (quantity <= card.held) {
      await tx.delete(wishlistItems).where(and(eq(wishlistItems.userId, viewerId), eq(wishlistItems.oracleId, oracleId)));
      return "held";
    }
    await tx.execute(sql`
      insert into ${wishlistItems} (user_id, oracle_id, quantity) values (${viewerId}, ${oracleId}, ${quantity})
      on conflict (user_id, oracle_id) do update set quantity = excluded.quantity
    `);
    return "wanted";
  });
}

/** Clear a line the player no longer wants. */
export async function clearWishlistLine(viewerId: string, oracleId: unknown): Promise<boolean> {
  if (typeof oracleId !== "string" || !UUID.test(oracleId)) return false;
  const gone = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, viewerId), eq(wishlistItems.oracleId, oracleId)))
    .returning({ oracleId: wishlistItems.oracleId });
  return gone.length > 0;
}
