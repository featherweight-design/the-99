// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { deckPrintingsEnabled } from "../../../lib/decks/printings-flag";
import { perfRoute } from "../../../lib/perf/timing";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { loadCandidateFacts } from "../../../lib/profile/candidate-facts";
import { loadCompletionPartners } from "../../../lib/combos/near-miss";
import { comboFor, comboLookupIds } from "../../../lib/combos/attach";
import { readPreconAddReceipt } from "../../../lib/precons/add-receipt-read";
import { readPreconArrival } from "../../../lib/precons/arrival-read";
import { readDeckPreconLink } from "../../../lib/precons/link-read";
import { readDeckOrigin } from "../../../lib/precons/origin-read";
import { preconsEnabled } from "../../../lib/precons/flag";
import { requireUserId } from "../../../lib/auth";
import { getDeckDetail, listDecksWithStats } from "../../../lib/decks/read";
import { listFolders } from "../../../lib/decks/folders";
import { loadCommanderPrintings } from "../../../lib/sets/printed-in-read";
import type { PrintedInSet } from "../../../lib/sets/printed-in";
import { cacheForUser } from "../../../lib/cache/user-lists";
import { recordSoftFailure } from "../../../lib/cache/soft-failure";
import { readDeckSynergy } from "../../../lib/decks/deck-synergy";
import { chainArt, withChainArt } from "../../../lib/cards/chain-art";
import { indexGeneration } from "../../../lib/cache/index-generation";
import { loadDeckSuggestions } from "../../../lib/decks/suggestions-read";
import { applyConsiderLabels, considerLabelDeps, considerLabels } from "../../../lib/decks/consider-labels";
import { BuilderShell } from "../../../components/decks/builder-shell";
import { readStoredPermits } from "../../../lib/profile/stored";
import {
  arrivedFromImport,
  IMPORTED_PARAM,
  PRECON_ADDED_PARAM,
  PRECON_ARRIVAL_PARAM,
  arrivedFromPrecon,
  PRINTINGS_PARAM,
  readArrivalPrintings,
  readUpdateArrival,
  UPDATED_PARAM,
} from "../../../lib/decks/arrival";
import {
  listLastSlotsCandidates,
  poolEmptiedByNegativeCut,
  type TopOffCandidateWithFacts,
} from "../../../lib/decks/last-slots";
import { loadPrices, priceFor } from "../../../lib/decks/price-query";
import { readHeldPricePicks } from "../../../lib/decks/printings";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { provenanceForm } from "../../../lib/decks/price";
import { listDeckGames, summarizeGames } from "../../../lib/decks/games";
import { readFillPasses } from "../../../lib/decks/fill-passes";
import { deckBodySize } from "../../../lib/decks/deck-size";
import { hasChanges, loadDraftState, loadVersionShape } from "../../../lib/decks/draft-state";
import { listVersions } from "../../../lib/decks/versions";
import type { JobRowsByCard } from "../../../lib/decks/job-tally";
import { labelRoleCountsEnabled } from "../../../lib/decks/label-counts-flag";
import { roleCounterFor } from "../../../lib/decks/label-role-counts";
import { analysisTabEnabled } from "../../../lib/decks/analysis-flag";
import { deckStatsEnabled } from "../../../lib/decks/stats-flag";
import { deckNotesEnabled } from "../../../lib/decks/notes-flag";
import { readDeckNotes } from "../../../lib/decks/notes-read";
import { loadJobRows } from "../../../lib/decks/job-rows";
import { loadDeckMix } from "../../../lib/decks/deck-mix";
import { settleLabelRead } from "../../../lib/decks/label-read-settle";
import { loadStatsLabels } from "../../../lib/decks/stats-labels";
import { loadStatsAverage } from "../../../lib/decks/stats-average-load";
import { loadLandMana } from "../../../lib/decks/land-mana";
import { loadSourceMana } from "../../../lib/decks/source-mana";
import { manaBalanceEnabled, proposedCutsEnabled, tuningEnabled, tuningHubEnabled } from "../../../lib/tuning/flag";
import { noticesEnabled } from "../../../lib/notices/flag";
import { loadDeckNotices } from "../../../lib/notices/read";
import { NOTICES_PARAM, readNoticesArrival } from "../../../lib/notices/arrival";
import { neverCutEnabled } from "../../../lib/decks/never-cut-flag";
import { SwapToolsProvider } from "../../../lib/swaps/context";
import { swapToolsEnabled } from "../../../lib/swaps/flag";
import { howItWorksEnabled } from "../../../lib/about/how-it-works-flag";
import { deckTokensEnabled } from "../../../lib/decks/tokens-flag";
import { printedNameOf } from "../../../lib/collection/browse";
import { loadDeckTokens } from "../../../lib/tokens/read";
import { DeckTokensProvider } from "../../../components/decks/deck-tokens-context";
import { DeckPageSwitches } from "../../../components/decks/deck-page-switches";
import { GotItProvider } from "../../../components/decks/got-it";
import { shoppingMarkBoughtEnabled } from "../../../lib/decks/mark-bought-flag";
import { changeCommanderEnabled } from "../../../lib/commander-change/flag";
import { ChangeCommanderProvider } from "../../../components/decks/change-commander-context";
import { readShoppingLimit } from "../../../lib/swaps/read";
import { initialBuilderView, readBuilderView, TAB_PARAM } from "../../../lib/decks/builder-view";
import { isUuid } from "../../../lib/uuid";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { switchBits } from "../../../lib/switches/resolve";

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
// The leading element of each key is a version, bumped when a deployment changed
// what the payload says for unchanged rows. Since the deployment joined every
// `cacheForUser` key (`cache/deployment.ts`) a deploy retires old entries on its own, so
// these versions are history rather than a rule, and no new bump is owed.
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
// The ranked support list's key and cache live with its reader, `readDeckSynergy`, which the bulk
// controls' allow-list reads too.

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
  // The reader's switches, resolved ONCE for this render: every switch below decides from this env, and so
  // does every reader it starts, the claim model (`loadAvailability`) included.
  const env = await requestSwitchEnv(userId);
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("/decks/[id]");
  // Read up front, beside the other switches below, because it gates a Stage A read
  // (`printedInSetsRead`) that must not start at all when Tuning is off.
  const tuned = tuningEnabled(env);

  // STAGE A: every read the next wave waits on starts NOW, beside the ownership guard rather than
  // after it. Each is owner-scoped in its own SQL — `getDeckDetail`, the draft's snapshot, the fill
  // passes, the versions, the games and the suggestions' `requireDeck` all refuse a deck the reader
  // does not own — so a stranger's deck id has no data read against it, and the guard below only
  // decides what to RENDER. The page used to take these after the guard, in series: 418ms of `getDeckDetail`
  // before a wave whose longest read was 330ms, on the deck `measure:load` walks.
  //
  // Each early read is marked handled at once, because on a deck the reader does not own the
  // page leaves through `notFound()` before awaiting them, and a rejection nobody listens for is
  // fatal in Node. The marking does not swallow anything: the promise itself still rejects for
  // the `Promise.all` that awaits it.
  const early = <T,>(p: Promise<T>): Promise<T> => { p.catch(() => {}); return p; };
  // ONE availability read for the page, from this deck's vantage over the whole collection.
  // `getDeckDetail` (its own rows and commanders) and the candidate pool below both used to run
  // the claim model separately, ~150ms each on staging, the second only after the detail had
  // resolved; the model costs the same however few ids it is asked for. Reader-scoped by
  // `userId`, so a stranger's deck id reads nothing but the reader's own collection.
  const availabilityRead = early(
    perf.timed("availability", () => loadAvailability(userId, { excludeDeckId: id, env })).catch(() => {
      recordSoftFailure();
      return null;
    }),
  );
  const detailRead = early(perf.timed("getDeckDetail", () => getDeckDetail(id, userId, availabilityRead, env)));
  // The Jobs card's labels start the moment the detail resolves, beside every other read, and are
  // awaited only where the card is drawn.
  // One label read serves the Jobs card and the Mana colors card's non-land sources.
  const statsLabelsRead = deckStatsEnabled(env)
    ? early(detailRead.then((d) => (d ? perf.timed("statsLabels", () => loadStatsLabels(d.cards)) : null)))
    : null;
  const statsJobsRead = statsLabelsRead ? early(Promise.all([detailRead, statsLabelsRead]).then(([d, labels]) => (d ? loadJobRows(d.cards, labels) : null))) : null;
  // The Colors card's land supply: what each land in the deck can add, read from the catalog's text
  // the moment the detail resolves, and awaited only where the card is drawn.
  const statsLandsRead = deckStatsEnabled(env)
    ? early(detailRead.then((d) => (d
        ? perf.timed("statsLands", () => loadLandMana(d.cards, [...d.commander.colorIdentity, ...(d.partner?.colorIdentity ?? [])]))
        : null)))
    : null;
  // The same card's non-land sources: which cards make mana comes from the labels, the colors from the text.
  const statsSourcesRead = statsLabelsRead
    ? early(Promise.all([detailRead, statsLabelsRead]).then(([d, labels]) => (d
        ? perf.timed("statsSources", () => loadSourceMana(d.cards, [...d.commander.colorIdentity, ...(d.partner?.colorIdentity ?? [])], labels))
        : null)))
    : null;
  // The Average card's basis: the commander's (or pair's, or colors') average deck, through the basis chain.
  const statsAverageRead = deckStatsEnabled(env)
    ? early(detailRead.then((d) => (d ? perf.timed("statsAverage", () => loadStatsAverage(d)) : null)))
    : null;
  // A 60-second cached read shared by both cached payloads below, resolved once rather than
  // per entry, and chained into the suggestions rather than awaited on its own.
  const indexGenRead = early(perf.timed("indexGeneration", () => indexGeneration()));
  const suggestionsRead = early(indexGenRead.then((indexGen) =>
    // The reader's switches are in the key: the payload's mix follows LABEL_ROLE_COUNTS_ENABLED, and
    // an override flipping it must not be served the entry built under the other basis.
    perf.timed("suggestions", () => cacheForUser(userId, [...SUGGESTIONS_KEY, id, indexGen, switchBits(env)], () =>
      loadDeckSuggestions(id, userId, env),
    ))));
  // The move-card picker lists every other deck by name, as it always has.
  // The notes read is its own, uncached read, outside the two cached ones above (a write revalidates the
  // route, and nothing cached holds a note). Behind its own switch: off reads nothing.
  const notesRead = deckNotesEnabled(env)
    ? early(detailRead.then((d) => (d ? perf.timed("notes", () => readDeckNotes(id, userId, { commanderOracleId: d.commander.oracleId, partnerOracleId: d.partner?.oracleId ?? null }, env)) : null)))
    : null;
  const allDecksRead = early(perf.timed("listDecks", () => listDecksWithStats(userId, "name", { env })));
  // The reader's shelves, for the header menu's Move (the deck's own shelf rides on its list row).
  // A failed read costs the menu its Move row and nothing else.
  const foldersRead = early(perf.timed("folders", () => listFolders(userId)).catch(() => null));
  const gamesRead = early(perf.timed("games", () => listDeckGames(id, userId)));
  // Not swallowed, unlike the price and availability reads below. Those degrade to a missing
  // ornament; a ledger that quietly vanished would tell the player their passes are gone, which is
  // a lie about deck state.
  const fillPassesRead = early(perf.timed("fillPasses", () => readFillPasses(id, userId)));
  // Not swallowed either, and for the stronger version of the same reason: a failed read would
  // take the banner away, and a deck with pending changes and no banner offers no route to a
  // commit at all.
  const draftRead = early(perf.timed("draft", () => loadDraftState(id, userId, env)));
  // v0 (precons PR 6b): a linked deck's precon list, read from `precon_cards` and never a version.
  // Started here with no test of the link first, because the read IS the test: owner-scoped, and an
  // unlinked deck joins no row. A failed read draws no v0, rather than failing the deck.
  const originRead = preconsEnabled(env)
    ? early(perf.timed("preconOrigin", () => readDeckOrigin(userId, id)).catch((error) => {
      // not a fallback: v0 is drawn beside the history, never part of it.
      console.error("precons: the deck's v0 could not be read", error);
      return null;
    }))
    : null;
  // The rail rides the deck's own `Versions` tab, so its rows are part of this page. v1's delta is
  // counted against v0 when there is one.
  const versionsRead = early(perf.timed("versions", () => listVersions(id, userId, originRead?.then((o) => o?.cards ?? null) ?? null)));
  // "Kept for this deck"'s Set picker (H35, PR 2) — the same cached, unscoped list
  // help-me-choose's intake form reads. Degrades to an empty picker rather than failing the page.
  // Tuning-only: the Set picker lives inside the tuning panel alone (`builder-shell.tsx`), so
  // with Tuning off this read is never started and the page pays none of its catalog queries.
  const printedInSetsRead = tuned
    ? early(perf.timed("printedInSets", () => loadCommanderPrintings().then((x) => x.sets).catch(() => [])))
    : Promise.resolve([] as PrintedInSet[]);
  const detail = await detailRead;
  if (!detail) notFound();
  // The commander's art, asked for NOW. The header draws it as a CSS background, which the browser
  // fetches only once the page's markup has streamed and its style is computed, behind every other
  // read below. It is the one image above the fold, so it gets a preload at high priority the moment
  // its URL is known (Hugh, 2026-09-28: it loaded after the cards beneath it).
  if (detail.commander.artCropUri) {
    preload(detail.commander.artCropUri, { as: "image", fetchPriority: "high" });
  }

  // STAGE A IS BOUNDED TO THE CRITICAL PATH. These three are awaited only at the very end, behind
  // the last wave's ~450ms, so starting them after the guard costs nothing — and starting them at
  // t0 put eleven reads in flight against pg's ten-connection pool, which measured as the page's
  // first byte arriving ~120ms later than before this reordering.
  // The header's bracket chip, from the analysis already stored for this deck. It computes nothing
  // (see `readStoredPermits`), and a failed read draws no chip, which is what an unread deck draws
  // anyway.
  const storedPermits = analysisTabEnabled(env)
    ? perf.timed("storedPermits", () => readStoredPermits(id, userId)).catch(() => undefined)
    : Promise.resolve(null);
  // The header's notice tag, read WITH the page so it paints with the header rather than arriving
  // after it. A failed read draws no tag, as a deck with no notices does; the shell reads again
  // after mount in that case.
  const showNotices = analysisTabEnabled(env) && noticesEnabled(env);
  const initialNotices = showNotices
    ? perf.timed("notices", () => loadDeckNotices(id, userId, env)).catch(() => null)
    : Promise.resolve(null);
  // The swap tools read the flag once, here, and reach every surface through one provider: a row
  // that finds no provider draws nothing of them.
  const swapTools = swapToolsEnabled(env);
  // The deck's tokens start with the rest of the wave and are awaited where the page is assembled. Off,
  // nothing is read at all. `loadDeckTokens` never rejects: a failed read is a value the group draws.
  // The makers draw the art the deck's own rows draw (an owned or picked printing), so the read waits for the
  // detail that resolved it; a deck that is not the reader's has no detail and reads absent.
  // The precon arrival strip's read, on the one navigation "Start a deck from this" made. Owner-
  // scoped in its own SQL, so it starts here with the rest and is awaited only where it is drawn.
  const preconArrivalRead = preconsEnabled(env) && arrivedFromPrecon(query[PRECON_ARRIVAL_PARAM])
    ? early(perf.timed("preconArrival", () => readPreconArrival(userId, id)))
    : null;
  // The receipt of the add that began this start (`?added=<entry>`, beside `from=precon`). The id is a claim off the
  // URL: the read answers only for the reader's own unreverted precon entry, and draws nothing otherwise.
  const preconAddedParam = query[PRECON_ADDED_PARAM];
  const preconAddReceiptRead = preconsEnabled(env) && arrivedFromPrecon(query[PRECON_ARRIVAL_PARAM]) && typeof preconAddedParam === "string"
    ? early(perf.timed("preconAddReceipt", () => readPreconAddReceipt(userId, preconAddedParam, id)).catch(() => null))
    : null;
  // The precon link's doors (R3): an unlinked deck's suggestion and the Versions foot row's picker,
  // counted at read and never stored (lock 2). Owner-scoped in its own SQL. A failed read draws
  // neither door, as a linked deck does, rather than failing the deck.
  const preconLinkRead = preconsEnabled(env)
    ? early(perf.timed("preconLink", () => readDeckPreconLink(userId, id)).catch((error) => {
      // not a fallback: an ornament drawn beside the page, never cached in it.
      console.error("precons: the deck's link could not be read", error);
      return null;
    }))
    : null;
  const tokensRead = deckTokensEnabled(env)
    ? early(detailRead.then((d) => (d
      ? perf.timed("deckTokens", () => loadDeckTokens(id, userId, new Map([
        ...d.cards.map((c) => [c.oracleId, { imageUri: c.imageUri ?? null, name: printedNameOf(c) }] as const),
        ...[d.commander, d.partner].filter((c) => !!c).map((c) => [c!.oracleId, { imageUri: c!.imageUri ?? null, name: c!.printedName ?? c!.name }] as const),
      ])))
      : ({ status: "absent" } as const))))
    : null;
  const shoppingLimitRead = swapTools
    ? early(perf.timed("shoppingLimit", () => readShoppingLimit(id, userId)))
    : Promise.resolve(null);


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
    { suggestions, degraded, shoppingFigures, mix },
    allDecks,
    { ranked, ownedArt },
    games,
    fillPasses,
    draft,
    versions,
    printedInSets,
  ] = await Promise.all([
      suggestionsRead,
      allDecksRead,
      // The one read in this wave that needs the detail: the commander ids key it. Read the ranked
      // support list only when the strip can render. A completed deck (openSlots ≤ 0) would never
      // show the strip, so the query would be pure waste — skipping it saves a join on every
      // committed-deck page load. The in-deck filter belongs to listLastSlotsCandidates, not here:
      // passing detail.cards as coveredOracleIds would apply the role-coverage exclusion to them,
      // which is a different exclusion with a different meaning.
      openSlots > 0
        ? perf.timed("synergy", async () => {
            const read = await readDeckSynergy(userId, detail.commander.oracleId, detail.partner?.oracleId ?? null);
            // The art a candidate is drawn with, so the Top-off hover shows the printing card details opens
            // (the owned copy, else the printing an unowned card opens on). `readSynergyCards` carries the
            // catalog's one arbitrary printing per card. Read here, inside the synergy read's own slot in the wave, so it overlaps the
            // other five reads rather than following them; overlaid below at the draw, not in the cached
            // loader `/commanders/[slug]` shares.
            const art = await perf.timed("topOffArt", () => chainArt(userId, null, read.map((c) => c.oracleId), env));
            return { ranked: read, ownedArt: art };
          })
        : { ranked: [], ownedArt: new Map<string, string>() },
      gamesRead,
      fillPassesRead,
      draftRead,
      versionsRead,
      printedInSetsRead,
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
    ? await perf.timed("versionShape", () => loadVersionShape(draft.version!.id))
    : null;
  // `wasCounts` is folded below, after the label rows it may need are read.
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
  // oracle ids come out of those calls, so there is nothing to price until they
  // resolve. Availability is the exception: the page's one read (`availabilityRead`)
  // started with the request over the whole collection, so it waits on nothing here.
  //
  // The price read is scoped to the unowned half of the candidate list: only an unowned row draws a
  // BuyTag, so pricing an owned candidate buys nothing. Availability is looked up for the owned
  // half only (`loadAvailability` is driven by the collection, so an unowned id is never in it),
  // and `excludeDeckId` is the deck being built, so its own claims do not count against its own
  // candidates.
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
  const [priced, availability, candidateFacts, completions, considerRead] = await Promise.all([
    // The deck's held printing picks ride in the same price statement (deck printings), so a
    // picked card is priced as the buy tag rules: its pick when in stock, else today's figure.
    perf.timed("prices", async () => loadPrices([
      ...new Set([
        ...detail.cards.map((c) => c.oracleId),
        // The commanders too (H28): an unowned or spoken-for commander is on the Shopping list,
        // and its row carries a price like every other row there.
        detail.commander.oracleId,
        ...(detail.partner ? [detail.partner.oracleId] : []),
        ...suggestions.map((s) => s.oracleId),
        ...candidateCards.filter((c) => !c.owned).map((c) => c.oracleId),
      ]),
    ], await readHeldPricePicks(userId, [id], env))).catch(() => null),
    // The page's one read, started with the request (above); only `.get` is used on it.
    ownedIds.length > 0 ? availabilityRead : null,
    // BOTH POOLS IN ONE READ, which is 8b widening the read 8a scoped to the candidates.
    //
    // `DeckSuggestion` now DECLARES `facts`, so the Add panel's tiles are forced to read it
    // rather than inheriting it untyped through a spread — the dead-payload shape 8a refused
    // to ship halfway. The two pools overlap heavily and `loadCandidateFacts` dedupes its ids,
    // so asking once costs less than asking twice for a set that is mostly the same.
    perf.timed("candidateFacts", () => loadCandidateFacts(
      [...candidateCards.map((c) => c.oracleId), ...suggestions.map((s) => s.oracleId)],
      detail.cards.map((c) => c.oracleId),
    )).catch(() => null),
    // STATES 2 AND 3: which candidates complete a two-card combo already half-built in this
    // deck. Swallowed like its neighbours — a failed read draws rows with no clause, which is
    // what a card with no combo already looks like, and is never the builder going down.
    //
    // The COMMANDERS are passed separately from the deck's cards because §4.3b's rule 3 says
    // so: a commander counts as held, and it is a column on `decks` rather than a `deck_cards`
    // row, so a read taking only the list would miss every combo the commander is half of.
    perf.timed("completions", () => loadCompletionPartners({
      deckOracleIds: detail.cards.map((c) => c.oracleId),
      commanderOracleIds: [
        detail.commander.oracleId,
        ...(detail.partner ? [detail.partner.oracleId] : []),
      ],
      // BOTH LISTS IN ONE READ. The Add panel's suggestions and the Last 31's candidates are
      // two different rankings over the same question, and asking twice would pay the join
      // twice for an overlapping set of ids.
      candidateOracleIds: comboLookupIds(candidateCards, suggestions),
    })).catch(() => null),
    // THE CONSIDER FILTER's labels (card labels item 7), for the suggestion ids alone, in one read.
    // Here, AFTER the cached payload resolved and outside its entry, because a label publish moves
    // nothing that entry's key carries. Off (`LABEL_SURFACES_ENABLED`), it reads nothing and answers
    // null. Swallowed like its neighbours: a failed read filters nothing.
    perf.timed("considerLabels", () => considerLabels({
      suggestionIds: suggestions.map((s) => s.oracleId),
    }, considerLabelDeps(env))).catch(() => null),
  ]);

  // Attached here, server-side, on lists that are being built anyway — so no
  // component below does a map lookup during render, and BuilderShell takes one
  // extra scalar rather than a collection across the boundary.
  const withPrice = <T extends { oracleId: string }>(card: T) => ({
    ...card,
    price: priced ? priceFor(priced, id, card.oracleId) : null,
  });
  const cards = detail.cards.map(withPrice);
  // The commanders carry a price for the same reason, and on the same rule: the Shopping list
  // draws an unowned or spoken-for commander in its own group, priced like the rows below it.
  const commander = withPrice(detail.commander);
  const partner = detail.partner ? withPrice(detail.partner) : null;
  // Owned tiles only, for the reason the read above is scoped that way: an
  // unowned oracle id can never come back from the collection.
  //
  // A role-gap pick whose fresh label names no job of the role it fills is left out here
  // (`filterConsider`). Never an EDHREC pick, and never a card with no fresh label. The ids it
  // drops were priced above with the rest, which costs a row in a read already made.
  const pricedSuggestions = applyConsiderLabels(suggestions, considerRead).map((s) => ({
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
  const candidates: TopOffCandidateWithFacts[] = withChainArt(candidateCards, ownedArt).map((c) => ({
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

  // Read once per request rather than at each use, so the tab and the
  // arrival view cannot disagree about which layout this deployment is drawing.
  const analysisEnabled = analysisTabEnabled(env);
  // Undefined when the read FAILED: no chip either way, but the tab must not take a failure for a
  // deck that was never analyzed (`holdsOpening`'s `analyzed`).
  const storedRead = await storedPermits;
  const storedBracket = storedRead ?? null;
  const notices = await initialNotices;
  // Started in stage A; see `swapTools` there.
  const shoppingLimit = await shoppingLimitRead;
  // WHAT THIS DECK IS COMPARED TO, taken off the suggestions payload rather than resolved
  // again here. `loadDeckSuggestions` already ran in the first wave above and already built
  // this exact mix for its own shelf headers, so reading it back costs nothing and makes the
  // strip and the Add panel agree BY CONSTRUCTION rather than by two readers happening to
  // reach the same basis. A `loadDeckProfile` here would have assembled bracket flags, the
  // Spellbook aggregation, tutor classification and the staples join to produce five integers
  // the page was already holding.

  // THE STRIP COUNTS BY LABEL when `LABEL_ROLE_COUNTS_ENABLED` is on: the Jobs card's own tally, over
  // the rows it reads. The map covers the cards the page holds (a search result or a resolved row is not among them, and falls back to card.role in the toast): the deck's (already read), the
  // version a draft compares to, and the suggestions and candidates a reader can add, which the
  // toast and the shelves count against. One more read for the cards the deck's does not cover. Null
  // (switch off, or the deck's read failed) counts by `card.role`, exactly as before.
  let labelRows: JobRowsByCard | null = null;
  // The ids that read covered. The map is sparse (an unlabeled card has no entry), so this is what
  // tells a card with no label from a search result the page never asked about.
  let labelQueried: string[] | null = null;
  // The switch is on but the read failed: the counts fall back to the classifier, so the targets must
  // too, or the strip grades classifier counts against `label_*` targets.
  let shellMix = mix;
  if (labelRoleCountsEnabled(env)) {
    const base = await (statsJobsRead ?? early(perf.timed("labelRows", () => loadJobRows(detail.cards))));
    const extra: { oracleId: string; typeLine: string }[] = [];
    const wanted = [...(versionShape ?? []), ...pricedSuggestions, ...candidates];
    if (base) {
      const known = new Set(Object.keys(base));
      for (const c of wanted) {
        if (c.oracleId !== undefined && !known.has(c.oracleId)) extra.push({ oracleId: c.oracleId, typeLine: c.typeLine });
      }
    }
    const more = base && extra.length > 0 ? await perf.timed("labelRowsExtra", () => loadJobRows(extra)) : {};
    const settled = settleLabelRead(true, [base, more], [
      ...detail.cards.map((c) => c.oracleId),
      ...wanted.map((c) => c.oracleId).filter((id): id is string => id !== undefined),
    ]);
    labelRows = settled.rows;
    labelQueried = settled.queried;
    if (settled.classifierTargets) shellMix = await loadDeckMix(id, userId, "classifier");
  }
  const wasCounts = versionShape ? roleCounterFor(labelRows)(versionShape) : undefined;

  const thisDeck = allDecks.find((d) => d.id === id);
  const folders = await foldersRead;
  const shelf = folders && thisDeck
    ? {
        folders: folders.map(({ id: folderId, name }) => ({ id: folderId, name })),
        folderId: thisDeck.folderId,
        folderName: thisDeck.folderName,
      }
    : undefined;
  const shell = (
    <BuilderShell
      // One builder per deck: a client navigation to another deck reuses this element, and its
      // state (the tab, the list's Stats panel) would otherwise carry across. The providers
      // around it are keyed per deck only while their switches are on.
      key={id}
      mix={shellMix}
      labelRows={labelRows}
      labelQueried={labelQueried}
      deck={{ ...detail, cards, commander, partner }}
      shelf={shelf}
      suggestions={pricedSuggestions}
      newestAsOf={priced?.newestAsOf ?? null}
      // Derived here and passed as a form, never as a clock. provenanceForm
      // compares against `now`, so calling it again in the browser could flip
      // `behind` between the server render and hydration.
      provenance={priced?.newestAsOf ? provenanceForm(priced.newestAsOf, new Date()) : null}
      degraded={degraded}
      shoppingFigures={shoppingFigures}
      printedInSets={printedInSets}
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
      // `?from=precon`: the one navigation "Start a deck from this" made. Left in the URL for the
      // same reason as `imported`; the strip's dismissal is the same per-deck flag.
      preconArrival={preconArrivalRead ? await preconArrivalRead : null}
      preconAddReceipt={preconAddReceiptRead ? await preconAddReceiptRead : null}
      preconAddedClaimed={preconAddedParam !== undefined}
      // A linked deck gets neither door: no suggestion (lock 2). Its link is drawn in Versions as v0
      // (precons PR 6b), and on the open precon with Unlink (PR 6a-2).
      preconLink={preconLinkRead
        ? await preconLinkRead.then((l) => (l && l.linked === null ? { suggestions: l.suggestions, picker: l.picker } : null))
        : null}
      preconOrigin={originRead ? (await originRead)?.summary ?? null : null}
      // Deck printings: the strip's printing clauses, from the same one navigation.
      arrivalPrintings={readArrivalPrintings(query[PRINTINGS_PARAM], deckPrintingsEnabled(env))}
      // Left in the URL for the same reason. Its strip is dismissible too, but
      // the dismissal is component state rather than storage: an update happens
      // many times, and persisting it would silence every one after the first.
      updateArrival={readUpdateArrival(query[UPDATED_PARAM])}
      // How a URL names the tab it opens on. Read on arrival only — the builder
      // never writes it back, so switching tabs still costs no history entry.
      // Nothing in the app produces such a URL now that `/decks/[id]/versions`
      // is retired; see the note in `lib/decks/builder-view.ts`.
      analysisEnabled={analysisEnabled}
      statsEnabled={deckStatsEnabled(env)}
      notesEnabled={deckNotesEnabled(env)}
      notesData={notesRead ? await notesRead : null}
      statsData={deckStatsEnabled(env)
        ? {
            jobs: statsJobsRead ? await statsJobsRead : null,
            lands: statsLandsRead ? await statsLandsRead : null,
            sources: statsSourcesRead ? await statsSourcesRead : null,
            average: statsAverageRead ? await statsAverageRead : null,
            commanders: [detail.commander, ...(detail.partner ? [detail.partner] : [])].map((c) => ({
              cmc: c.cmc ?? 0,
              typeLine: c.typeLine,
              manaCost: c.manaCost,
              colorIdentity: c.colorIdentity,
              quantity: 1,
            })),
          }
        : null}
      tuningEnabled={tuned}
      proposedCutsEnabled={proposedCutsEnabled(env)}
      manaBalanceEnabled={manaBalanceEnabled(env)}
      tuningHubEnabled={tuningHubEnabled(env)}
      noticesEnabled={noticesEnabled(env)}
      initialNotices={notices}
      // The tile's `!` asks for the sheet (`noticesHref`). The shell opens it on arrival and strips
      // the parameter, so a refresh lands on the deck alone.
      openNoticesOnArrival={showNotices && readNoticesArrival(query[NOTICES_PARAM])}
      // Locked (PR 4a): off, no lock control, mark or key entry draws, and the page is main's.
      neverCut={neverCutEnabled(env)}
      storedPermits={storedBracket}
      storedPermitsUnknown={storedRead === undefined}
      // Resolved on the SERVER, where the flag is read. A URL naming `analysis` against a
      // deployment that does not draw it lands on the decklist rather than on an unselected
      // row above an empty panel — the same rule `versions` already has for a brew.
      initialView={initialBuilderView(
        readBuilderView(query[TAB_PARAM]),
        // A linked brew's Versions tab holds v0 (K14), so a URL naming it lands there.
        versions.length + (originRead && (await originRead) ? 1 : 0),
        analysisEnabled,
      )}
    />
  );
  // Switches read here and needed several layers down (the decisions sheet's method tags).
  const switched = <DeckPageSwitches howItWorks={howItWorksEnabled(env)}>{shell}</DeckPageSwitches>;
  // I got it (both switches): the Shopping rows' tags open its confirm. Without it every row is
  // main's (E1). Keyed per deck, so an open confirm never carries to another deck's page.
  const bought = shoppingMarkBoughtEnabled(env) ? <GotItProvider key={id} deckId={id}>{switched}</GotItProvider> : switched;
  const tooled = swapTools ? (
    <SwapToolsProvider deckId={id} deckName={detail.name} storedLimitCents={shoppingLimit}>{bought}</SwapToolsProvider>
  ) : bought;
  // Change commander's door and sheet read this context; without it the deck header draws exactly
  // the card-details trigger it drew before the feature (audit F6).
  const page = changeCommanderEnabled(env) ? (
    <ChangeCommanderProvider
      // One provider per deck: a client navigation to another deck must not carry an open sheet
      // or its chosen candidate across, where it would be written against the new deck.
      key={id}
      deckId={id}
      deckName={detail.name}
      pair={detail.partner !== null}
      hasVersion={versions.length > 0}
    >
      {tooled}
    </ChangeCommanderProvider>
  ) : tooled;
  // The deck's tokens reach the decklist through a context, outermost so no wrap above has to know of them.
  const deckTokens = tokensRead ? await tokensRead : null;
  // The buy box's figure includes the tokens' prices, which can be older than the cards' (the token ingest
  // refuses on its own floor), so its date is the older of the two.
  const tokenNewest = deckTokens?.status === "ok" ? deckTokens.newestPriceAsOf : null;
  const combinedAsOf = tokenNewest && priced?.newestAsOf && tokenNewest < priced.newestAsOf ? tokenNewest : null;
  return deckTokens ? (
    <DeckTokensProvider
      deckId={id}
      read={deckTokens}
      provenance={combinedAsOf ? provenanceForm(combinedAsOf, new Date()) : null}
      ownProvenance={tokenNewest ? provenanceForm(tokenNewest, new Date()) : null}
    >
      {page}
    </DeckTokensProvider>
  ) : page;
}
