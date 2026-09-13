// /decks/[id]/versions — §Surfaces 4, the version rail. Every version this deck
// has committed, and what each one changed.
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { getDeckReviewHeader } from "../../../../lib/decks/read";
import { listVersions } from "../../../../lib/decks/versions";
import { VersionHistory } from "../../../../components/decks/version-history";
import { isUuid } from "../../../../lib/uuid";

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The segment is whatever was typed, and `decks.id` is a uuid column: Postgres
  // rejects a malformed uuid with an error of its own, which reaches the reader
  // as a 500 where this route means to answer not-found. Every page under
  // `/decks/[id]` carries this line, and `uuid-guard.test.ts` holds them to it.
  if (!isUuid(id)) notFound();
  const userId = await requireUserId();

  // `listVersions` takes no `userId` — it reads by deck id alone, so this guard
  // is the only thing standing between a signed-in account and another player's
  // version history. The review page's own header loader, which answers the two
  // counts the tab row draws without reading a whole deck to do it.
  const detail = await getDeckReviewHeader(id, userId);
  if (!detail) notFound();

  const versions = await listVersions(id);
  // A brew has no history, and an empty rail reads as a bug — the same reasoning
  // as the review page's redirect, and why the Versions tab is absent at zero.
  if (versions.length === 0) redirect(`/decks/${id}`);

  return (
    <VersionHistory
      deckId={id}
      versions={versions}
      built={detail.built}
      gameCount={detail.gameCount}
    />
  );
}
