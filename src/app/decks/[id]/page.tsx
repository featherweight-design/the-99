// /decks/[id] — Builder page.
// §Builder Spine, §Role Counter Strip, §Guided Banner, §Degraded Suggestions Banner.
import { perfRoute } from "../../../lib/perf/timing";
import { notFound, redirect } from "next/navigation";
import { preload } from "react-dom";
import { loadCandidateFacts } from "../../../lib/profile/candidate-facts";
import { loadCompletionPartners } from "../../../lib/combos/near-miss";
import { comboFor, comboLookupIds, deckComboFields } from "../../../lib/combos/attach";
import { dropDismissed, readDismissedSuggestions } from "../../../lib/precons/suggestion-dismissed";
import { readPreconAddReceipt } from "../../../lib/precons/add-receipt-read";
import { readImportAddReceipt } from "../../../lib/decks/import-add-receipt";
import { readPreconArrival } from "../../../lib/precons/arrival-read";
import { carryOnArrival } from "../../../lib/precons/arrival-carry";
import { readDeckPreconLink } from "../../../lib/precons/link-read";
import { readDeckOriginAndStart } from "../../../lib/precons/start-version";
import { loadDeckStrategy } from "../../../lib/strategy/load";
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
import { loadInDeckPartnersCached } from "../../../lib/combos/in-deck-cache";
import { loadNearCombos } from "../../../lib/combos/near-combos";
import { loadDeckSuggestions } from "../../../lib/decks/suggestions-read";
import { applyConsiderLabels, considerLabelDeps, considerLabels } from "../../../lib/decks/consider-labels";
import { BuilderShell } from "../../../components/decks/builder-shell";
import { readStoredPermits } from "../../../lib/profile/stored";
import { randomUUID } from "node:crypto";
import { LandingKeyed } from "../../../components/decks/landing-keyed";
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
import { roleCounterFor } from "../../../lib/decks/label-role-counts";
import { analysisTabEnabled } from "../../../lib/decks/analysis-flag";
import { readDeckNotes } from "../../../lib/decks/notes-read";
import { loadJobRows } from "../../../lib/decks/job-rows";
import { loadDeckMix } from "../../../lib/decks/deck-mix";
import { settleLabelRead } from "../../../lib/decks/label-read-settle";
import { loadStatsLabels } from "../../../lib/decks/stats-labels";
import { loadStatsAverage } from "../../../lib/decks/stats-average-load";
import { loadLandMana } from "../../../lib/decks/land-mana";
import { loadSourceMana } from "../../../lib/decks/source-mana";
import { loadDeckOpponents, opponentsWire } from "../../../lib/decks/deck-opponents-read";
import { loadFriendDeckPrefs } from "../../../lib/social/deck-visibility";
import { tablePrefill } from "../../../lib/social/rule-zero-log";
import { logPrefillTable } from "../../../lib/rule-zero/table-view";
import { proposedCutsEnabled, suggestedChangesV2Enabled, tuningEnabled, tuningHubEnabled } from "../../../lib/tuning/flag";
import { loadDeckNotices } from "../../../lib/notices/read";
import { NOTICES_PARAM, readNoticesArrival } from "../../../lib/notices/arrival";
import { SwapToolsProvider } from "../../../lib/swaps/context";
import { swapToolsEnabled } from "../../../lib/swaps/flag";
import { printedNameOf } from "../../../lib/collection/browse";
import { loadDeckTokens } from "../../../lib/tokens/read";
import { DeckTokensProvider } from "../../../components/decks/deck-tokens-context";
import { DeckPageSwitches } from "../../../components/decks/deck-page-switches";
import { GotItProvider } from "../../../components/decks/got-it";
import { ChangeCommanderProvider } from "../../../components/decks/change-commander-context";
import { readShoppingLimit } from "../../../lib/swaps/read";
import { BODY_PARAM, initialBuilderView, readBuilderView, readDeckBody, TAB_PARAM } from "../../../lib/decks/builder-view";
import { isUuid } from "../../../lib/uuid";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { SWITCH_FLAGS } from "../../../lib/switches/flags";
import { TOOL_PARAM, deckToolLanding } from "../../../lib/discovery/tools";
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

// Suggested changes and Proposed cuts run as Server Actions invoked from this page, so the page's limit bounds them, and
// their `after()` work too: Next runs `after` for the route's configured limit. 600s is Suggested changes v2's (plan
// 2026-10-27, P2): a run of up to four streamed calls inside `V2_RUN_BUDGET_MS`, several times the prototype's p90 at
// N=20, with the writes in the margin. Proposed cuts' 170s deadline (CUTS_MODEL_TIMEOUT_MS, small items G2) and v10's
// 110s (MODEL_TIMEOUT_MS) fit well under it, and a function bills only while it runs. `src/lib/tuning/limits.test.ts`
// fails if any of them stops fitting under this figure.
export const maxDuration = 600;

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
  // THE PRECON CARRY-OVER, INLINE ON THE ARRIVAL VISIT (small items 5, d9's ruling): the start's own landing
  // (`?from=precon`) stores the deck's first reading and attaches the precon's Overview before anything
  // reads the stored reading, so the header's bracket shows at once and no pending state is drawn. Started
  // now, beside Stage A, and awaited only by the reads of what it writes (the chip and the notices below).
  // Every other visit runs nothing; a repeat is a no-op (`arrival-carry.ts`), and it never throws.
  const carried = perf.timed("preconCarry", () => carryOnArrival(
    arrivedFromPrecon(query[PRECON_ARRIVAL_PARAM]), id, userId, env,
  ));

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
    perf.timed("availability", () => loadAvailability(userId, { excludeDeckId: id })).catch(() => {
      recordSoftFailure();
      return null;
    }),
  );
  const detailRead = early(perf.timed("getDeckDetail", () => getDeckDetail(id, userId, availabilityRead)));
  // The Jobs card's labels start the moment the detail resolves, beside every other read, and are
  // awaited only where the card is drawn.
  // One label read serves the Jobs card and the Mana colors card's non-land sources.
  const statsLabelsRead = early(detailRead.then((d) => (d ? perf.timed("statsLabels", () => loadStatsLabels(d.cards)) : null)));
  const statsJobsRead = early(Promise.all([detailRead, statsLabelsRead]).then(([d, labels]) => (d ? loadJobRows(d.cards, labels) : null)));
  // The Colors card's land supply: what each land in the deck can add, read from the catalog's text
  // the moment the detail resolves, and awaited only where the card is drawn.
  const statsLandsRead = early(detailRead.then((d) => (d
    ? perf.timed("statsLands", () => loadLandMana(d.cards, [...d.commander.colorIdentity, ...(d.partner?.colorIdentity ?? [])]))
    : null)));
  // The same card's non-land sources: which cards make mana comes from the labels, the colors from the text.
  const statsSourcesRead = early(Promise.all([detailRead, statsLabelsRead]).then(([d, labels]) => (d
    ? perf.timed("statsSources", () => loadSourceMana(d.cards, [...d.commander.colorIdentity, ...(d.partner?.colorIdentity ?? [])], labels))
    : null)));
  // The Average card's basis: the commander's (or pair's, or colors') average deck, through the basis chain.
  const statsAverageRead = early(detailRead.then((d) => (d ? perf.timed("statsAverage", () => loadStatsAverage(d)) : null)));
  // A 60-second cached read shared by both cached payloads below, resolved once rather than
  // per entry, and chained into the suggestions rather than awaited on its own.
  const indexGenRead = early(perf.timed("indexGeneration", () => indexGeneration()));
  // THE ROW'S COMBO MARKS start the moment the detail resolves, beside the suggestions read, not after it: the statement needs only
  // the deck's own card and commander ids. It used to start with the candidate-keyed reads below and, at ~390ms, was the last to
  // finish. Cached by its inputs (`in-deck-cache.ts`); a read that fails answers null, as it did inline.
  const inDeckCombosRead = early(
    detailRead.then((d) =>
      d
        ? perf.timed("inDeckCombos", () => loadInDeckPartnersCached({
            userId,
            deckId: id,
            deckOracleIds: d.cards.map((c) => c.oracleId),
            commanderOracleIds: [d.commander.oracleId, ...(d.partner ? [d.partner.oracleId] : [])],
          })).catch(() => null)
        : null,
    ),
  );
  // COMBOS ONE PIECE AWAY (combos close, G7): the status line's segment and its list, two-card combos
  // only (G2). Started with the request beside the row's combo marks; it needs only the deck id. NOT
  // cached: where each missing piece is moves with availability and prices. A read that fails answers null, and the page draws no segment.
  const nearCombosRead = early(
    // Uncapped: the sheet lists every combo its count names, so the segment's count and the sheet's
    // rows always agree. Two-card near combos run to 54 on staging's busiest deck, a small payload.
    perf.timed("nearCombos", () => loadNearCombos({ userId, deckId: id, maxPieces: 2, cap: Number.POSITIVE_INFINITY })).catch(() => null),
  );
  const suggestionsRead = early(indexGenRead.then((indexGen) =>
    // The mix is always counted by label now (LABEL_ROLE_COUNTS retired, Hugh 2026-10-31), so no switch
    // decides it; `switchBits` stays in the key only until the switch's delete PR.
    perf.timed("suggestions", () => cacheForUser(userId, [...SUGGESTIONS_KEY, id, indexGen, switchBits(env)], () =>
      loadDeckSuggestions(id, userId, env),
    ))));
  // The move-card picker lists every other deck by name, as it always has.
  // The notes read is its own, uncached read, outside the two cached ones above (a write revalidates the
  // route, and nothing cached holds a note).
  const notesRead = early(detailRead.then((d) => (d ? perf.timed("notes", () => readDeckNotes(id, userId, { commanderOracleId: d.commander.oracleId, partnerOracleId: d.partner?.oracleId ?? null })) : null)));
  const allDecksRead = early(perf.timed("listDecks", () => listDecksWithStats(userId, "name")));
  // The reader's shelves, for the header menu's Move (the deck's own shelf rides on its list row).
  // A failed read costs the menu its Move row and nothing else.
  const foldersRead = early(perf.timed("folders", () => listFolders(userId)).catch(() => null));
  // The reader's own friend deck rules, for the header menu's Hidden from friends (friend decks README 4). A failed
  // read costs the menu that row and the header its mark, nothing else.
  const friendPrefsRead = early(perf.timed("friendDeckPrefs", () => loadFriendDeckPrefs(userId)).catch(() => null));
  // The deck's strategy and its focus, uncached: a card edit revalidates this page, and the
  // block's +N / −N counts the list as it stands. A failed read costs the block, nothing else.
  const strategyRead = analysisTabEnabled(env)
    ? early(perf.timed("strategy", () => loadDeckStrategy(userId, id, env)).catch(() => null))
    : null;
  const gamesRead = early(perf.timed("games", () => listDeckGames(id, userId)));
  // Who sat across the table, and the matchups drawn from it (Social R3). Never throws: a failed read draws no
  // Matchups and no `vs` lines, and the games stand as they were.
  const opponentsRead = early(gamesRead.then((g) => perf.timed("opponents", () => loadDeckOpponents(id, userId, g, env))));
  // The game log's seats from a Rule 0 table (plan §PR 8), when `Log this game` brought the reader here. Read per
  // request and outside every cached payload: it is one table's seating right now. Any mismatch (not seated, the
  // table closed, another deck in the seat) or a failed read is null, and the Games tab opens as it always has.
  const prefillTable = logPrefillTable(query, true);
  const prefillRead = prefillTable === null
    ? null
    : early(perf.timed("tablePrefill", () => tablePrefill(userId, prefillTable, id)).catch(() => null));
  // Not swallowed, unlike the price and availability reads below. Those degrade to a missing
  // ornament; a ledger that quietly vanished would tell the player their passes are gone, which is
  // a lie about deck state.
  const fillPassesRead = early(perf.timed("fillPasses", () => readFillPasses(id, userId)));
  // Not swallowed either, and for the stronger version of the same reason: a failed read would
  // take the to-do card's pending row away, and a deck with pending changes and no row offers no
  // route to Review, where a commit is made, at all.
  const draftRead = early(perf.timed("draft", () => loadDraftState(id, userId)));
  // v0 (precons PR 6b): a linked deck's precon list, read from `precon_cards` and never a version.
  // Started here with no test of the link first, because the read IS the test: owner-scoped, and an
  // unlinked deck joins no row. A failed read draws no v0, rather than failing the deck.
  const originRead = early(perf.timed("preconOrigin", () => readDeckOriginAndStart(userId, id)).catch((error) => {
    // not a fallback: v0 is drawn beside the history, never part of it.
    console.error("precons: the deck's v0 could not be read", error);
    return null;
  }));
  // The rail rides the deck's own `Versions` tab, so its rows are part of this page. v1's delta is
  // counted against v0 when v0 is drawn apart; a started deck's first version IS v0, and has none.
  const versionsRead = early(perf.timed("versions", () => listVersions(
    id, userId, originRead.then((o) => (o && o.summary.startVersionId === null ? o.cards : null)),
  )));
  // "Kept for this deck"'s Set picker (H35, PR 2) — the same cached, unscoped list
  // help-me-choose's intake form reads. Degrades to an empty picker rather than failing the page.
  // Tuning-only: the Set picker lives inside the tuning panel alone (`builder-shell.tsx`), so
  // with Tuning off this read is never started and the page pays none of its catalog queries.
  const printedInSetsRead = tuned
    ? early(perf.timed("printedInSets", () => loadCommanderPrintings().then((x) => x.sets).catch(() => [])))
    : Promise.resolve([] as PrintedInSet[]);
  const detail = await detailRead;
  // A Try it (`?tool=`) aimed at a deck that is gone since its card rendered lands on `/decks`, with no halo, rather
  // than on the not-found page (discovery R2, STATES-showcase-reference: "Deck gone since render", L2).
  if (!detail && query[TOOL_PARAM] !== undefined) redirect("/decks");
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
    ? carried.then(() => perf.timed("storedPermits", () => readStoredPermits(id, userId))).catch(() => undefined)
    : Promise.resolve(null);
  // The header's notice tag, read WITH the page so it paints with the header rather than arriving
  // after it. A failed read draws no tag, as a deck with no notices does; the shell reads again
  // after mount in that case.
  const showNotices = analysisTabEnabled(env);
  const initialNotices = showNotices
    ? carried.then(() => perf.timed("notices", () => loadDeckNotices(id, userId))).catch(() => null)
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
  const preconArrivalRead = arrivedFromPrecon(query[PRECON_ARRIVAL_PARAM])
    ? early(perf.timed("preconArrival", () => readPreconArrival(userId, id)))
    : null;
  // The receipt of the add that began this start (`?added=<entry>`, beside `from=precon`). The id is a claim off the
  // URL: the read answers only for the reader's own unreverted precon entry, and draws nothing otherwise.
  const preconAddedParam = query[PRECON_ADDED_PARAM];
  const preconAddReceiptRead = arrivedFromPrecon(query[PRECON_ARRIVAL_PARAM]) && typeof preconAddedParam === "string"
    ? early(perf.timed("preconAddReceipt", () => readPreconAddReceipt(userId, preconAddedParam, id)).catch(() => null))
    : null;
  // The ticked import's receipt (no-collection entry S10): `?added=<entry>` beside `imported=1`. The same one-time
  // claim, read only for the reader's own add written for this deck; a failed read draws the plain strip.
  const importAddReceiptRead = arrivedFromImport(query[IMPORTED_PARAM]) && typeof preconAddedParam === "string"
    ? early(perf.timed("importAddReceipt", () => readImportAddReceipt(userId, preconAddedParam, id)).catch(() => null))
    : null;
  // The precon link's doors (R3): an unlinked deck's suggestion and the Versions foot row's picker,
  // counted at read and never stored (lock 2). Owner-scoped in its own SQL. A failed read draws
  // neither door, as a linked deck does, rather than failing the deck.
  const preconLinkRead = early(perf.timed("preconLink", () => readDeckPreconLink(userId, id)).catch((error) => {
    // not a fallback: an ornament drawn beside the page, never cached in it.
    console.error("precons: the deck's link could not be read", error);
    return null;
  }));
  const tokensRead = early(detailRead.then((d) => (d
    ? perf.timed("deckTokens", () => loadDeckTokens(id, userId, new Map([
      ...d.cards.map((c) => [c.oracleId, { imageUri: c.imageUri ?? null, name: printedNameOf(c) }] as const),
      ...[d.commander, d.partner].filter((c) => !!c).map((c) => [c!.oracleId, { imageUri: c!.imageUri ?? null, name: c!.printedName ?? c!.name }] as const),
    ])))
    : ({ status: "absent" } as const))));
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
    deckOpponents,
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
            const art = await perf.timed("topOffArt", () => chainArt(userId, null, read.map((c) => c.oracleId)));
            return { ranked: read, ownedArt: art };
          })
        : { ranked: [], ownedArt: new Map<string, string>() },
      gamesRead,
      fillPassesRead,
      draftRead,
      versionsRead,
      printedInSetsRead,
      opponentsRead,
    ]);

  // The figures the version held, for the `was n` line in the mix cells. Read
  // only when there is a draft to compare against, and through the same
  // `computeRoleCounts` the strip itself uses — two folds would put two
  // different decks in one cell.
  const versionShape = hasChanges(draft) && draft.version
    ? await perf.timed("versionShape", () => loadVersionShape(draft.version!.id))
    : null;
  // `wasCounts` is folded below, after the label rows it may need are read.

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
  const [priced, availability, candidateFacts, completions, considerRead, inDeckCombos, nearCombos] = await Promise.all([
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
    ], await readHeldPricePicks(userId, [id]))).catch(() => null),
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
    // nothing that entry's key carries. Swallowed like its neighbours: a failed read filters nothing.
    perf.timed("considerLabels", () => considerLabels({
      suggestionIds: suggestions.map((s) => s.oracleId),
    }, considerLabelDeps())).catch(() => null),
    // THE ROW'S COMBO MARK: each card's two-card combo partner already in this deck, the commanders counted (rule 3). Started with the
    // detail (above), cached by its inputs; swallowed like its neighbours: a failed read draws no mark.
    inDeckCombosRead,
    // Combos one piece away (above); null when it failed.
    nearCombosRead,
  ]);

  // Attached here, server-side, on lists that are being built anyway — so no
  // component below does a map lookup during render, and BuilderShell takes one
  // extra scalar rather than a collection across the boundary.
  const withPrice = <T extends { oracleId: string }>(card: T) => ({
    ...card,
    price: priced ? priceFor(priced, id, card.oracleId) : null,
  });
  const cards = detail.cards.map(withPrice).map((c) => ({ ...c, ...deckComboFields(c.oracleId, inDeckCombos) }));
  // The commanders carry a price for the same reason, and on the same rule: the Shopping list
  // draws an unowned or spoken-for commander in its own group, priced like the rows below it.
  const commander = { ...withPrice(detail.commander), ...deckComboFields(detail.commander.oracleId, inDeckCombos) };
  const partner = detail.partner
    ? { ...withPrice(detail.partner), ...deckComboFields(detail.partner.oracleId, inDeckCombos) }
    : null;
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
  // Try it's one-time `?tool=` (discovery R2, E11): a deck tool whose switch is on for this reader opens its tab
  // and view, and the shell lands on its target. Anything else is null, and the shell strips it with no halo.
  const landing = deckToolLanding(query[TOOL_PARAM], (name) => SWITCH_FLAGS[name](env), analysisEnabled);
  // A token per server render that carries `?tool=`: a client navigation to the same deck with a new (or the same)
  // `?tool=` re-renders the page and moves it, and `LandingKeyed` remounts the deck's builder and providers for it; a render without one is
  // null and keeps the builder as it is.
  const landingRequest = query[TOOL_PARAM] === undefined ? null : randomUUID();
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

  // THE STRIP COUNTS BY LABEL (LABEL_ROLE_COUNTS retired, Hugh 2026-10-31): the Jobs card's own tally, over
  // the rows it reads. The map covers the cards the page holds (a search result or a resolved row is not among them, and falls back to card.role in the toast): the deck's (already read), the
  // version a draft compares to, and the suggestions and candidates a reader can add, which the
  // toast and the shelves count against. One more read for the cards the deck's does not cover. Null
  // (the deck's read failed) counts by `card.role`.
  // The read failed: the counts fall back to the classifier, so the targets must
  // too, or the strip grades classifier counts against `label_*` targets.
  let shellMix = mix;
  const base = await statsJobsRead;
  const extra: { oracleId: string; typeLine: string }[] = [];
  const wanted = [...(versionShape ?? []), ...pricedSuggestions, ...candidates];
  if (base) {
    const known = new Set(Object.keys(base));
    for (const c of wanted) {
      if (c.oracleId !== undefined && !known.has(c.oracleId)) extra.push({ oracleId: c.oracleId, typeLine: c.typeLine });
    }
  }
  const more = base && extra.length > 0 ? await perf.timed("labelRowsExtra", () => loadJobRows(extra)) : {};
  const settled = settleLabelRead([base, more], [
    ...detail.cards.map((c) => c.oracleId),
    ...wanted.map((c) => c.oracleId).filter((id): id is string => id !== undefined),
  ]);
  const labelRows: JobRowsByCard | null = settled.rows;
  // The ids that read covered. The map is sparse (an unlabeled card has no entry), so this is what
  // tells a card with no label from a search result the page never asked about.
  const labelQueried: string[] | null = settled.queried;
  if (settled.classifierTargets) shellMix = await loadDeckMix(id, userId, "classifier");
  const wasCounts = versionShape ? roleCounterFor(labelRows)(versionShape) : undefined;

  const thisDeck = allDecks.find((d) => d.id === id);
  const folders = await foldersRead;
  const friendPrefs = await friendPrefsRead;
  const strategy = strategyRead ? await strategyRead : null;
  const friendHide = friendPrefs && thisDeck ? { hidden: thisDeck.hiddenFromFriends === true, prefs: friendPrefs } : undefined;
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
      friendHide={friendHide}
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
      games={games}
      gameOpponents={deckOpponents ? opponentsWire(deckOpponents) : null}
      gameSummary={gameSummary}
      versions={versions}
      // The receipts' parameters (`imported`, `printings`, `from`, `added`, `updated`) are read here once.
      // The shell holds what they said for the visit and takes them off the address, so a refresh or a
      // bookmark brings no receipt (`useVisitReceipts`).
      arrivedFromImport={arrivedFromImport(query[IMPORTED_PARAM])}
      // `?from=precon`: the one navigation "Start a deck from this" made.
      preconArrival={preconArrivalRead ? await preconArrivalRead : null}
      preconAddReceipt={preconAddReceiptRead ? await preconAddReceiptRead : null}
      importAddReceipt={importAddReceiptRead ? await importAddReceiptRead : null}
      // A linked deck gets neither door: no suggestion (lock 2). Its link is drawn in Versions as v0
      // (precons PR 6b), and on the open precon with Unlink (PR 6a-2).
      preconLink={await preconLinkRead.then(async (l) => {
        if (!l || l.linked !== null) return null;
        // A suggestion the reader closed stays closed, on the account (deck messages A11): per deck and precon.
        const closed = l.suggestions.length > 0 ? await readDismissedSuggestions(userId, id).catch(() => new Set<string>()) : null;
        return { suggestions: closed ? dropDismissed(l.suggestions, closed) : l.suggestions, picker: l.picker };
      })}
      preconOrigin={(await originRead)?.summary ?? null}
      // Deck printings: the strip's printing clauses, from the same one navigation.
      arrivalPrintings={readArrivalPrintings(query[PRINTINGS_PARAM])}
      updateArrival={readUpdateArrival(query[UPDATED_PARAM])}
      // How a URL names the tab it opens on. Read on arrival only — the builder
      // never writes it back, so switching tabs still costs no history entry.
      // Nothing in the app produces such a URL now that `/decks/[id]/versions`
      // is retired; see the note in `lib/decks/builder-view.ts`.
      analysisEnabled={analysisEnabled}
      notesData={await notesRead}
      statsData={{
        jobs: await statsJobsRead,
        lands: await statsLandsRead,
        sources: await statsSourcesRead,
        average: await statsAverageRead,
        commanders: [detail.commander, ...(detail.partner ? [detail.partner] : [])].map((c) => ({
          cmc: c.cmc ?? 0,
          typeLine: c.typeLine,
          manaCost: c.manaCost,
          colorIdentity: c.colorIdentity,
          quantity: 1,
        })),
      }}
      tuningEnabled={tuned}
      strategy={strategy}
      socialGames={true}
      gamePrefill={prefillRead ? await prefillRead : null}
      proposedCutsEnabled={proposedCutsEnabled(env)}
      tuningHubEnabled={tuningHubEnabled(env)}
      suggestedChangesV2={suggestedChangesV2Enabled(env)}
      initialNotices={notices}
      // The tile's `!` asks for the sheet (`noticesHref`). The shell opens it on arrival and strips
      // the parameter, so a refresh lands on the deck alone.
      openNoticesOnArrival={showNotices && readNoticesArrival(query[NOTICES_PARAM])}
      storedPermits={storedBracket}
      storedPermitsUnknown={storedRead === undefined}
      // Resolved on the SERVER, where the flag is read. A URL naming `analysis` against a
      // deployment that does not draw it lands on the decklist rather than on an unselected
      // row above an empty panel — the same rule `versions` already has for a brew.
      landing={landing}
      landingRequest={landingRequest}
      nearCombos={nearCombos}
      // `?panel=`: the ?'s way back to Shopping, Stats or Notes (About PR 6a); the builder reads it on the deck tab only.
      initialBody={readDeckBody(query[BODY_PARAM])}
      initialView={initialBuilderView(
        landing?.lands.tab ?? readBuilderView(query[TAB_PARAM]),
        // A linked brew's Versions tab holds v0 (K14), so a URL naming it lands there.
        versions.length + ((await originRead)?.summary.startVersionId === null ? 1 : 0),
        analysisEnabled,
      )}
    />
  );
  // Switches read here and needed several layers down.
  // `socialFriends`: the stand-ins modal reads friends' spares from the uncached route (Social R2 PR 8a).
  // `spareAsks`: Shopping's spares modal offers Ask, and the rows draw the ask's mark (spare requests PR 3b).
  const switched = (
    <DeckPageSwitches
      socialFriends={true}
      spareAsks={true}
    >
      {shell}
    </DeckPageSwitches>
  );
  // I got it: the Shopping rows' tags open its confirm. Keyed per deck, so an open confirm never carries to another deck's page.
  const bought = <GotItProvider key={id} deckId={id}>{switched}</GotItProvider>;
  const tooled = swapTools ? (
    <SwapToolsProvider deckId={id} deckName={detail.name} storedLimitCents={shoppingLimit}>{bought}</SwapToolsProvider>
  ) : bought;
  // Change commander's door and sheet read this context.
  const page = (
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
  );
  // A new Try it landing (`?tool=`) remounts everything that is this deck's own state, the builder and every
  // deck-local provider around it (an open stand-ins modal, I got it's confirm, Change commander's sheet), so it lands
  // as an arrival from another route does. Keyed per deck too.
  const landed = <LandingKeyed key={id} request={landingRequest}>{page}</LandingKeyed>;
  // The deck's tokens reach the decklist through a context, outermost so no wrap above has to know of them.
  const deckTokens = await tokensRead;
  // The buy box's figure includes the tokens' prices, which can be older than the cards' (the token ingest
  // refuses on its own floor), so its date is the older of the two.
  const tokenNewest = deckTokens.status === "ok" ? deckTokens.newestPriceAsOf : null;
  const combinedAsOf = tokenNewest && priced?.newestAsOf && tokenNewest < priced.newestAsOf ? tokenNewest : null;
  return (
    <DeckTokensProvider
      deckId={id}
      read={deckTokens}
      provenance={combinedAsOf ? provenanceForm(combinedAsOf, new Date()) : null}
      ownProvenance={tokenNewest ? provenanceForm(tokenNewest, new Date()) : null}
    >
      {landed}
    </DeckTokensProvider>
  );
}
