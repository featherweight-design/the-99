/**
 * What a friend page's three tabs read, each cached for the request so the layout (which draws every tab's figure
 * on the strip) and the tab's own page share one read, never two. `cache` keys on its arguments, so the viewer's
 * id and the public id are the key: a request for one friend never answers another's.
 */
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import type { Reader } from "./access";
import { isUuid } from "./rules";
import { loadFriendDecks } from "./decks";
import { loadFriendSpareList } from "./spares";
import { loadFriendWishlist } from "./wishlist";

export const friendSpareList = cache((viewerId: string, publicId: string, wishlist: boolean) => loadFriendSpareList(viewerId, publicId, wishlist));
export const friendWishlist = cache((viewerId: string, publicId: string) => loadFriendWishlist(viewerId, publicId));
/** `viewerOpen` is always `true` now that the friends switch is retired; the layout and the tab pass the same, so they share one read. */
export const friendDecks = cache((viewerId: string, publicId: string, viewerOpen: boolean) => loadFriendDecks(viewerId, publicId, viewerOpen));

/**
 * A card's name by oracle id, from the CATALOG only (no social table): the toast a `?spare=` landing draws when the
 * friend no longer offers the card (signature card call 9). Null for an id that is not a uuid or not in the catalog.
 */
export async function catalogCardName(oracleId: string, q: Reader = db): Promise<string | null> {
  if (!isUuid(oracleId)) return null;
  const [row] = await q.select({ name: cards.name }).from(cards).where(eq(cards.oracleId, oracleId)).limit(1);
  return row?.name ?? null;
}
