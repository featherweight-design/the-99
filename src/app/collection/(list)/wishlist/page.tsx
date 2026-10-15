// /collection/wishlist — cards wanted outside any deck (Social R2 PR 4, boards W1–W5 and WP1–WP5).
//
// The fifth tab of the place strip, behind `SOCIAL_WISHLIST_ENABLED`: with the switch off the route does not exist,
// and the tab is never drawn. The page reads the reader's own lines as tiles, the one-time collected strip's notices
// and, with friends on, whether the reader has a friend (the meta line's `Your friends can see this list`); the view
// owns the search and every write.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { wishlistEnabled } from "../../../../lib/wishlist/flag";
import { loadWishlistTiles } from "../../../../lib/wishlist/wishlist";
import { loadCollectedNotices } from "../../../../lib/wishlist/collected";
import { socialFriendsEnabled } from "../../../../lib/social/flag";
import { listFriends } from "../../../../lib/social/access";
import { WishlistView } from "../../../../components/wishlist/wishlist-view";

export default async function CollectionWishlistPage() {
  // The reader first: the switch is theirs (`requestSwitchEnv`).
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!wishlistEnabled(env)) notFound();
  const [{ tiles }, notices, hasFriend] = await Promise.all([
    loadWishlistTiles(userId),
    loadCollectedNotices(userId),
    socialFriendsEnabled(env) ? listFriends(userId).then((f) => f.length > 0) : Promise.resolve(false),
  ]);
  return (
    <WishlistView
      tiles={tiles.map((t) => ({
        oracleId: t.oracleId,
        name: t.name,
        imageUri: t.imageUri,
        want: t.quantity,
        have: t.owned,
        addedAt: t.addedAt.toISOString(),
      }))}
      notices={notices.map((n) => ({ oracleId: n.oracleId, name: n.name, collectedAt: n.collectedAt.toISOString() }))}
      hasFriend={hasFriend}
    />
  );
}
