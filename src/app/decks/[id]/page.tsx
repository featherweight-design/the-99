// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { getDeckSuggestions } from "../actions";
import { BuilderShell } from "../../../components/decks/builder-shell";
import { arrivedFromImport, IMPORTED_PARAM } from "../../../lib/decks/arrival";
import { readSynergyCards } from "../../commanders/[slug]/synergy-read";
import { planLastSlots } from "../../../lib/decks/last-slots";

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

  const [{ suggestions, degraded, shoppingFigures }, allDecks, ranked] = await Promise.all([
    getDeckSuggestions(id),
    listDecksWithStats(userId),
    // Read the ranked support list without covered exclusion: the in-deck filter
    // belongs to planLastSlots, which already strips cards already in the deck.
    // Passing detail.cards as coveredOracleIds would exclude unowned in-deck
    // cards from the list — over-counting B's figure and breaking state 12.
    readSynergyCards(userId, detail.commander.oracleId, []),
  ]);

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  // Derive the two candidate counts from the same planLastSlots function the
  // fill actions use — so the control face and the action's plan can never
  // disagree on what will be placed.
  const inDeckOracleIds = new Set(detail.cards.map((r) => r.oracleId));
  const openSlots = 99 - detail.built;
  const ownedCandidates = planLastSlots({
    ranked, openSlots, inDeckOracleIds, ownedOnly: true,
  }).place.length;
  const allCandidates = planLastSlots({
    ranked, openSlots, inDeckOracleIds, ownedOnly: false,
  }).place.length;
  const unownedCandidates = allCandidates - ownedCandidates;

  return (
    <BuilderShell
      deck={detail}
      suggestions={suggestions}
      degraded={degraded}
      shoppingFigures={shoppingFigures}
      firstRun={firstRun}
      commanderIdentity={detail.commander.colorIdentity}
      ownedCandidates={ownedCandidates}
      unownedCandidates={unownedCandidates}
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
