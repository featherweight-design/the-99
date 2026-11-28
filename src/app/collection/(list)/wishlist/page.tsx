// /collection/wishlist — cards wanted outside any deck (Social R2 PR 4, boards W1–W5 and WP1–WP5).
//
// The fifth tab of the place strip, always drawn (its switch, `SOCIAL_WISHLIST_ENABLED`, is retired). The page reads the reader's own lines as tiles, the one-time collected strip's notices
// and whether the reader has a friend (the meta line's `Your friends can see this list`); with the wishlist sync on, the
// reader's deck names for the split by deck, and otherwise the one-time offer's count. The view owns the search and
// every write.

import { requireUserId } from "../../../../lib/auth";
import { requestFlags } from "../../../../lib/flags/request";
import { wishlistTileLine } from "../../../../lib/wishlist/tile-line";
import { loadWishlistTiles } from "../../../../lib/wishlist/wishlist";
import { loadCollectedNotices } from "../../../../lib/wishlist/collected";
import { listFriends } from "../../../../lib/social/access";
import { WishlistView } from "../../../../components/wishlist/wishlist-view";
import { pageLanding } from "../../../../lib/discovery/page-landing";
import { readerStoreForPage } from "../../../../lib/stores/preference";
import { TOOL_PARAM } from "../../../../lib/discovery/tool-param";
import { ToolLandingMount } from "../../../../components/discovery/tool-landing-mount";
import { loadWishlistTabExtras } from "../../../../lib/wishlist/offer";

export default async function CollectionWishlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The reader first: the landing is decided from their switches (`requestFlags`).
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  // Try it's landing (discovery R2·3): `?tool=wishlist` haloes the search; anything else is stripped.
  const { landing, request } = pageLanding((await searchParams)[TOOL_PARAM], env, "wishlist");
  const [{ tiles, newestAsOf }, notices, hasFriend, { decks, offer }] = await Promise.all([
    // The reader's store's figures (store preference); Mana Pool while the switch is off for them or the read fails.
    readerStoreForPage(userId, env).then((store) => loadWishlistTiles(userId, store)),
    loadCollectedNotices(userId),
    // A friends read that fails draws the meta line without `Your friends can see this list`, never a broken page. The
    // page is read per request (not a `cachePageForUser` page), so nothing stale can be kept.
    listFriends(userId).then((f) => f.length > 0, (error: unknown) => {
      console.warn("[wishlist] friends unreadable; drawing the list without the friends line", error instanceof Error ? error.message : "");
      return false;
    }),
    // Cart on your wishlist: the deck names the split needs while the sync is on (call 3), or the one-time offer's
    // count while it is off (call 2). A failed read is reported there and draws the one grid with no offer.
    loadWishlistTabExtras(userId),
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
        line: wishlistTileLine(t, newestAsOf),
        price: t.price ? { cents: t.price.cents, foilCents: t.price.foilCents, etchedCents: t.price.etchedCents, asOf: t.price.asOf.toISOString(), ...(t.price.soldOut && { soldOut: true as const }) } : null,
        source: t.source,
        deckIds: t.deckIds,
      }))}
      notices={notices.map((n) => ({ oracleId: n.oracleId, name: n.name, collectedAt: n.collectedAt.toISOString() }))}
      hasFriend={hasFriend}
      newestAsOf={newestAsOf ? newestAsOf.toISOString() : null}
      decks={decks}
      offer={offer}
    />
    </>
  );
}
