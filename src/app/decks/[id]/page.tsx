// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { getDeckSuggestions } from "../actions";
import { BuilderShell } from "../../../components/decks/builder-shell";
import {
  arrivedFromImport,
  IMPORTED_PARAM,
  readUpdateArrival,
  UPDATED_PARAM,
} from "../../../lib/decks/arrival";
import { readSynergyCards } from "../../commanders/[slug]/synergy-read";
import { listLastSlotsCandidates, type TopOffCandidate } from "../../../lib/decks/last-slots";
import { loadPrices } from "../../../lib/decks/price-query";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { provenanceForm } from "../../../lib/decks/price";
import { listDeckGames, summarizeGames } from "../../../lib/decks/games";
import { readFillPasses } from "../../../lib/decks/fill-passes";
import { deckBodySize } from "../../../lib/decks/deck-size";

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

  const openSlots = deckBodySize(detail.partner !== null) - detail.built;

  // A pair's legal pool is the union of both identities, the same union
  // `ownedColorLegalPool` filters the suggestion pool by.
  const commanderIdentity = [
    ...new Set([
      ...detail.commander.colorIdentity,
      ...(detail.partner?.colorIdentity ?? []),
    ]),
  ];

  const [{ suggestions, degraded, shoppingFigures }, allDecks, ranked, games, fillPasses] =
    await Promise.all([
      getDeckSuggestions(id),
      // The move-card picker lists every other deck by name, as it always has.
      listDecksWithStats(userId, "name"),
      // Read the ranked support list only when the strip can render. A completed
      // deck (openSlots ≤ 0) would never show the strip, so the query would be
      // pure waste — skipping it saves a join on every finished-deck page load.
      // The in-deck filter belongs to listLastSlotsCandidates, not here: passing
      // detail.cards as coveredOracleIds would apply the role-coverage exclusion
      // to them, which is a different exclusion with a different meaning.
      openSlots > 0
        ? readSynergyCards(
            userId,
            [detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : [])],
            [],
          )
        : [],
      listDeckGames(id, userId),
      // Not swallowed, unlike the price and availability reads below. Those
      // degrade to a missing ornament; a ledger that quietly vanished would tell
      // the player their passes are gone, which is a lie about deck state.
      readFillPasses(id),
    ]);

  // Summarised here rather than in the panel: the function is pure and this is
  // already a server component, so aggregating on the client would ship the
  // work to the browser for nothing.
  const gameSummary = summarizeGames(games);

  // The whole pool the top-off list offers, in rank order and uncapped — the
  // cap belongs to the selection, not to the list. A card the deck already
  // holds is the one exclusion: a row the player cannot tick is a row the list
  // has no reason to draw.
  const inDeckOracleIds = new Set(detail.cards.map((r) => r.oracleId));
  const candidateCards = listLastSlotsCandidates({ ranked, inDeckOracleIds });

  // Sequential, not part of the Promise.all above: the suggestion and candidate
  // oracle ids come out of those calls, so there is nothing to price or to ask
  // availability for until they resolve.
  //
  // Each read is scoped to the half of the candidate list that can use it. Only
  // an unowned row draws a BuyTag, so pricing an owned candidate buys nothing;
  // and `loadAvailability` is driven by the collection, so an unowned oracle id
  // can never come back from it. `excludeDeckId` is the deck being built, so its
  // own claims do not count against its own candidates.
  //
  // Both are swallowed. A failed price read degrades to bare rows and a failed
  // availability read to no markers, rather than taking the builder down — the
  // same treatment search-action.ts gives availability.
  const ownedCandidateIds = candidateCards.filter((c) => c.owned).map((c) => c.oracleId);
  const [priced, candidateAvailability] = await Promise.all([
    loadPrices([
      ...new Set([
        ...detail.cards.map((c) => c.oracleId),
        ...suggestions.map((s) => s.oracleId),
        ...candidateCards.filter((c) => !c.owned).map((c) => c.oracleId),
      ]),
    ]).catch(() => null),
    ownedCandidateIds.length > 0
      ? loadAvailability(userId, { excludeDeckId: id, oracleIds: ownedCandidateIds }).catch(
          () => null,
        )
      : null,
  ]);

  // Attached here, server-side, on lists that are being built anyway — so no
  // component below does a map lookup during render, and BuilderShell takes one
  // extra scalar rather than a collection across the boundary.
  const withPrice = <T extends { oracleId: string }>(card: T) => ({
    ...card,
    price: priced?.prices.get(card.oracleId) ?? null,
  });
  const cards = detail.cards.map(withPrice);
  const pricedSuggestions = suggestions.map(withPrice);

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  // Attached here for the same reason `withPrice` above attaches its figure:
  // the row component then reads a field rather than doing two map lookups per
  // render, and BuilderShell takes one list rather than a list plus two maps.
  const candidates: TopOffCandidate[] = candidateCards.map((c) => ({
    ...c,
    price: c.owned ? null : (priced?.prices.get(c.oracleId) ?? null),
    availability: c.owned ? (candidateAvailability?.get(c.oracleId) ?? null) : null,
  }));

  return (
    <BuilderShell
      deck={{ ...detail, cards }}
      suggestions={pricedSuggestions}
      newestAsOf={priced?.newestAsOf ?? null}
      // Derived here and passed as a form, never as a clock. provenanceForm
      // compares against `now`, so calling it again in the browser could flip
      // `behind` between the server render and hydration.
      provenance={priced?.newestAsOf ? provenanceForm(priced.newestAsOf, new Date()) : null}
      degraded={degraded}
      shoppingFigures={shoppingFigures}
      firstRun={firstRun}
      commanderIdentity={commanderIdentity}
      candidates={candidates}
      fillPasses={fillPasses}
      games={games}
      gameSummary={gameSummary}
      // Left in the URL rather than swept with a router.replace. Stripping it
      // would clear `arrivedFromImport` on the very next render, taking the
      // arrival strip away in the same frame it appeared. The costs of leaving
      // it are small and bounded: a refresh re-renders the strip, but the
      // dismissal is persisted per deck so a dismissed strip stays dismissed;
      // and a bookmarked URL can only be reopened by the deck's owner, who sees
      // one dismissible line.
      arrivedFromImport={arrivedFromImport(query[IMPORTED_PARAM])}
      // Left in the URL for the same reason. Its strip is dismissible too, but
      // the dismissal is component state rather than storage: an update happens
      // many times, and persisting it would silence every one after the first.
      updateArrival={readUpdateArrival(query[UPDATED_PARAM])}
    />
  );
}
