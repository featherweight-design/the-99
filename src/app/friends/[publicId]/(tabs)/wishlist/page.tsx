// /friends/[publicId]/wishlist: a friend's wishlist, view only (Social R2 P2, P3; menu and Home PR 7: a tab). The tab answers
// the friendship itself: a tab press reuses the mounted layout, which does not run again.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { loadFriend } from "../../../../../lib/social/access";
import { friendWishlist } from "../../../../../lib/social/friend-page-data";
import { loadHaveIt, type HaveItCard } from "../../../../../lib/social/spare-offers";
import { FriendWishlist } from "../../../../../components/social/friend-wishlist";

export default async function FriendWishlistPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  const { publicId } = await params;
  const [friend, lines] = await Promise.all([loadFriend(userId, publicId), friendWishlist(userId, publicId)]);
  if (!friend) notFound();
  // The viewer's own copies of what the friend wants: a failed read draws the tab as shipped, never an error.
  const haves: HaveItCard[] = await loadHaveIt(userId, publicId, lines.map((l) => l.oracleId)).catch(() => []);
  return <FriendWishlist name={friend.displayName} friendPublicId={publicId} lines={lines} haves={haves} />;
}
