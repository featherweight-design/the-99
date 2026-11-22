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
import { cards, friendLinks, socialProfiles, wishlistItems } from "../../db/schema";
import { heldCopies } from "../wishlist/held";
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
    // Still wanted: the owner's collection holds fewer than they want (G5), counted the way the owner's own list counts
    // it: a line naming a printing counts only that printing's copies (`heldCopies`). The printing itself is never selected.
    .where(sql`${heldCopies(wishlistItems.userId, wishlistItems.oracleId, wishlistItems.scryfallId)} < ${wishlistItems.quantity}`)
    .orderBy(sql`${wishlistItems.createdAt} desc`, asc(wishlistItems.oracleId));
}

export async function loadFriendWishlist(viewerId: string, friendPublicId: unknown): Promise<FriendWishlistLine[]> {
  if (!isUuid(friendPublicId)) return [];
  return friendWishlistQuery(viewerId, friendPublicId);
}
