// /friends/[publicId]: a friend's Spares tab, the first (menu and Home PR 7). View only. The friend's own threshold and keeps
// have already filtered it (`loadFriendSpareList`), so it agrees with the stand-ins modal and the feed. Each tab answers the
// switch and the friendship itself: a tab press reuses the mounted layout, which does not run again.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { socialFriendsEnabled } from "../../../../lib/social/flag";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { loadFriend } from "../../../../lib/social/access";
import { friendSpareList } from "../../../../lib/social/friend-page-data";
import { FriendSparesTab } from "../../../../components/social/friend-spares-tab";

export default async function FriendSparesPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) notFound();
  const { publicId } = await params;
  const [friend, spares] = await Promise.all([loadFriend(userId, publicId), friendSpareList(userId, publicId)]);
  if (!friend) notFound();
  return <FriendSparesTab name={friend.displayName} spares={spares} />;
}
