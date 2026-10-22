/**
 * What a friend page's three tabs read, each cached for the request so the layout (which draws every tab's figure
 * on the strip) and the tab's own page share one read, never two. `cache` keys on its arguments, so the viewer's
 * id and the public id are the key: a request for one friend never answers another's.
 */
import { cache } from "react";
import { loadFriendDecks } from "./decks";
import { loadFriendSpareList } from "./spares";
import { loadFriendWishlist } from "./wishlist";

export const friendSpareList = cache((viewerId: string, publicId: string) => loadFriendSpareList(viewerId, publicId));
export const friendWishlist = cache((viewerId: string, publicId: string) => loadFriendWishlist(viewerId, publicId));
export const friendDecks = cache((viewerId: string, publicId: string) => loadFriendDecks(viewerId, publicId));
