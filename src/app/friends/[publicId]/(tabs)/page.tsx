// /friends/[publicId]: a friend's Spares tab, the first (menu and Home PR 7). View only. The friend's own threshold and keeps
// have already filtered it (`loadFriendSpareList`), so it agrees with the stand-ins modal and the feed. Each tab answers the
// switch and the friendship itself: a tab press reuses the mounted layout, which does not run again.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { socialFriendsEnabled, spareRequestsEnabled } from "../../../../lib/social/flag";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { wishlistEnabled } from "../../../../lib/wishlist/flag";
import { loadFriend } from "../../../../lib/social/access";
import { isUuid } from "../../../../lib/social/rules";
import { catalogCardName, friendSpareList } from "../../../../lib/social/friend-page-data";
import { loadPrices } from "../../../../lib/decks/price-query";
import { FriendSparesTab } from "../../../../components/social/friend-spares-tab";

// With spare requests on (signature card calls 8 and 9), a tile opens the card's modal with Ask, and `?spare={oracleId}`
// opens it on landing; a spare gone since draws a toast naming the card, its name read from the catalog. Off, `?spare=`
// is ignored and the tab is as shipped.
export default async function FriendSparesPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  /** Optional: the tab's tests call it with params alone. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) notFound();
  const { publicId } = await params;
  const [friend, spares] = await Promise.all([loadFriend(userId, publicId), friendSpareList(userId, publicId, wishlistEnabled(env))]);
  if (!friend) notFound();
  if (!spareRequestsEnabled(env)) return <FriendSparesTab name={friend.displayName} spares={spares} />;
  const raw = (await searchParams)?.spare;
  const spare = isUuid(raw) ? raw : null;
  // A card the friend still offers opens its modal; any other names the card for the toast (the catalog's name).
  const offered = spare !== null && (spares?.lines.some((l) => l.oracleId === spare) ?? false);
  // The modal's buy tag prices the card as Shopping does (`loadPrices`: one printing per card, cheapest live first).
  // A failed read degrades to the bare tag, never the page.
  const [goneName, priced] = await Promise.all([
    spare !== null && !offered ? catalogCardName(spare) : null,
    loadPrices(spares?.lines.map((l) => l.oracleId) ?? []).catch(() => ({ prices: new Map(), newestAsOf: null })),
  ]);
  return (
    <FriendSparesTab
      name={friend.displayName}
      spares={spares}
      asks={{
        friend: { publicId: friend.publicId, displayName: friend.displayName, commander: friend.commander },
        spare,
        goneName,
        prices: Object.fromEntries(priced.prices),
        newestAsOf: priced.newestAsOf,
      }}
    />
  );
}
