// /friends/[publicId]/decks: a friend's decks, view only (menu and Home PR 7; handoff G4): name, commander, status and
// count, never the list. The tab follows `SOCIAL_FRIENDS_ENABLED`, which the group's layout has already answered for.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { loadFriend } from "../../../../../lib/social/access";
import { friendDecks } from "../../../../../lib/social/friend-page-data";
import { FriendDecksTab } from "../../../../../components/social/friend-decks-tab";

export default async function FriendDecksPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  const { publicId } = await params;
  const [friend, decks] = await Promise.all([loadFriend(userId, publicId), friendDecks(userId, publicId)]);
  if (!friend || decks === null) notFound();
  return <FriendDecksTab name={friend.displayName} decks={decks} />;
}
