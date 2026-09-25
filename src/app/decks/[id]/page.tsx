// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { notFound } from "next/navigation";
import { loadCandidateFacts } from "../../../lib/profile/candidate-facts";
import { loadCompletionPartners } from "../../../lib/combos/near-miss";
import { comboFor, comboLookupIds } from "../../../lib/combos/attach";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { cacheForUser } from "../../../lib/cache/user-lists";
import { indexGeneration } from "../../../lib/cache/index-generation";
import { loadDeckSuggestions } from "../../../lib/decks/suggestions-read";
import { BuilderShell } from "../../../components/decks/builder-shell";
import { readStoredPermits } from "../../../lib/profile/stored";
import {
  arrivedFromImport,
  IMPORTED_PARAM,
  readUpdateArrival,
  UPDATED_PARAM,
} from "../../../lib/decks/arrival";
import { readSynergyCards } from "../../commanders/[slug]/synergy-read";
import {
  listLastSlotsCandidates,
  poolEmptiedByNegativeCut,
  type TopOffCandidateWithFacts,
} from "../../../lib/decks/last-slots";
import { loadPrices } from "../../../lib/decks/price-query";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { provenanceForm } from "../../../lib/decks/price";
import { listDeckGames, summarizeGames } from "../../../lib/decks/games";
import { readFillPasses } from "../../../lib/decks/fill-passes";
import { deckBodySize } from "../../../lib/decks/deck-size";
import { hasChanges, loadDraftState, loadVersionShape } from "../../../lib/decks/draft-state";
import { listVersions } from "../../../lib/decks/versions";
import { computeRoleCounts } from "../../../lib/decks/mix";
import { analysisTabEnabled } from "../../../lib/decks/analysis-flag";
import { noticesEnabled } from "../../../lib/notices/flag";
import { SwapToolsProvider } from "../../../lib/swaps/context";
import { swapToolsEnabled } from "../../../lib/swaps/flag";
import { readShoppingLimit } from "../../../lib/swaps/read";
import { initialBuilderView, readBuilderView, TAB_PARAM } from "../../../lib/decks/builder-view";
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
// Bumped to "2" when `mix` joined the payload: an entry cached under "1" holds no mix, and
// a reader destructuring one would hand the strip `undefined` and throw on its first cell.
// A payload's key travels with its SHAPE, not only with its inputs.
//
// AND WITH ITS SOURCES. The payload now carries the mix, so it depends on the commander
// index — which `cacheForUser`'s catalog generation does not observe. `/decks/[id]/changes`
// keys on the index generation, and a key that did it on one route and not the other would
// be worse than both being stale: the same deck would report different targets on two
// surfaces whose whole contract is that they are the same five cells.
const SUGGESTIONS_KEY = ["deck-suggestions", "2"];
// "2" since the pair branch: `readSynergyCards` now answers from `commander_pair_support_cards`
// for a two-commander deck, so the payload says something different for UNCHANGED rows. The
// cache helper's own rule — a deployment that changes what a payload says for unchanged rows is
// an input to the key — and without the bump an entry assembled by the previous deployment goes
// on being served for up to the hour ceiling, to a reader who writes nothing, with the pair
// branch invisible after deploy.
const SYNERGY_KEY = ["deck-synergy", "2"];

// Suggested changes runs as a Server Action invoked from this page, so the page's limit bounds
// it: a model call's 110s deadline (MODEL_TIMEOUT_MS) plus the reads and writes either side of it.
// `src/lib/tuning/limits.test.ts` fails if the deadline stops fitting under this figure.
export const maxDuration = 120;

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

  // Resolved before the wave rather than inside it: it is a 60-second cached read shared by
  // both cached payloads below, and awaiting it per-entry would serialise them.
  const indexGen = await indexGeneration();

  // The header's bracket chip, from the analysis already stored for this deck, started beside the
  // wave rather than inside it. It computes nothing (see `readStoredPermits`), and a failed read
  // draws no chip, which is what an unread deck draws anyway.
  const storedPermits = analysisTabEnabled()
    ? readStoredPermits(id, userId).catch(() => null)
    : Promise.resolve(null);

  const [
    { suggestions, degraded, shoppingFigures, mix },
    allDecks,
    ranked,
    games,
    fillPasses,
    draft,
    versions,
  ] = await Promise.all([
      cacheForUser(userId, [...SUGGESTIONS_KEY, id, indexGen], () =>
        loadDeckSuggestions(id, userId),
      ),
      // The move-card picker lists every other deck by name, as it always has.
      listDecksWithStats(userId, "name"),
      // Read the ranked support list only when the strip can render. A completed
      // deck (openSlots ≤ 0) would never show the strip, so the query would be
      // pure waste — skipping it saves a join on every committed-deck page load.
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
            // With images: this is the route whose top-off list draws the hover
            // preview. `/commanders/[slug]` shares this reader and draws none,
            // so it takes the default and ships no URLs it cannot use.
            () => readSynergyCards(
              userId,
              [detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : [])],
              [],
              true,
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
  // cap belongs to the selection, not to the list. TWO exclusions: a card the
  // deck already holds, because a row the player cannot tick is a row the list
  // has no reason to draw; and a card whose synergy is negative, which is EDHREC
  // arguing against the card under a heading that offers it. Both live in
  // `listLastSlotsCandidates`, which is where the reasoning for each one is.
  const inDeckOracleIds = new Set(detail.cards.map((r) => r.oracleId));
  const candidateCards = listLastSlotsCandidates({ ranked, inDeckOracleIds });
  // Why the pool is empty, when it is. An empty list has two causes now and the
  // strip's shipped sentence only describes one of them — see
  // `poolEmptiedByNegativeCut`.
  const allNegative = poolEmptiedByNegativeCut({ ranked, inDeckOracleIds });

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
  // THE CARD-NOTE FACTS, for the whole pool in ONE statement.
  //
  // `loadCandidateFacts` has had no caller since it landed — the same shape as
  // `cachedDeckProfile` before PR 1b and `commitVersion`'s snapshot before PR 3b:
  // a payload built, tested and never reached. Round 4's card note draws these,
  // and it cannot be built against a loader nothing calls.
  //
  // BATCHED, because the alternative does not ship. Measured on staging with
  // `pnpm measure:facts-cost`: one statement for a 480-candidate pool is
  // 177-192ms, where the same work candidate by candidate is ~195ms each — 91
  // to 95 seconds for the pool, 480 to 540 times more.
  //
  // In the same `Promise.all` as the price and availability reads rather than
  // after them: it needs only the candidate ids, which are already resolved, so
  // sequencing it later would add its latency to theirs for nothing.
  //
  // Swallowed like its neighbours. A failed facts read degrades to rows with no
  // note, which is the state the round draws for a card that has no facts
  // anyway — never the builder going down.
  const [priced, availability, candidateFacts, completions] = await Promise.all([
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
    // BOTH POOLS IN ONE READ, which is 8b widening the read 8a scoped to the candidates.
    //
    // `DeckSuggestion` now DECLARES `facts`, so the Add panel's tiles are forced to read it
    // rather than inheriting it untyped through a spread — the dead-payload shape 8a refused
    // to ship halfway. The two pools overlap heavily and `loadCandidateFacts` dedupes its ids,
    // so asking once costs less than asking twice for a set that is mostly the same.
    loadCandidateFacts(
      [...candidateCards.map((c) => c.oracleId), ...suggestions.map((s) => s.oracleId)],
      detail.cards.map((c) => c.oracleId),
    ).catch(() => null),
    // STATES 2 AND 3: which candidates complete a two-card combo already half-built in this
    // deck. Swallowed like its neighbours — a failed read draws rows with no clause, which is
    // what a card with no combo already looks like, and is never the builder going down.
    //
    // The COMMANDERS are passed separately from the deck's cards because §4.3b's rule 3 says
    // so: a commander counts as held, and it is a column on `decks` rather than a `deck_cards`
    // row, so a read taking only the list would miss every combo the commander is half of.
    loadCompletionPartners({
      deckOracleIds: detail.cards.map((c) => c.oracleId),
      commanderOracleIds: [
        detail.commander.oracleId,
        ...(detail.partner ? [detail.partner.oracleId] : []),
      ],
      // BOTH LISTS IN ONE READ. The Add panel's suggestions and the Last 31's candidates are
      // two different rankings over the same question, and asking twice would pay the join
      // twice for an overlapping set of ids.
      candidateOracleIds: comboLookupIds(candidateCards, suggestions),
    }).catch(() => null),
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
    // The card note's facts, on the tile rather than in a map beside it — same reason the
    // price and the availability figures are attached here, and same `null` for a failed
    // read as for a card that carries nothing. Both render as no note at all.
    //
    // REQUIRED on `DeckSuggestionWithFacts`, which is what `BuilderShell` takes: deleting
    // this line fails typecheck rather than silently drawing no note on any Consider tile.
    // An optional field closed that hole only for as long as somebody remembered.
    facts: candidateFacts?.get(s.oracleId) ?? null,
    // Declared on the suggestion type, so a consumer is forced to read it rather than
    // inheriting it untyped through this spread — the dead-payload shape the note above
    // refuses. (`comboPartner` is still optional on `DeckSuggestion` itself; that is sub-
    // project 3's field and its own chain, not this round's to change.)
    comboPartner: comboFor(s.oracleId, completions),
  }));

  // First-run: user's only deck and it has no cards yet.
  const firstRun = allDecks.length === 1 && detail.built === 0;

  // Attached here for the same reason `withPrice` above attaches its figure:
  // the row component then reads a field rather than doing two map lookups per
  // render, and BuilderShell takes one list rather than a list plus two maps.
  const candidates: TopOffCandidateWithFacts[] = candidateCards.map((c) => ({
    ...c,
    price: c.owned ? null : (priced?.prices.get(c.oracleId) ?? null),
    availability: c.owned ? (availability?.get(c.oracleId) ?? null) : null,
    // The card-note facts, on the row rather than in a map beside it — same reason the two
    // figures above are attached here. `null` where the read failed or the card has no facts;
    // Round 4's note draws nothing for either, which is why one absence serves both.
    facts: candidateFacts?.get(c.oracleId) ?? null,
    // The combo partner, attached for the same reason the three figures above are: the row
    // reads a field rather than doing a map lookup per render.
    comboPartner: comboFor(c.oracleId, completions),
  }));

  // Read once per request rather than at each use, so the tab, the strip's home and the
  // arrival view cannot disagree about which layout this deployment is drawing.
  const analysisEnabled = analysisTabEnabled();
  const storedBracket = await storedPermits;
  // The swap tools read the flag once, here, and reach every surface through one provider: a row
  // that finds no provider draws nothing of them.
  const swapTools = swapToolsEnabled();
  const shoppingLimit = swapTools ? await readShoppingLimit(id, userId) : null;
  // WHAT THIS DECK IS COMPARED TO, taken off the suggestions payload rather than resolved
  // again here. `loadDeckSuggestions` already ran in the first wave above and already built
  // this exact mix for its own shelf headers, so reading it back costs nothing and makes the
  // strip and the Add panel agree BY CONSTRUCTION rather than by two readers happening to
  // reach the same basis. A `loadDeckProfile` here would have assembled bracket flags, the
  // Spellbook aggregation, tutor classification and the staples join to produce five integers
  // the page was already holding.

  const shell = (
    <BuilderShell
      mix={mix}
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
      candidatesAllNegative={allNegative}
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
      analysisEnabled={analysisEnabled}
      noticesEnabled={noticesEnabled()}
      storedPermits={storedBracket}
      // Resolved on the SERVER, where the flag is read. A URL naming `analysis` against a
      // deployment that does not draw it lands on the decklist rather than on an unselected
      // row above an empty panel — the same rule `versions` already has for a brew.
      initialView={initialBuilderView(
        readBuilderView(query[TAB_PARAM]),
        versions.length,
        analysisEnabled,
      )}
    />
  );
  return swapTools ? (
    <SwapToolsProvider deckId={id} deckName={detail.name} storedLimitCents={shoppingLimit}>{shell}</SwapToolsProvider>
  ) : shell;
}
