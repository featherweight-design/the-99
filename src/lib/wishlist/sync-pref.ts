/**
 * Whether the reader's wishlist sync is on (`user_prefs.wishlist_sync`; no row is off). Its own module, reading one
 * table, because `/decks` reads it inside its cached payload (the ⋯ menu's Keep off my wishlist draws only while it is
 * on), and the list-cache guard counts every table a payload's modules reach: `user_prefs` carries the stamp trigger.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

export async function readWishlistSync(userId: string): Promise<boolean> {
  const [row] = await db.select({ on: userPrefs.wishlistSync }).from(userPrefs).where(eq(userPrefs.userId, userId));
  return row?.on === true;
}
