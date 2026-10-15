// /friends/[publicId]: a friend's page and their wishlist, view only (Social R2 P2, P3; handoff decision 9).
// It exists only while BOTH `SOCIAL_FRIENDS_ENABLED` and `SOCIAL_WISHLIST_ENABLED` are on for this reader (G9),
// and only for a current friend: a stranger, a former friend, the reader's own id or a malformed one is the
// app's normal not-found page (decision 10). Both reads join the reader's own friendship row in their statement.
//
// Loading is the shell's `LoadingScreen` (no `loading.tsx`, as `/friends`), and a read that throws is the app's
// error boundary.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { socialFriendsEnabled } from "../../../lib/social/flag";
import { wishlistEnabled } from "../../../lib/wishlist/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { loadFriend } from "../../../lib/social/access";
import { loadFriendWishlist } from "../../../lib/social/wishlist";
import { FriendPage } from "../../../components/social/friend-page";

export default async function FriendWishlistPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env) || !wishlistEnabled(env)) notFound();
  const { publicId } = await params;
  const now = new Date();
  const [friend, lines] = await Promise.all([loadFriend(userId, publicId), loadFriendWishlist(userId, publicId)]);
  if (!friend) notFound();
  return <FriendPage friend={friend} lines={lines} nowMs={now.getTime()} />;
}
