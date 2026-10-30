// /friends/[publicId]/decks: a friend's decks, view only (menu and Home PR 7; handoff G4): name, commander, status and
// count, never the list. The tab answers `SOCIAL_FRIENDS_ENABLED` itself: a tab press reuses the mounted layout, which does
// not run again.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { socialFriendsEnabled } from "../../../../../lib/social/flag";
import { requestSwitchEnv } from "../../../../../lib/switches/request";
import { loadFriend } from "../../../../../lib/social/access";
import { friendDecks } from "../../../../../lib/social/friend-page-data";
import { FriendDecksTab } from "../../../../../components/social/friend-decks-tab";

export default async function FriendDecksPage({ params }: { params: Promise<{ publicId: string }> }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) notFound();
  const { publicId } = await params;
  const [friend, decks] = await Promise.all([loadFriend(userId, publicId), friendDecks(userId, publicId, socialFriendsEnabled(env))]);
  if (!friend || decks === null) notFound();
  return <FriendDecksTab name={friend.displayName} decks={decks} publicId={friend.publicId} open={socialFriendsEnabled(env)} />;
}
