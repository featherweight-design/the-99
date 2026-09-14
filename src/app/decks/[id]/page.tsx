// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { cacheForUser } from "../../../lib/cache/user-lists";
import { loadDeckSuggestions } from "../../../lib/decks/suggestions-read";
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
import { hasChanges, loadDraftState, loadVersionShape } from "../../../lib/decks/draft-state";
import { listVersions } from "../../../lib/decks/versions";
import { computeRoleCounts } from "../../../lib/decks/mix";
import { readBuilderView, TAB_PARAM } from "../../../lib/decks/builder-view";
import { isUuid } from "../../../lib/uuid";

// The two reads below are the builder's expensive half — measured against the
// largest deck in the database, `loadDeckSuggestions` took 543ms and
// `readSynergyCards` 185ms of the ~900ms the page spent on data, and it paid both
// again every time the reader came back from the Changes or Versions tab. Neither
// depends on anything but the reader's own rows, so both are cached under the same
// `user-lists:<userId>` tag every deck write already drops (`revalidateClaims`
// calls `revalidateUserLists`). No new tag, and no new invalidation site: the
// deck writes that revalidate paths without dropping the tag only ever touch
// `deck_cards.auto`, the game log, or nothing at all, none of which either payload
// reads.
//
// The leading element of each key is a version, bumped when a deployment changes
// what the payload says for unchanged rows — see the note on `cacheForUser`.
const SUGGESTIONS_KEY = ["deck-suggestions", "1"];
const SYNERGY_KEY = ["deck-synergy", "1"];

export default async function DeckBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  // A malformed segment reaching a uuid column is a 500 where the route means
  // not-found, so every deck route answers it here rather than passing it on.
  // This is the note the other deck routes point at; it lived in the retired
  // `versions/page.tsx` until that route was deleted.
  if (!isUuid(id)) notFound();
  const userId = await requireUserId();

  const detail = await getDeckDetail(id, userId);
  if (!detail) notFound();

  // `total`, not `built`, and the same figure the strip is measured against:
  // unresolved lines hold the slots they arrived on, so a deck whose only gap
  // is two lines we could not name has no last slots to rank candidates for.
  const openSlots = deckBodySize(detail.partner !== null) - detail.total;

  // A pair's legal pool is the union of both identities, the same union
  // `ownedColorLegalPool` filters the suggestion pool by.
  const commanderIdentity = [
    ...new Set([
      ...detail.commander.colorIdentity,
      ...(detail.partner?.colorIdentity ?? []),
    ]),
  ];

  const [
    { suggestions, degraded, shoppingFigures },
    allDecks,
    ranked,
    games,
    fillPasses,
    draft,
    versions,
  ] = await Promise.all([
      cacheForUser(userId, [...SUGGESTIONS_KEY, id], () =>
        loadDeckSuggestions(id, userId),
      ),
      // The move-card picker lists every other deck by name, as it always has.
      listDecksWithStats(userId, "name"),
      // Read the ranked support list only when the strip can render. A completed
      // deck (openSlots ≤ 0) would never show the strip, so the query would be
      // pure waste — skipping it saves a join on every finished-deck page load.
      // The in-deck filter belongs to listLastSlotsCandidates, not here: passing
      // detail.cards as coveredOracleIds would apply the role-coverage exclusion
      // to them, which is a different exclusion with a different meaning.
      openSlots > 0
        ? cacheForUser(
            userId,
            [
              ...SYNERGY_KEY,
              detail.commander.oracleId,
              detail.partner?.oracleId ?? "-",
            ],
            () => readSynergyCards(
              userId,
              [detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : [])],
              [],
            ),
          )
        : [],
      listDeckGames(id, userId),
      // Not swallowed, unlike the price and availability reads below. Those
      // degrade to a missing ornament; a ledger that quietly vanished would tell
      // the player their passes are gone, which is a lie about deck state.
      readFillPasses(id),
      // Not swallowed either, and for the stronger version of the same reason: a
      // failed read would take the banner away, and a deck with pending changes
      // and no banner offers no route to a commit at all.
      loadDraftState(id, userId),
      // The rail rides the deck's own `Versions` tab, so its rows are part of
      // this page. `getDeckDetail` above already refused a deck this reader does
      // not own; `listVersions` reads by deck id alone and has no guard of its
      // own.
      listVersions(id),
    ]);

  // The figures the version held, for the `was n` line in the mix cells. Read
  // only when there is a draft to compare against, and through the same
  // `computeRoleCounts` the strip itself uses — two folds would put two
  // different decks in one cell.
  //
  // The same read answers what a discard lands on. Two reads of one version's
  // cards for two figures folded out of them would be a second query for
  // nothing, and the discard confirm is drawn in exactly the case this read is
  // taken in: a draft, with a version behind it.
  const versionShape = hasChanges(draft) && draft.version
    ? await loadVersionShape(draft.version.id)
    : null;
  const wasCounts = versionShape ? computeRoleCounts(versionShape) : undefined;
  // Copies, not rows — the figure the decklist prints, and what the reader is
  // being told they land on. `undefined` where the shape was not read, which is
  // the absence `PendingBanner` draws no `Discard` for.
  const versionCards = versionShape
    ? versionShape.reduce((n, card) => n + card.quantity, 0)
    : undefined;

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
  // The Consider tiles take their markers from this same read, rather than from
  // the cached suggestions payload: a claim is point-in-time — another deck of
  // the reader's own can commit and change it — so it must not be stored, and
  // the candidates already ask the same question from the same vantage.
  //
  // Both are swallowed. A failed price read degrades to bare rows and a failed
  // availability read to no markers, rather than taking the builder down — the
  // same treatment search-action.ts gives availability.
  const ownedIds = [
    ...new Set([
      ...candidateCards.filter((c) => c.owned).map((c) => c.oracleId),
      ...suggestions.filter((s) => s.owned).map((s) => s.oracleId),
    ]),
  ];
  const [priced, availability] = await Promise.all([
    loadPrices([
      ...new Set([
        ...detail.cards.map((c) => c.oracleId),
        ...suggestions.map((s) => s.oracleId),
        ...candidateCards.filter((c) => !c.owned).map((c) => c.oracleId),
      ]),
    ]).catch(() => null),
    ownedIds.length > 0
      ? loadAvailability(userId, { excludeDeckId: id, oracleIds: ownedIds }).catch(() => null)
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
  // Owned tiles only, for the reason the read above is scoped that way: an
  // unowned oracle id can never come back from the collection.
  const pricedSuggestions = suggestions.map((s) => ({
    ...withPrice(s),
    availability: s.owned ? (availability?.get(s.oracleId) ?? null) : null,
  }));

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  // Attached here for the same reason `withPrice` above attaches its figure:
  // the row component then reads a field rather than doing two map lookups per
  // render, and BuilderShell takes one list rather than a list plus two maps.
  const candidates: TopOffCandidate[] = candidateCards.map((c) => ({
    ...c,
    price: c.owned ? null : (priced?.prices.get(c.oracleId) ?? null),
    availability: c.owned ? (availability?.get(c.oracleId) ?? null) : null,
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
      draft={draft}
      wasCounts={wasCounts}
      versionCards={versionCards}
      games={games}
      gameSummary={gameSummary}
      versions={versions}
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
      // How a URL names the tab it opens on. Read on arrival only — the builder
      // never writes it back, so switching tabs still costs no history entry.
      // Nothing in the app produces such a URL now that `/decks/[id]/versions`
      // is retired; see the note in `lib/decks/builder-view.ts`.
      initialView={readBuilderView(query[TAB_PARAM])}
    />
  );
}
