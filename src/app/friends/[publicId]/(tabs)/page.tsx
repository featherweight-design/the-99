// /friends/[publicId]: a friend's Decks tab, the first and the page's default (Hugh, 2026-10-30; it was Spares), view only
// (menu and Home PR 7; handoff G4): name, commander, status and count, never the list. The tab answers
// the friendship itself: a tab press reuses the mounted layout, which does not run again.
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { loadFriend } from "../../../../lib/social/access";
import { friendDecks } from "../../../../lib/social/friend-page-data";
import { FriendDecksTab } from "../../../../components/social/friend-decks-tab";

export default async function FriendDecksPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  /** Optional: the tab's tests call it with params alone. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A `?spare=` landing (a push, a feed row or a Waiting on you row from before Spares moved) is the Spares tab's:
  // hand it on whole, so its modal or toast still draws. Before any read, so it costs none.
  const spare = (await searchParams)?.spare;
  if (spare !== undefined) {
    const { publicId } = await params;
    const query = new URLSearchParams();
    for (const value of Array.isArray(spare) ? spare : [spare]) query.append("spare", value);
    redirect(`/friends/${encodeURIComponent(publicId)}/spares?${query}`);
  }
  const userId = await requireUserId();
  const { publicId } = await params;
  const [friend, decks] = await Promise.all([loadFriend(userId, publicId), friendDecks(userId, publicId, true)]);
  if (!friend || decks === null) notFound();
  return <FriendDecksTab name={friend.displayName} decks={decks} publicId={friend.publicId} open />;
}
