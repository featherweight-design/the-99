// /friends/[publicId]/wishlist: a friend's wishlist, view only (Social R2 P2, P3; menu and Home PR 7: a tab). The tab follows
// `SOCIAL_WISHLIST_ENABLED`; the group's layout has already answered for the friend and for `SOCIAL_FRIENDS_ENABLED`.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { wishlistEnabled } from "../../../../../lib/wishlist/flag";
import { requestSwitchEnv } from "../../../../../lib/switches/request";
import { loadFriend } from "../../../../../lib/social/access";
import { friendWishlist } from "../../../../../lib/social/friend-page-data";
import { FriendWishlist } from "../../../../../components/social/friend-wishlist";

export default async function FriendWishlistPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  if (!wishlistEnabled(await requestSwitchEnv(userId))) notFound();
  const { publicId } = await params;
  const [friend, lines] = await Promise.all([loadFriend(userId, publicId), friendWishlist(userId, publicId)]);
  if (!friend) notFound();
  return <FriendWishlist name={friend.displayName} lines={lines} />;
}
