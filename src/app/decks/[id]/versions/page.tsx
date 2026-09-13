// /decks/[id]/versions — the rail used to live here. It is the deck's own
// `Versions` tab now, so this route only forwards: Versions was the one tab that
// navigated away from the deck, and a page with no art, no commander line and no
// pending banner is what that cost.
//
// Kept rather than deleted because the route shipped, so links to it exist.
import { notFound, redirect } from "next/navigation";
import { TAB_PARAM } from "../../../../lib/decks/builder-view";
import { isUuid } from "../../../../lib/uuid";

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The deck page this forwards to carries the same guard, but a malformed
  // segment is answered here rather than passed on: a redirect to a page that
  // will only answer not-found is a round trip to spend on nothing.
  if (!isUuid(id)) notFound();
  // The ownership guard and the empty-rail case both belong to the deck page:
  // it refuses a deck this reader does not own, and it draws no `Versions` tab —
  // and lands on `Your deck` — for a deck with no versions.
  redirect(`/decks/${id}?${TAB_PARAM}=versions`);
}
