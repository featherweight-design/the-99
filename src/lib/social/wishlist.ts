/**
 * A friend's wishlist (Hugh's ruling Q7, 2026-10-12: the wishlist is VISIBLE to friends). Like every
 * cross-user read it lives here and joins the grant on the viewer in the SAME statement: the viewer's own
 * `friend_links` row to the friend named by `public_id`. A stranger, a forged id or a former friend reads
 * nothing. What comes back is the card (with the catalog's name and full card image, for the friend page's
 * tiles) and how many the friend wants; never how many they own, and never anything of their decks.
 *
 * A line the friend's collection already reaches is COLLECTED and is left out (Social R2 G5, Hugh, 2026-10-15):
 * it leaves the friend's own list at the write that reached it, and a line no chokepoint has swept yet must not
 * show here either. So there is no "got": every line returned is still wanted, and a friend's tile reads
 * `wants N` only (round 3).
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, friendLinks, socialProfiles, wishlistItems } from "../../db/schema";
import type { Reader } from "./access";
import { isUuid } from "./rules";

export type FriendWishlistLine = {
  oracleId: string;
  quantity: number;
  name: string;
  /** The catalog's full card image; null for a card Scryfall has no image of. */
  imageUri: string | null;
  layout: string;
  backImageUri: string | null;
};

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
      name: cards.name,
      imageUri: cards.imageUri,
      layout: cards.layout,
      backImageUri: cards.backImageUri,
    })
    .from(wishlistItems)
    .innerJoin(friendLinks, and(eq(friendLinks.friendUserId, wishlistItems.userId), eq(friendLinks.userId, viewerId)))
    .innerJoin(socialProfiles, and(eq(socialProfiles.userId, wishlistItems.userId), eq(socialProfiles.publicId, friendPublicId)))
    .innerJoin(cards, eq(cards.oracleId, wishlistItems.oracleId))
    .leftJoin(owned, and(eq(owned.userId, wishlistItems.userId), eq(owned.oracleId, wishlistItems.oracleId)))
    // Still wanted: the owner's collection holds fewer than they want (G5).
    // Written out qualified: Drizzle emits a subquery's column bare here, and a later join with an `n` would take it.
    .where(sql`coalesce("owned"."n", 0) < ${wishlistItems.quantity}`)
    .orderBy(sql`${wishlistItems.createdAt} desc`, asc(wishlistItems.oracleId));
}

export async function loadFriendWishlist(viewerId: string, friendPublicId: unknown): Promise<FriendWishlistLine[]> {
  if (!isUuid(friendPublicId)) return [];
  return friendWishlistQuery(viewerId, friendPublicId);
}
