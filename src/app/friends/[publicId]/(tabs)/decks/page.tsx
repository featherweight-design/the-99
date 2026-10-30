// /friends/[publicId]/decks: where a friend's Decks tab lived before it became the page's default (Hugh, 2026-10-30). A link
// saved or sent before then lands on the friend's page, which now opens on Decks; the deck pages below stay where they are.
import { redirect } from "next/navigation";

export default async function FriendDecksMoved({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  redirect(`/friends/${encodeURIComponent(publicId)}`);
}
