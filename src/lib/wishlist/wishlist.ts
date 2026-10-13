/**
 * The player's own wishlist (scope §2, Hugh's rulings Q7 and Q9, 2026-10-12). Card level: any printing
 * will do. A line's `quantity` is how many copies the player wants to own in all, and it reads as GOT once
 * the collection holds that many; GOT is derived on every read and never stored, so a line stays, drawn as
 * got, until the player clears it (Q9). Reads and writes here are the viewer's OWN rows only; a friend's
 * wishlist is read through `src/lib/social/wishlist.ts`, which joins the friendship.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, wishlistItems } from "../../db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_WISHLIST_QUANTITY = 99;

/** A wanted count from untrusted input: a whole number from 1 to 99, or `null`. */
export function cleanQuantity(raw: unknown): number | null {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_WISHLIST_QUANTITY) return null;
  return n;
}

export type WishlistLine = { oracleId: string; quantity: number; owned: number; got: boolean; addedAt: Date };

/** One owner's lines with what their collection holds of each, newest first. Apart so a test can render it. */
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
    .where(eq(wishlistItems.userId, ownerId))
    .orderBy(sql`${wishlistItems.createdAt} desc`, asc(wishlistItems.oracleId));
}

export function toLines(rows: { oracleId: string; quantity: number; owned: number; addedAt: Date }[]): WishlistLine[] {
  return rows.map((r) => ({ ...r, got: r.owned >= r.quantity }));
}

export async function loadWishlist(viewerId: string): Promise<WishlistLine[]> {
  return toLines(await wishlistLinesQuery(viewerId));
}

/**
 * Put a card on the viewer's wishlist wanting `quantity` copies, or change how many. A card id the catalog
 * does not hold writes nothing (checked in the statement, so no foreign-key error reaches the caller).
 */
export async function setWishlistQuantity(viewerId: string, oracleId: unknown, rawQuantity: unknown = 1): Promise<boolean> {
  const quantity = cleanQuantity(rawQuantity);
  if (typeof oracleId !== "string" || !UUID.test(oracleId) || quantity === null) return false;
  const written = await db.execute<{ oracle_id: string }>(sql`
    insert into ${wishlistItems} (user_id, oracle_id, quantity)
    select ${viewerId}, c.oracle_id, ${quantity} from ${cards} c where c.oracle_id = ${oracleId}
    on conflict (user_id, oracle_id) do update set quantity = excluded.quantity
    returning oracle_id
  `);
  return written.rows.length > 0;
}

/** Clear a line, got or not (Q9: a got line stays until the player clears it). */
export async function clearWishlistLine(viewerId: string, oracleId: unknown): Promise<boolean> {
  if (typeof oracleId !== "string" || !UUID.test(oracleId)) return false;
  const gone = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, viewerId), eq(wishlistItems.oracleId, oracleId)))
    .returning({ oracleId: wishlistItems.oracleId });
  return gone.length > 0;
}
