// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { getDeckSuggestions } from "../actions";
import { BuilderShell } from "../../../components/decks/builder-shell";

export default async function DeckBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const [detail, { suggestions, degraded }, allDecks] = await Promise.all([
    getDeckDetail(id, userId),
    getDeckSuggestions(id),
    listDecksWithStats(userId),
  ]);

  if (!detail) notFound();

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  return (
    <BuilderShell
      deck={detail}
      suggestions={suggestions}
      degraded={degraded}
      firstRun={firstRun}
      allDecksCount={allDecks.length}
      commanderIdentity={detail.commander.colorIdentity}
    />
  );
}
