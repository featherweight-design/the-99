// A friend's page group (menu and Home PR 7): the head and the strip, mounted once over the three tabs
// (`/friends/[publicId]`, `/wishlist`, `/decks`), so a tab press swaps the page below and never remounts either.
//
// The page exists only for a current friend: a
// stranger, a former friend, the reader's own id or a malformed one is the app's normal not-found page (decision 10).
// Each tab answers the friendship itself on top.
// The layout reads each drawn tab's figure for the strip through the request-cached reads the tab's own page shares,
// so no read runs twice.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { loadFriend } from "../../../../lib/social/access";
import { friendDecks, friendSpareList, friendWishlist } from "../../../../lib/social/friend-page-data";
import { tradesWaitingWith } from "../../../../lib/social/trade-reads";
import { FriendHead } from "../../../../components/social/friend-head";
import { FriendStrip } from "../../../../components/social/friend-strip";
import { FriendBackProvider } from "../../../../components/social/friend-back";

export default async function FriendPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ publicId: string }>;
}) {
  const userId = await requireUserId();
  const { publicId } = await params;
  const now = new Date();
  const [friend, spares, wishlist, decks, waiting] = await Promise.all([
    loadFriend(userId, publicId),
    friendSpareList(userId, publicId, true),
    friendWishlist(userId, publicId),
    friendDecks(userId, publicId),
    // The Spares tab's diamond (friend trades): a failed read draws none rather than failing the page.
    tradesWaitingWith(userId, now).catch(() => new Set<string>()),
  ]);
  if (!friend) notFound();
  return (
    <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
      <FriendBackProvider>
        <FriendHead friend={friend} nowMs={now.getTime()} />
        <FriendStrip
          publicId={friend.publicId}
          tradeWaits={waiting.has(friend.publicId)}
          counts={{
            spares: spares?.lines.length ?? 0,
            ...(wishlist ? { wishlist: wishlist.length } : {}),
            decks: decks?.length ?? 0,
          }}
        />
        {children}
      </FriendBackProvider>
    </div>
  );
}
