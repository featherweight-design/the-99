// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { getDeckSuggestions } from "../actions";
import { BuilderShell } from "../../../components/decks/builder-shell";
import { arrivedFromImport, IMPORTED_PARAM } from "../../../lib/decks/arrival";

export default async function DeckBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const userId = await requireUserId();

  const detail = await getDeckDetail(id, userId);
  if (!detail) notFound();

  const [{ suggestions, degraded, shoppingFigures }, allDecks] = await Promise.all([
    getDeckSuggestions(id),
    listDecksWithStats(userId),
  ]);

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  return (
    <BuilderShell
      deck={detail}
      suggestions={suggestions}
      degraded={degraded}
      shoppingFigures={shoppingFigures}
      firstRun={firstRun}
      commanderIdentity={detail.commander.colorIdentity}
      // Left in the URL rather than swept with a router.replace. Stripping it
      // would clear `arrivedFromImport` on the very next render, un-suppressing
      // the 99/99 reveal on a deck the player did not build — the one thing the
      // suppression exists to prevent. The costs of leaving it are small and
      // bounded: a refresh re-renders the strip, but the dismissal is persisted
      // per deck so a dismissed strip stays dismissed; and a bookmarked URL can
      // only be reopened by the deck's owner, who sees one dismissible line.
      arrivedFromImport={arrivedFromImport(query[IMPORTED_PARAM])}
    />
  );
}
