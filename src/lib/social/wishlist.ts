/**
 * A friend's wishlist (Hugh's ruling Q7, 2026-10-12: the wishlist is VISIBLE to friends). Like every
 * cross-user read it lives here and joins the grant on the viewer in the SAME statement: the viewer's own
 * `friend_links` row to the friend named by `public_id`. A stranger, a forged id or a former friend reads
 * nothing. What comes back is the card, how many the friend wants, and whether they have it yet; never
 * how many they own, and never anything of their decks.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { collectionItems, friendLinks, socialProfiles, wishlistItems } from "../../db/schema";
import type { Reader } from "./access";
import { isUuid } from "./rules";

export type FriendWishlistLine = { oracleId: string; quantity: number; got: boolean };

/** Apart so a test can render its SQL. */
export function friendWishlistQuery(viewerId: string, friendPublicId: string, q: Reader = db) {
  const owned = q
    .select({
      userId: collectionItems.userId,
      oracleId: collectionItems.oracleId,
      n: sql<number>`sum(${collectionItems.quantity})::int`.as("n"),
    })
    .from(collectionItems)
    // Only the named account's collection is grouped, never every player's.
    .where(sql`${collectionItems.userId} = (select sp.user_id from ${socialProfiles} sp where sp.public_id = ${friendPublicId})`)
    .groupBy(collectionItems.userId, collectionItems.oracleId)
    .as("owned");
  return q
    .select({
      oracleId: wishlistItems.oracleId,
      quantity: wishlistItems.quantity,
      got: sql<boolean>`coalesce(${owned.n}, 0) >= ${wishlistItems.quantity}`,
    })
    .from(wishlistItems)
    .innerJoin(friendLinks, and(eq(friendLinks.friendUserId, wishlistItems.userId), eq(friendLinks.userId, viewerId)))
    .innerJoin(socialProfiles, and(eq(socialProfiles.userId, wishlistItems.userId), eq(socialProfiles.publicId, friendPublicId)))
    .leftJoin(owned, and(eq(owned.userId, wishlistItems.userId), eq(owned.oracleId, wishlistItems.oracleId)))
    .orderBy(sql`${wishlistItems.createdAt} desc`, asc(wishlistItems.oracleId));
}

export async function loadFriendWishlist(viewerId: string, friendPublicId: unknown): Promise<FriendWishlistLine[]> {
  if (!isUuid(friendPublicId)) return [];
  return friendWishlistQuery(viewerId, friendPublicId);
}
