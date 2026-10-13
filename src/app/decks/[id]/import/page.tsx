// /decks/[id]/import — bring this deck's list up to date from a paste or a file.
//
// A route rather than a modal: the diff is the whole decision, and its groups
// are long enough that a dialog would scroll inside a scroll. Sitting under the
// deck also makes browser-back land on the list step with the paste intact.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { getDeckDetail } from "../../../../lib/decks/read";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { UpdateEntry } from "../../../../components/decks/update-entry";
import { isUuid } from "../../../../lib/uuid";

export default async function UpdateDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // See the note in `decks/[id]/page.tsx`: a malformed segment reaching a uuid
  // column is a 500 where the route means not-found.
  if (!isUuid(id)) notFound();
  const userId = await requireUserId();

  const detail = await getDeckDetail(id, userId, undefined, await requestSwitchEnv(userId));
  if (!detail) notFound();
  // State 3. An empty deck has nothing to diff, so the entry points are absent
  // from it — reaching this URL by hand is the same non-state.
  if (detail.cards.length === 0) notFound();

  return <UpdateEntry deckId={id} deckName={detail.name} />;
}
