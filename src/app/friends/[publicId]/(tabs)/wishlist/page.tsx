// /friends/[publicId]/wishlist: a friend's wishlist, view only (Social R2 P2, P3; menu and Home PR 7: a tab). The tab follows
// `SOCIAL_FRIENDS_ENABLED` (the wishlist's own switch is retired), answered here: a tab press reuses the mounted layout, which does not
// run again.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { socialFriendsEnabled } from "../../../../../lib/social/flag";
import { requestSwitchEnv } from "../../../../../lib/switches/request";
import { loadFriend } from "../../../../../lib/social/access";
import { friendWishlist } from "../../../../../lib/social/friend-page-data";
import { FriendWishlist } from "../../../../../components/social/friend-wishlist";

export default async function FriendWishlistPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) notFound();
  const { publicId } = await params;
  const [friend, lines] = await Promise.all([loadFriend(userId, publicId), friendWishlist(userId, publicId)]);
  if (!friend) notFound();
  return <FriendWishlist name={friend.displayName} lines={lines} />;
}
