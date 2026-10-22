// /friends/[publicId]/decks/[deckId]: a friend's deck, read-only (friend decks handoff, G1). Under the friend, so the back
// link is theirs and the friendship is what reads it; not under /decks, which is the reader's own and edits. Outside the
// friend page's tabs group: the deck draws the precon page's head, not the friend's.
//
// The route follows the VIEWER's `FRIEND_DECKS_ENABLED`; what the deck shows follows the OWNER's rules, in
// `loadFriendDeck`. A stranger, a deck not theirs, a hidden or unfinished one, or the switch off for either: the app's
// one not-found page, so a hidden deck and a deleted one read the same.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { friendDecksEnabled } from "../../../../../lib/social/flag";
import { requestSwitchEnv } from "../../../../../lib/switches/request";
import { loadFriend } from "../../../../../lib/social/access";
import { loadFriendDeck } from "../../../../../lib/social/decks";
import { FriendDeckView } from "../../../../../components/social/friend-deck-view";

export default async function FriendDeckPage({ params }: { params: Promise<{ publicId: string; deckId: string }> }) {
  const userId = await requireUserId();
  if (!friendDecksEnabled(await requestSwitchEnv(userId))) notFound();
  const { publicId, deckId } = await params;
  const [friend, deck] = await Promise.all([loadFriend(userId, publicId), loadFriendDeck(userId, publicId, deckId)]);
  if (!friend || !deck) notFound();
  return (
    <FriendDeckView
      deck={deck}
      friend={{ publicId: friend.publicId, displayName: friend.displayName, commander: friend.commander }}
    />
  );
}
