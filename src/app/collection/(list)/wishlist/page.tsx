// /collection/wishlist — cards wanted outside any deck (Social R2 PR 4, boards W1–W5 and WP1–WP5).
//
// The fifth tab of the place strip, always drawn (its switch, `SOCIAL_WISHLIST_ENABLED`, is retired). The page reads the reader's own lines as tiles, the one-time collected strip's notices
// and whether the reader has a friend (the meta line's `Your friends can see this list`); the view
// owns the search and every write.

import { requireUserId } from "../../../../lib/auth";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { loadWishlistTiles } from "../../../../lib/wishlist/wishlist";
import { loadCollectedNotices } from "../../../../lib/wishlist/collected";
import { listFriends } from "../../../../lib/social/access";
import { WishlistView } from "../../../../components/wishlist/wishlist-view";
import { pageLanding } from "../../../../lib/discovery/page-landing";
import { TOOL_PARAM } from "../../../../lib/discovery/tool-param";
import { ToolLandingMount } from "../../../../components/discovery/tool-landing-mount";

export default async function CollectionWishlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The reader first: the landing is decided from their switches (`requestSwitchEnv`).
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  // Try it's landing (discovery R2·3): `?tool=wishlist` haloes the search; anything else is stripped.
  const { landing, request } = pageLanding((await searchParams)[TOOL_PARAM], env, "wishlist");
  const [{ tiles }, notices, hasFriend] = await Promise.all([
    loadWishlistTiles(userId),
    loadCollectedNotices(userId),
    listFriends(userId).then((f) => f.length > 0),
  ]);
  return (
    <>
    <ToolLandingMount landing={landing} request={request} />
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
    </>
  );
}
