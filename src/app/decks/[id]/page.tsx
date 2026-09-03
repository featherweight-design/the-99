// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { getDeckSuggestions } from "../actions";
import { BuilderShell } from "../../../components/decks/builder-shell";
import { arrivedFromImport, IMPORTED_PARAM } from "../../../lib/decks/arrival";
import { readSynergyCards } from "../../commanders/[slug]/synergy-read";
import { planLastSlots, countLastSlotsUnowned } from "../../../lib/decks/last-slots";

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

  const openSlots = 99 - detail.built;

  const [{ suggestions, degraded, shoppingFigures }, allDecks, ranked] = await Promise.all([
    getDeckSuggestions(id),
    listDecksWithStats(userId),
    // Read the ranked support list only when the strip can render. A completed
    // deck (openSlots ≤ 0) would never show the strip, so the query would be
    // pure waste — skipping it saves a join on every finished-deck page load.
    // The in-deck filter belongs to planLastSlots, not here: passing
    // detail.cards as coveredOracleIds would exclude unowned in-deck cards,
    // over-counting B's figure and breaking state 12.
    openSlots > 0 ? readSynergyCards(userId, detail.commander.oracleId, []) : [],
  ]);

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  // Derive the two candidate counts from the same planLastSlots function the
  // fill actions use — so the control face and the action's plan can never
  // disagree on what will be placed. Both are 0 when the deck is full and
  // ranked is the empty array returned above.
  const inDeckOracleIds = new Set(detail.cards.map((r) => r.oracleId));
  const ownedCandidates = planLastSlots({
    ranked, openSlots, inDeckOracleIds, ownedOnly: true,
  }).place.length;
  // unownedCandidates is the count of oracle ids in the top-up plan that the
  // player does not own — not `allCandidates - ownedCandidates`. Both
  // planLastSlots runs are capped at openSlots, so when the owned pool covers
  // the gap both counts hit the cap and the difference is 0, hiding B for
  // well-stocked players. countLastSlotsUnowned runs the top-up plan once and
  // intersects its ids with the owned set — the only figure that is honest
  // about what B would make the player buy.
  const unownedCandidates = countLastSlotsUnowned({ ranked, openSlots, inDeckOracleIds });

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
