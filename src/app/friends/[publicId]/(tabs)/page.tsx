// /friends/[publicId]: a friend's Spares tab, the first (menu and Home PR 7). View only. The friend's own threshold and keeps
// have already filtered it (`loadFriendSpareList`), so it agrees with the stand-ins modal and the feed.
import { requireUserId } from "../../../../lib/auth";
import { loadFriend } from "../../../../lib/social/access";
import { friendSpareList } from "../../../../lib/social/friend-page-data";
import { FriendSparesTab } from "../../../../components/social/friend-spares-tab";

export default async function FriendSparesPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  const { publicId } = await params;
  const [friend, spares] = await Promise.all([loadFriend(userId, publicId), friendSpareList(userId, publicId)]);
  return <FriendSparesTab name={friend?.displayName ?? ""} spares={spares} />;
}
