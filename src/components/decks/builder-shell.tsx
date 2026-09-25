// Builder Shell — top-level client composition for /decks/[id].
// Owns: deck|consider view, group toggle, All|Shopping filter, Consider sort, export open.
// Discovery is a peer view of the decklist rather than a rail or a sheet, so the
// coverage strip stays above both and the quick-add bar is pinned under both.
"use client";

import { printedFaceName } from "../../lib/collection/browse";
import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from "react";
import { printedNameOf } from "../../lib/collection/browse";
import { deckBodySize } from "../../lib/decks/deck-size";
import type { DeckDetail } from "../../lib/decks/read";
import { countStatus, statusPill } from "../../lib/decks/status";
import { availabilityState, hardDecks } from "../../lib/decks/availability";
import { isShoppingCard } from "../../lib/decks/shopping";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { BuilderSpine } from "./builder-spine";
import { AnalysisPanel } from "./analysis-panel";
import { HoverPreviewProvider } from "./hover-preview";
import { TuningPanel } from "./tuning-panel";
import { pressNote } from "./synopsis-note";
import { SynopsisOverview } from "./synopsis-overview";
import { useDeckSynopsis } from "./synopsis-state";
import { shownReading, useDeckProfile } from "./use-deck-profile";
import { isOpening, useOpeningGate } from "./use-opening-gate";
import { useHeaderBracket } from "./use-header-bracket";
import { chipAnswer } from "../../lib/bracket/chip-answer";
import type { Bracket } from "../../lib/bracket/types";
import { useDeclaration } from "./use-declaration";
import { RoleCounterStrip } from "./role-counter-strip";
import { ArrivalStrip } from "./arrival-strip";
import { UpdateStrip } from "./update-strip";
import type { UpdateArrivalState } from "../../lib/decks/arrival";
import { UnresolvedBanner } from "./unresolved-banner";
import { GuidedBanner } from "./guided-banner";
import { CardFan } from "../marks";
import { Crown } from "../ui/crown";
import { addPanelCopy, builtFragment, shortCommanderName } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import {
  clearAutoCards,
  keepAllAutoCards,
  restoreAutoCards,
  type SweptRow,
} from "../../app/decks/actions";
import { Decklist } from "./decklist";
import { BuilderTabs, type BuilderView } from "./builder-tabs";
import { builderTabSpecs } from "../../lib/decks/builder-tab-specs";
import { initialBuilderView } from "../../lib/decks/builder-view";
import { ConsiderPanel, rolesWithShelves } from "./consider-panel";
import { GamesPanel } from "./games-panel";
// Types only: `games.ts` reaches for the database, and a value import from a
// "use client" module would drag drizzle into the browser bundle.
import type { DeckGame, GameSummary } from "../../lib/decks/games";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";
import { QuickAddBar } from "./quick-add-bar";
import { ExportDialog } from "./export-dialog";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { comboScopeIds } from "../../lib/decks/combo-scope";
import { AddOptimisticCardProvider, useOptimisticDeckCards } from "./optimistic-deck";
import { MutationError } from "./mutation-error";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { ProvenanceLedger, FillFailedBannerConnected } from "./provenance-line";
import { PassMarkProvider, passMarkFor, fillPassLabel } from "./pass-mark";
import { topOffCopy } from "../../lib/copy/top-off";
// Type only, for the same reason `games.ts` is imported as one: the module
// reaches for the database.
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { LastSlotsStrip } from "./last-slots-strip";
import { PendingBanner } from "./pending-banner";
import { VersionRail } from "./version-history";
// Type only: `versions.ts` reaches `src/db`, which throws at module init in a
// browser. See `src/lib/client-bundle-safety.test.ts`.
import type { VersionSummary } from "../../lib/decks/versions";
import { PendingChangeProvider } from "./pending-change";
import { LockCardsProvider, useCardLocks } from "./lock-cards";
// `draft-shape`, not `draft-state`: the latter holds the reads and imports `db`.
import { hasChanges, type DraftState } from "../../lib/decks/draft-shape";
import { cardCopies, deckCounts, unresolvedCardCount, type DeckDetailCard } from "../../lib/decks/grouping";
import { computeRoleCounts, type MixRole, type RecommendedMix } from "../../lib/decks/mix";
import { useIsDesktop } from "../ui/use-is-desktop";
import type { ProvenanceForm } from "../../lib/decks/price";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
import { proxiedCardCount } from "../../lib/decks/proxy-count";
import { NoticesBody } from "./notices-body";
import { headerNotice } from "./notice-tag";
import { deckNoticesCopy } from "../../lib/copy/notices";
import { deckIdentity } from "../../lib/decks/format";
import { openNotices, peekNotices } from "../../lib/notices/actions";
import type { DeckNotices } from "../../lib/notices/read";

// Shared by both shelf paths — the one that is already on Consider and the one
// that has to switch views first — so they land identically.
// Focus moves as well as the scroll: activating a coverage cell is a jump, and
// a keyboard user whose focus stayed behind on the strip would have to tab the
// whole way down to reach what they just asked for. The heading carries
// tabIndex={-1} for exactly this.
function scrollToShelf(role: MixRole) {
  const heading = document.getElementById(`shelf-${role}`);
  if (!heading) return;
  heading.scrollIntoView({ block: "start" });
  heading.focus({ preventScroll: true });
}

// The unresolved group renders only in the deck view under the All filter, so
// both paths into it — already there, or having just been sent there — land on
// the same call.
function scrollToUnresolved() {
  document.getElementById("unresolved-group")?.scrollIntoView({ block: "start" });
}

interface BuilderShellProps {
  /** What this deck is compared to, resolved once per request by the route. A PROP rather than
   *  an import: the targets are per-commander now, and a component reaching for a module
   *  constant would draw one deck's recommendation on every deck. */
  mix: RecommendedMix;
  deck: DeckDetail;
  suggestions: DeckSuggestionWithFacts[];
  degraded: boolean;
  firstRun: boolean;
  commanderIdentity: string[];
  /** True only on the navigation the import itself made — see src/lib/decks/arrival.ts. */
  arrivedFromImport: boolean;
  /** Counts from the navigation an applied update made, or null on every other
   *  arrival. Like `arrivedFromImport`, true of one trip rather than of the deck. */
  updateArrival?: UpdateArrivalState | null;
  /** EDHREC inclusion % for each unowned card in the deck, keyed by oracleId.
      Cards with no EDHREC figure are absent from the map — never stored as 0.
      Null when EDHREC was unreachable, which is not the same claim. */
  shoppingFigures?: Record<string, number> | null;
  /**
   * The newest `as_of` in the price table, for measuring a row's liveness.
   *
   * REQUIRED, with no default. A component that does not receive it reads every
   * live price as `absent` and draws a bare `buy` with no figure — a wrong price
   * rather than a missing prop, and silent. That shipped once: the commander
   * page threaded it to one of two synergy panels and every desktop row lost its
   * figure, while the phone was correct and every component test passed.
   *
   * Pass `null` explicitly where there is no price feed to measure against. The
   * point is that the caller states it.
   */
  newestAsOf: Date | null;
  /** Built on the server by `provenanceForm`, never in the browser: it compares
      against a clock, and a second call could flip `behind` at hydration. */
  provenance?: ProvenanceForm | null;
  /** Every card the top-off list can offer, ranked and uncapped, priced and
      availability-marked by the page route. An empty array is a state the strip
      renders rather than a reason to unmount it: the door stays while slots are
      open, and says the pool ran out. */
  candidates?: TopOffCandidateWithFacts[];
  /** The pool is empty because every ranked card argues against itself, which is
   *  a different fact from the collection running out and takes a different
   *  sentence. Defaults false: an absent flag is not a claim. */
  candidatesAllNegative?: boolean;
  /** One summary per fill pass, oldest first, passes with no live cards already
      dropped. Empty on a deck built before the ledger existed — which the
      ledger states rather than hides. */
  fillPasses?: FillPassSummary[];
  /** Every game logged against this deck, newest first. */
  games?: DeckGame[];
  /** Aggregated on the server — `summarizeGames` is pure, so running it here
      would only ship the work to the browser. */
  gameSummary?: GameSummary;
  /** What this deck's draft has changed since its newest version (#389). Read on
      every visit, so it is always present in the app — optional only so the
      shell's own tests can leave it out. Its absence draws no banner and no row
      marks, which is the right rendering for a surface that knows nothing. */
  draft?: DraftState | null;
  /** The role counts the newest version held, for the mix cells' `was n` line.
      Derived by the route from the same `computeRoleCounts` the strip uses. */
  wasCounts?: Record<MixRole, number>;
  /** Cards in the version a discard would land on, straight through to the
      banner — see `pending-banner.tsx`. Absent draws no `Discard` at all. */
  versionCards?: number;
  /** Every version this deck has committed, newest first. Empty on a brew, which
      draws no `Versions` tab at all — a tab explaining that a deck has no
      history is a tab advertising its own emptiness (§Decisions 4). */
  versions?: VersionSummary[];
  /** The tab this visit lands on, read off the URL by the route. Only the
      arrival: switching tabs stays component state, so nothing writes it back. */
  initialView?: BuilderView;
  /** `ANALYSIS_TAB_ENABLED` — whether this deployment draws the Analysis tab AND moves the
   *  Recommended mix strip into it. Off is today's layout, exactly. */
  analysisEnabled?: boolean;
  /** `NOTICES_ENABLED` (`src/lib/notices/flag.ts`): whether the header draws the notice tag and the
   *  Notices sheet can open. Off, nothing of the notices is read or drawn. */
  noticesEnabled?: boolean;
  /** The stored analysis's permitted range, for the header's bracket chip; null when unread. */
  storedPermits?: Bracket[] | null;
  /** `NEVER_CUT_ENABLED` (`src/lib/decks/never-cut-flag.ts`): whether the rows draw the lock and
   *  the toolbar offers Lock cards. Off, nothing of the lock is drawn or pressable. */
  neverCut?: boolean;
  /** `HELP_ME_CHOOSE_ENABLED` (`src/lib/intake/flag.ts`): whether the credit lines name Help me
   *  choose's deeper looks among what shares the credits. Off, they read as before the looks. */
  deeperLooks?: boolean;
}

// The Games tab's default: a deck nobody has logged against. Hoisted so the
// default parameter is one object rather than a fresh one per render.
const NO_GAMES: GameSummary = {
  count: 0,
  marked: 0,
  record: { wins: 0, losses: 0, draws: 0 },
  axes: [],
  keep: [],
  fix: [],
  mixed: [],
};

export function BuilderShell({
  mix,
  deck,
  suggestions,
  degraded,
  firstRun,
  commanderIdentity,
  arrivedFromImport,
  updateArrival = null,
  shoppingFigures = {},
  newestAsOf,
  provenance = null,
  candidates = [],
  candidatesAllNegative = false,
  fillPasses = [],
  games = [],
  gameSummary = NO_GAMES,
  draft = null,
  wasCounts,
  versionCards,
  versions = [],
  initialView = "deck",
  analysisEnabled = false,
  noticesEnabled = false,
  storedPermits = null,
  neverCut = false,
  deeperLooks = false,
}: BuilderShellProps) {
  // UI state
  const [filter, setFilter] = useState<"all" | "shopping">("all");
  const [grouping, setGrouping] = useState<"type" | "role">("type");
  const [view, setView] = useState<BuilderView>(
    initialBuilderView(initialView, versions.length, analysisEnabled),
  );

  // IN THE SHELL, not the panel. One tab panel renders at a time, so the Analysis panel unmounts
  // on every tab switch — a hook owned by the panel would lose its answer each time, and a
  // 630ms build is not something to pay twice for the same question. The shell survives those
  // switches, so this entry does too, and it dies with the visit when the route unmounts.
  //
  // It fetches on a PRESS, never on tab activation: Round 4's ruling 7 forbids an auto-run on
  // tab open, and it is newer and more specific than the plan's shape-3 choice.
  // (The hook itself is below the optimistic card list, which its key is read from.)
  // The deck's declaration for the whole shell: the verdict draws and takes it, and the card
  // note on Consider and the top-off list reads it — one owner, so they cannot disagree.
  const declaration = useDeclaration(deck.id, deck.declaredBracket);
  // The version this deck IS — committed, and the draft holding no change since — and the one
  // committed before it. A draft with edits is neither, and a brew has neither.
  const committedClean = draft?.version && !hasChanges(draft) ? draft.version : null;
  const thisVersion = committedClean
    ? versions.find((v) => v.number === committedClean.number) ?? null
    : null;
  const previousVersion = committedClean
    ? versions.find((v) => v.number === committedClean.number - 1) ?? null
    : null;
  const [sort, setSort] = useState<SortKey>("gaps");
  const [exportOpen, setExportOpen] = useState(false);
  const [unresolvedExpanded, setUnresolvedExpanded] = useState(false);
  const isDesktop = useIsDesktop();

  // True while the top-off commit is writing. Clearing the auto cards mid-write
  // would race the pass being placed, so ClearAutoButton is disabled for the
  // duration (design table states 3 and 8).
  const [fillInflight, setFillInflight] = useState(false);

  // The ledger's mark: which pass's cards the decklist below is highlighting.
  // One id, so "one pass at a time" is the representation rather than a rule
  // something has to enforce.
  const [markedPassId, setMarkedPassId] = useState<string | null>(null);
  // Reconciled against the incoming summaries during render, not in an effect.
  // An undo, a sweep or a keep-all can take the marked pass away on the server,
  // and an effect would leave one frame in which the ledger drew `aria-pressed`
  // on a line that is gone and the decklist marked nothing.
  const newestPassId = fillPasses.at(-1)?.id ?? null;
  const [seenNewestPassId, setSeenNewestPassId] = useState(newestPassId);
  if (seenNewestPassId !== newestPassId) {
    // A commit appends a pass. The mark was on the list the player was reading
    // before deciding, and the design clears it the moment a new pass lands.
    setSeenNewestPassId(newestPassId);
    if (markedPassId !== null) setMarkedPassId(null);
  }
  const markedPass = fillPasses.find((p) => p.id === markedPassId) ?? null;
  if (markedPassId !== null && markedPass === null) setMarkedPassId(null);
  const passMark = useMemo(() => passMarkFor(markedPass), [markedPass]);

  // The top-off list is open. At phone widths its commit bar takes the bottom
  // slot, so the quick-add dock hides — one bottom slot, one occupant (state
  // 20). Hidden with `display:none` rather than unmounted, so a half-typed
  // query is still there when the list closes.
  const [topOffOpen, setTopOffOpen] = useState(false);
  // The open list's commit bar is `fixed`, and the dock it displaces is hidden
  // rather than shrunk, so at phone widths NOTHING in flow holds the bottom slot
  // while the list is up and the tail of the decklist scrolls under the bar.
  // Measured by the bar itself, because it runs two lines or three depending on
  // whether the pass is spending money.
  const [topOffBarHeight, setTopOffBarHeight] = useState(0);

  // Every count and row below is drawn from this list rather than the server
  // props, so an add lands across the whole builder in the same frame as the
  // click. `deck.cards` remains the base React reverts to.
  const {
    cards: optimisticCards,
    unresolvedRows,
    unresolvedCount,
    addOptimisticCard,
    removeOptimisticCard,
    resolveOptimisticRow,
    deleteOptimisticRow,
    keepOptimisticCard,
    sweepOptimisticAuto,
    keepAllOptimisticAuto,
  } = useOptimisticDeckCards(deck.cards, deck.unresolvedRows);
  // The page's live region. Declared this high because the lock state below speaks into it.
  const [announcement, setAnnouncement] = useState("");
  // Locked (PR 4a): every lock pressed on this visit, drawn over the optimistic list, so the rows,
  // the key, the auto counts and the climb all read one answer. `lockCards` is the rows' context,
  // null with the switch off. The MODE lives here rather than in the list, so List ↔ Card (the
  // list's own state) keeps it, and a switch to Shopping (the shell's) can end it.
  const {
    cards,
    value: lockCards,
    mode: lockMode,
    setMode: setLockMode,
  } = useCardLocks({
    enabled: neverCut,
    deckId: deck.id,
    cards: optimisticCards,
    serverCards: deck.cards,
    announce: setAnnouncement,
  });
  // Every filter change goes through here. Shopping ends the mode (toolbar addendum F3): the
  // button is absent there, and a shopping list is not where a deck is locked.
  const changeFilter = useCallback(
    (next: "all" | "shopping") => {
      if (next === "shopping") setLockMode(false);
      setFilter(next);
    },
    [setLockMode],
  );
  // Keyed on the list the page DRAWS, the optimistic one, so an edit made in this visit retires the
  // reading on screen the moment the edit is drawn rather than when the server answers.
  const listKey = useMemo(
    () => cards.map((c) => `${c.oracleId}:${c.quantity}`).sort().join(","),
    [cards],
  );
  // THE PRESS ALSO WRITES THE OVERVIEW (synopsis PR 4): hung on the profile's `onFresh`, which
  // fires only for a press that landed a fresh reading over the list it asked about. Set in an
  // effect below, once the synopsis state it calls exists.
  const writeOnFresh = useRef<((deckId: string) => void) | null>(null);
  const onFresh = useCallback((deckId: string) => writeOnFresh.current?.(deckId), []);
  const profile = useDeckProfile(deck.id, listKey, onFresh);
  // Opening the Analysis tab shows an analysis already stored for this deck, if one matches it.
  // It never computes one; see `useDeckProfile`.
  const peekProfile = profile.peek;
  useEffect(() => {
    if (view === "analysis") peekProfile();
  }, [view, peekProfile]);
  // OPENING THE TAB (§8, 8a). Until the peek answers, an idle tab does not know whether this deck
  // is analyzed, so it must not say "not analyzed". The stored permits say whether there is
  // anything to fetch: none, and the empty state is the answer at once; some, and the tab draws
  // the opening loader until the peek settles. Decided on the client from what the page already
  // ships, rather than shipping the reading itself (see the PR's Settled).
  const opening = useOpeningGate(
    isOpening({
      shown: view === "analysis",
      kind: profile.state.kind,
      storedPermits,
      peekSettled: profile.peekSettled,
    }),
    deck.id,
  );
  // THE OVERVIEW, held here beside the profile for the same reason (synopsis plan, PR 3). Keyed on
  // the list and the reading on screen, so an edit or an analysis settling refetches whether the
  // stored overview is still current and what a write would cost. It never writes by itself.
  const reading = shownReading(profile.state);
  const readingFresh = profile.state.kind === "ready" && Boolean(reading?.fresh);
  const synopsis = useDeckSynopsis(
    deck.id,
    analysisEnabled && view === "analysis",
    `${listKey}|${reading?.analyzedAt ?? ""}|${readingFresh}`,
  );
  // The credit note beside each press that also writes, and whether it does (`synopsis-note.ts`).
  const analyzeNote = analysisEnabled ? pressNote(synopsis.view, "analyze", deeperLooks) : null;
  const reanalyzeNote = analysisEnabled ? pressNote(synopsis.view, "reanalyze", deeperLooks) : null;
  // A PRESS WRITES ONLY WHAT ITS NOTE SAID IT WOULD. Recorded when the press is made, so a note
  // that was not drawn (the state not yet read, the list already written, no credit left) is a
  // press that spends nothing, whatever the state says by the time the reading lands.
  const pressWrites = useRef(false);
  const requestAnalysis = useCallback(() => {
    pressWrites.current = Boolean(analyzeNote?.writes);
    profile.request();
  }, [analyzeNote?.writes, profile]);
  const writeSynopsisNow = synopsis.write;
  useEffect(() => {
    writeOnFresh.current = (landed: string) => {
      if (landed !== deck.id || !pressWrites.current) return;
      pressWrites.current = false;
      // A refusal (reused, in flight, allowance) is a silent no-op: the Overview re-reads either way.
      void writeSynopsisNow();
    };
  }, [deck.id, writeSynopsisNow]);
  const counts = deckCounts(cards, unresolvedCount);

  // THE HEADER'S BRACKET, held across an edit and retired by a change of deck; see `useHeaderBracket`.
  const headerPermits = useHeaderBracket({
    deckId: deck.id,
    cards,
    storedPermits,
    readyProfile: profile.state.kind === "ready" ? profile.state.profile : null,
    loading: profile.state.kind === "loading",
  });
  const headerBracket =
    analysisEnabled && headerPermits
      ? { permits: headerPermits, answered: chipAnswer(headerPermits, declaration.declared) }
      : null;

  // DECK NOTICES (plan PR 6). Read after mount by `peekNotices`, so the page's loader pays nothing
  // for them, and read again whenever a reading lands (a re-analysis clears data notices). Opening
  // the sheet marks what it showed as read (`openNotices`); the tag goes quiet at once rather than
  // on the next read.
  const [notices, setNotices] = useState<DeckNotices | null>(null);
  const [noticesShown, setNoticesShown] = useState<DeckNotices | null>(null);
  // Whether the foot pressed the reading now in flight or on screen: its busy and failed states are
  // DERIVED from the profile's own state while that holds, so a failure from the tab's Analyze is the
  // tab's to say. Cleared when the sheet closes.
  const [footPressed, setFootPressed] = useState(false);
  // All of it belongs to ONE deck. The shell is kept across a move between decks, so the tag and an
  // open sheet from the deck just left are dropped during render, before the next deck paints.
  const [noticesDeck, setNoticesDeck] = useState(deck.id);
  if (noticesDeck !== deck.id) {
    setNoticesDeck(deck.id);
    setNotices(null);
    setNoticesShown(null);
    setFootPressed(false);
  }
  const readingAt = reading?.analyzedAt ?? null;
  useEffect(() => {
    if (!analysisEnabled || !noticesEnabled) return;
    let live = true;
    // An open sheet takes the new read too: after the foot's Re-analyze the entries the new reading
    // absorbed leave the list at once, rather than on the next open.
    void peekNotices(deck.id).then((n) => {
      if (!live) return;
      setNotices(n);
      setNoticesShown((shown) => (shown && n ? n : shown));
    }).catch(() => {});
    return () => { live = false; };
  }, [analysisEnabled, noticesEnabled, deck.id, readingAt, listKey]);
  // Which deck's sheet is open NOW (null: none), readable from the reply's continuation:
  // `openNotices` answers after the sheet draws, and a reply landing after a close, or after a move
  // to another deck, must not draw the sheet or the tag again.
  const noticesOpenFor = useRef<string | null>(null);
  const deckNow = useRef(deck.id);
  useEffect(() => {
    deckNow.current = deck.id;
    noticesOpenFor.current = null;
  }, [deck.id]);
  const openNoticesSheet = () => {
    const id = deck.id;
    noticesOpenFor.current = id;
    if (notices) setNoticesShown(notices);
    void openNotices(id).then((n) => {
      if (!n || deckNow.current !== id) return;
      // The reply carries what the open RECORDED, so the tag takes it even after a close: quiet,
      // except for a legality set the server refused because the cards moved while it opened.
      setNotices(n);
      if (noticesOpenFor.current === id) setNoticesShown(n);
    }).catch(() => {});
  };
  const closeNoticesSheet = () => {
    noticesOpenFor.current = null;
    setNoticesShown(null);
    setFootPressed(false);
  };
  const headerNoticeTag = notices ? headerNotice(notices) : null;
  // The foot's Re-analyze recomputes the BRACKET only (D12): it never sets `pressWrites`, so no
  // overview is written and no credit is spent.
  const reanalyzeFromNotices = () => {
    pressWrites.current = false;
    setFootPressed(true);
    profile.request();
  };
  const footBusy = footPressed && profile.state.kind === "loading";
  const footFailed = footPressed && profile.state.kind === "failed";
  // Printed CARDS, commanders included — the same figure the `/decks` tile
  // draws, counted here off the rows the page already holds so the two surfaces
  // cannot disagree about one deck. Distinct marks, never copies: one mark on a
  // quantity-4 row is one printed card (ruling 5).
  // One derivation, shared with its test — see `proxiedCardCount`.
  const proxiedCount = proxiedCardCount(cards, deck.commander, deck.partner);
  // What a receipt tile draws for each card the findings can name: its own printed name and the
  // art of the copy this reader owns. Every one of them is a row here or a commander, so the map
  // is complete by construction and the profile never has to carry a printing.
  // The deck's locked cards, for the climb's sheet (Locked, D5): read off the rows this page holds,
  // so the sheet agrees with whatever the list shows, and the stored profile never sees a lock.
  const lockedIds = useMemo(() => new Set(cards.filter((c) => c.locked).map((c) => c.oracleId)), [cards]);
  const findingArt = useMemo(() => {
    const art = new Map<string, { name: string; imageUri: string | null }>();
    for (const c of [...cards, deck.commander, ...(deck.partner ? [deck.partner] : [])]) {
      art.set(c.oracleId, { name: printedNameOf({ name: c.name, printedName: c.printedName ?? null }), imageUri: c.imageUri ?? null });
    }
    return art;
  }, [cards, deck.commander, deck.partner]);
  // What this deck HOLDS, which is what the sheet's proxy control is scoped to.
  // Both commanders count, as they do in the server's own membership test — and
  // the OPTIMISTIC list, so a card just added can be printed without a reload.
  // Named apart from `deckOracleIds` below, which is the committed array the
  // Add panel reads.
  const proxyEligibleIds = useMemo(
    () => new Set([
      ...cards.map((c) => c.oracleId),
      deck.commander.oracleId,
      ...(deck.partner ? [deck.partner.oracleId] : []),
    ]),
    [cards, deck.commander.oracleId, deck.partner],
  );
  const { built } = counts;

  // The ceiling this page measures against, derived once. A pair's commanders
  // take two of the hundred, so its body is 98 and every figure below counts
  // toward that rather than a written-down 99.
  const bodySize = deckBodySize(deck.partner !== null);

  // The draft's changed cards, as the rows ask about them: the move per row.
  // Null outside a draft, which is what makes every mark and every note absent
  // on a deck with nothing pending rather than gated on a second flag.
  //
  // BOTH change lists, not the adds alone. A cut that leaves copies behind — 3
  // Sol Ring down to 1 — is a `removes` entry with `to` above zero, and its row
  // is still on the decklist to be ruled (state 11 is `+1 / −1`). A full removal
  // is filtered out because there is no row left to mark: the card is gone from
  // the draft, and the banner is where it is named.
  //
  // `addChanges` rather than `adds` because that is the list carrying the
  // before/after pair, and it is the same cards in the same order.
  const pendingChange = useMemo(() => {
    if (!draft) return null;
    const moves = new Map<string, { from: number; to: number }>();
    for (const c of draft.addChanges) moves.set(c.oracleId, { from: c.from, to: c.to });
    for (const c of draft.removes) {
      if (c.to > 0) moves.set(c.oracleId, { from: c.from, to: c.to });
    }
    return moves.size > 0 ? { moves } : null;
  }, [draft]);

  // The one deliberate exception. Keyed off the SERVER counts because the
  // commitments roll-up below states a fact about other decks' claims, and a
  // predicted 99th card the server then rejects would zero the soft count for
  // a deck that never reached 99.
  const serverStatus = statusPill({
    built: deck.built,
    // The phase, from the draft this page already reads: `version === null` is
    // the deck that has never committed. An absent draft means this shell knows
    // nothing about versions — its own tests mount it that way — and a deck
    // with no version is the honest default there, since the versions rail is
    // empty too.
    hasVersion: draft ? draft.version !== null : (versions?.length ?? 0) > 0,
    ownedCount: deck.ownedCount,
    // The pill reads coverage, so a deck whose last gaps are printed reads
    // `Complete` on its own page exactly as its tile does on `/decks`. Without
    // this the two surfaces disagree about the same deck.
    coveredCount: deck.coveredCount,
    unresolvedCount: unresolvedCardCount(deck.unresolvedRows),
    // `isShoppingCard` is the client-side twin of `loadDeckBuyRows`, which is
    // what gives the deck list its pill. Both halves of the shopping list count
    // — unowned, and owned but held by an older committed deck — so this pill and
    // the Shopping filter's own count can never disagree.
    unfundedCount: cardCopies(deck.cards.filter(isShoppingCard)),
    bodySize,
  });

  // Deliberately the SERVER list, not the optimistic one. ConsiderPanel and
  // QuickAddBar feed this to each row's `inDeck`, which use-deck-mutation
  // treats as committed truth — and
  // it clears the row's error whenever that value changes, on the reasoning that
  // the server has since settled the question. Wire the optimistic list in here
  // and a failed add flips the value twice (add, then revert), the second flip
  // wiping the refusal before the user can read it. Rows still show their own
  // optimistic "✓ In deck", so nothing is lost by keeping this one committed.
  const deckOracleIds = useMemo(() => deck.cards.map((c) => c.oracleId), [deck.cards]);
  /** What the combo block counts as "in this deck": the 99 AND the commanders (§4.3b rule 3).
   *  Its own function, because this is a prop and nothing downstream can see what went into
   *  it — inline, dropping the commanders left the whole suite green. */
  const comboScope = useMemo(
    // `cards`, NOT `deck.cards`: the shell has already replaced the server snapshot with the
    // optimistic list the visible deck is drawn from, and `proxyEligibleIds` above reads that
    // one for the same reason. On the snapshot, a card just removed stayed `in this deck` and
    // one just added was not classified at all, until the revalidate landed.
    () => comboScopeIds({ cards, commander: deck.commander, partner: deck.partner }),
    [cards, deck.commander, deck.partner],
  );

  // The top-off list's own copy, and deliberately the OPTIMISTIC list. It uses
  // this to name a row that went illegal while the list was open, so a quick-add
  // has to freeze that row in the same frame as the click. The committed set
  // above cannot do that, and the refusal-clearing reasoning behind it does not
  // apply here: the list never treats this as a settled answer to an add.
  const topOffDeckOracleIds = useMemo(
    () => new Set(cards.map((c) => c.oracleId)),
    [cards],
  );

  // The commitments roll-up (#43). Read off the availability `read.ts` already
  // hung on every card, so this costs no query — and off the SERVER list rather
  // than the optimistic one, because a just-added card has no availability yet
  // and the region is meant to be present on arrival rather than to twitch as
  // the player builds.
  //
  // `selfExcluded` is mandatory here: the map came from a query given this
  // deck's own `excludeDeckId`, and reading it without the flag would turn every
  // one of this deck's own claims into a conflict with itself.
  const commitments = useMemo(() => {
    let overCommitted = 0;
    let softClaimed = 0;
    let lone: { name: string; deckCount: number; ownedQty: number } | null = null;
    for (const card of deck.cards) {
      const a = card.availability;
      if (!a) continue;
      const state = availabilityState(a, { selfExcluded: true });
      if (state === "over") {
        overCommitted++;
        // Only when a claiming deck is actually named. Row 12.9's sentence
        // counts committed decks out loud, and with an empty name array it would
        // say "on 0 committed decks" — the same hole `markerAria` guards.
        const named = hardDecks(a);
        lone =
          named.length > 0
            ? { name: card.name, deckCount: named.length, ownedQty: a.owned }
            : null;
      } else if (state === "soft") {
        softClaimed++;
      }
    }
    return {
      overCommitted,
      // Row 12.15, the pre-99 window. This does NOT fall out of the arithmetic:
      // `soft` counts claims by OTHER drafts, so a deck of this
      // player's own reaching 99 leaves those claims standing.
      //
      // Read through `countStatus`, NOT the pill: the window is about the COUNT
      // — a list short of its body size — and since R6 the pill answers the
      // phase first, so a full 99 that has never been committed reads
      // `Draft` and would have held this window open for ever. Same single
      // threshold as before, asked of the half that owns it.
      softClaimed: countStatus({
        built: deck.built,
        ownedCount: deck.ownedCount,
        bodySize,
      }) === "Building" ? softClaimed : 0,
      overCommittedCard: overCommitted === 1 ? lone : null,
    };
  }, [deck.cards, deck.built, deck.ownedCount, bodySize]);

  // The spent slot the undo row is drawn from. Decklist state rather than row
  // state, because the removal unmounts the row: held here it survives a tab
  // switch to Consider and back, and any re-sort. Cleared by exactly three
  // things — Undo accepted, the next removal, or leaving the builder route
  // (this component unmounting). Never by a timer.
  const [spentSlot, setSpentSlot] = useState<DeckDetailCard | null>(null);

  // The swept rows from a clearAutoCards action. Null means no sweep has run
  // (or it has been undone/navigated away). Lives beside spentSlot: it is decklist
  // state, and its lifetime is the current route per PR #204. Never a timer.
  const [sweptRows, setSweptRows] = useState<SweptRow[] | null>(null);
  // The sweep's optimistic removal has to be dispatched inside a transition or
  // React discards it, so the pending flag is the transition's rather than
  // hand-rolled state.
  const [sweepPending, startSweep] = useTransition();
  // Its own transition rather than the sweep's: the two are mutually exclusive
  // on screen, but sharing one would leave the failed control unable to say
  // which write the message belongs to.
  const [keepAllPending, startKeepAll] = useTransition();
  const [autoError, setAutoError] = useState<string | null>(null);

  // Unresolved rows keep the builder out of the empty state: a deck whose every
  // line failed to match has nothing built, but it has plenty to show and act on.
  // A spent slot does the same — emptying the deck by removing its last card
  // must not swap the undo row out for "a king with no army".
  // Swept rows are the same shape at deck scale: sweeping an all-auto deck
  // empties the list, and the empty state would take the sweep receipt — the
  // only route back — down with it.
  const isEmpty =
    built === 0 && unresolvedRows.length === 0 && !spentSlot && !sweptRows?.length;
  const commanderShortName = shortCommanderName(deck.commander.name);

  // An add changes three numbers at once — the tile's button, the tab count and
  // a role cell — and a screen reader sees none of them, because all three are
  // ordinary text elsewhere in the tree. The live region is the only place the
  // add is narrated, so every add path goes through this wrapper rather than
  // calling addOptimisticCard directly. (`announcement` itself is declared above,
  // beside the lock state that also speaks into it.)

  // The mark hides nothing and moves nothing, so it is the one act on this
  // surface a screen reader would otherwise get nothing at all from.
  const handleMarkChange = (passId: string | null) => {
    setMarkedPassId(passId);
    const pass = passId === null ? null : fillPasses.find((p) => p.id === passId);
    setAnnouncement(
      pass
        ? topOffCopy.announce.marked(String(pass.live), fillPassLabel(pass))
        : topOffCopy.announce.markCleared,
    );
  };

  // Composed from the pre-add list plus this card. `useOptimistic` state is not
  // readable synchronously here, and reading it a render later would announce
  // the previous add.
  const announceAdd = useCallback(
    (card: Parameters<typeof addOptimisticCard>[0]) => {
      addOptimisticCard(card);
      const before = cards;
      const nextBuilt = deckCounts(before).built + card.quantity;
      const cell = mix.cells[card.role as MixRole] as
        | RecommendedMix["cells"][MixRole]
        | undefined;
      setAnnouncement(
        cell
          ? addPanelCopy.announce.added(
              card.name,
              nextBuilt,
              cell.label,
              computeRoleCounts(before)[card.role as MixRole] + card.quantity,
              cell.target,
              bodySize,
            )
          : addPanelCopy.announce.addedNoRole(card.name, nextBuilt, bodySize),
      );
    },
    [addOptimisticCard, cards, bodySize],
  );

  // Split in two on purpose. `useDeckMutation` dispatches its optimistic update
  // inside an async transition, and React holds every *ordinary* state update
  // made in one until the action settles — only the `useOptimistic` override
  // paints early. The slot and the announcement would therefore appear only
  // after the server answered, which is the whole window the undo row exists
  // for. So the row calls `markSpent` straight from the click, outside `run`,
  // and leaves only the optimistic dispatch inside it.
  const markSpent = useCallback(
    (card: DeckDetailCard) => {
      // One undo row at a time: this removal settles whatever the last one left.
      setSpentSlot(card.quantity <= 1 ? card : null);
      // A removal is announced only when it leaves an undo row behind. A stack
      // that decrements keeps its row, and its own count is the receipt.
      if (card.quantity > 1) return;
      setAnnouncement(
        addPanelCopy.undo.announceRemoved(
          // The pair of `announceUndone` below, and named the same way: the row
          // that left and the receipt that brings it back are one card.
          printedFaceName(card),
          deckCounts(cards).built - 1,
          bodySize,
        ),
      );
    },
    [cards, bodySize],
  );
  const removeCard = useCallback(
    (card: DeckDetailCard) => removeOptimisticCard(card.oracleId),
    [removeOptimisticCard],
  );

  const announceUndo = useCallback(
    (card: DeckDetailCard) => {
      setAnnouncement(
        addPanelCopy.undo.announceUndone(
          // The name on the receipt the reader just pressed, not the oracle
          // name behind it: the two differ on a renamed printing, and the
          // announcement is the same act described twice.
          printedFaceName(card),
          deckCounts(cards).built + card.quantity,
          bodySize,
        ),
      );
    },
    [cards, bodySize],
  );
  // A failed removal outlives the row that asked for it, so its reason is held
  // here. Cleared when the server answers again: any successful edit replaces
  // deck.cards, which settles the question the refusal was answering.
  const [removeFailure, setRemoveFailure] = useState<string | null>(null);
  const [lastServerCards, setLastServerCards] = useState(deck.cards);
  if (lastServerCards !== deck.cards) {
    setLastServerCards(deck.cards);
    setRemoveFailure(null);
    // The slot settles on the card being genuinely back in the deck, not on the
    // undo's promise resolving. Settling on success would drop the receipt
    // before the new HTML landed, flashing the pre-undo list back for a frame;
    // it would also unmount the row, and a refused undo has to say so from
    // where the row is. A revalidation that still lacks the card — the removal
    // itself — leaves the slot standing.
    if (spentSlot && deck.cards.some((c) => c.oracleId === spentSlot.oracleId)) {
      setSpentSlot(null);
    }
  }
  const reportRemoveFailure = useCallback((cardName: string) => {
    setRemoveFailure(`${cardName}: ${DECK_REMOVE_FALLBACK_MESSAGE}`);
    // The card never left, so there is nothing to undo. Leaving the slot would
    // offer to put back a card the deck still holds.
    setSpentSlot(null);
  }, []);

  // The auto count and kept count, computed from the optimistic card list.
  // `autoCount` is how many untouched auto cards remain (these will be swept).
  // `keptCount` is how many cards have auto=false (kept or player-added).
  // Both sum quantity rather than counting rows: a fill stacks its basics into
  // a single row of roughly 37, so a row count would offer to sweep "1 card".
  const autoCount = cards.filter((c) => c.auto).reduce((n, c) => n + c.quantity, 0);
  const keptCount = cards.filter((c) => !c.auto).reduce((n, c) => n + c.quantity, 0);
  // Locked (L3): a sweep leaves a locked auto card where it is, so Clear counts auto LESS these,
  // while Keep all still counts every auto card. COPIES, like `autoCount`, so the subtraction is
  // like from like (audit T3). Zero with the switch off, where no card reads locked.
  const lockedAutoCards = cards.filter((c) => c.auto && c.locked);
  const lockedAutoCount = lockedAutoCards.reduce((n, c) => n + c.quantity, 0);
  // The receipt's `N locked cards stayed`, fixed at the sweep that left them.
  const [sweptLockedCount, setSweptLockedCount] = useState(0);

  const handleClearAuto = useCallback(() => {
    if (sweepPending) return;
    startSweep(async () => {
      setAutoError(null);
      // One edit, not a loop of removals: the server deletes each auto row
      // whole, while `removeOptimisticCard` takes off a single copy — which
      // would leave 36 of the fill's 37 basics on screen until revalidation.
      //
      // A LOCKED auto card stays (L3): the server's delete skips it, so the prediction keeps it too,
      // or the card vanishes until revalidation and the announced total is short by its copies.
      const keep = new Set(lockedAutoCards.map((c) => c.oracleId));
      sweepOptimisticAuto(keep);
      try {
        const removed = await clearAutoCards(deck.id);
        setSweptRows(removed);
        setSweptLockedCount(lockedAutoCount);
        const remaining = deckCounts(cards.filter((c) => !c.auto || keep.has(c.oracleId))).built;
        const removedCount = removed.reduce((n, r) => n + r.quantity, 0);
        setAnnouncement(
          lockedAutoCount > 0
            ? recommendationsCopy.auto.sweptAnnounceLocked(
                String(removedCount),
                String(lockedAutoCount),
                builtFragment(remaining, bodySize),
              )
            : recommendationsCopy.auto.sweptAnnounce(
                String(removedCount),
                builtFragment(remaining, bodySize),
              ),
        );
      } catch {
        // No explicit rollback: the transition ends here and React drops the
        // predictions with it, putting the rows back from the server list.
        setAutoError(recommendationsCopy.auto.sweepFailed);
      }
    });
  }, [sweepPending, cards, deck.id, sweepOptimisticAuto, bodySize, lockedAutoCards, lockedAutoCount]);

  // No receipt strip and no undo: a keep takes nothing, so there is nothing for
  // a receipt to hold open, and an undo would have to write `auto = true` back
  // across forty rows — the app re-claiming as its own the cards the player has
  // just declared theirs. The receipts are the tags leaving, the controls going
  // absent, the kept note, and one spoken line.
  const handleKeepAllAuto = useCallback(() => {
    if (keepAllPending) return;
    startKeepAll(async () => {
      setAutoError(null);
      keepAllOptimisticAuto();
      try {
        const kept = await keepAllAutoCards(deck.id);
        // `keptCount` is the pre-keep figure, so the deck-wide total is the sum.
        // Both come from the same quantity-summed list the label counts.
        setAnnouncement(
          recommendationsCopy.auto.keptAllAnnounce(String(kept), String(keptCount + kept)),
        );
      } catch {
        setAutoError(recommendationsCopy.auto.keepAllFailed);
      }
    });
  }, [keepAllPending, keptCount, deck.id, keepAllOptimisticAuto]);

  const autoControls = useMemo(
    () => ({ onClear: handleClearAuto, onKeepAll: handleKeepAllAuto }),
    [handleClearAuto, handleKeepAllAuto],
  );

  const handleRestoreAuto = useCallback(async () => {
    if (!sweptRows) return;
    // A refused Undo leaves its message beside a receipt the player can click
    // again; without this the second, successful attempt restores the rows and
    // still reads as a failure.
    setAutoError(null);
    try {
      // The count comes back from the server rather than off the receipt: a
      // card the player re-added by hand between the sweep and the Undo is
      // skipped by the restore, and announcing it would overstate both numbers.
      const restored = await restoreAutoCards(deck.id, sweptRows);
      setAnnouncement(
        recommendationsCopy.auto.sweptRestoredAnnounce(
          String(restored),
          builtFragment(deckCounts(cards).built + restored, bodySize),
        ),
      );
      setSweptRows(null);
    } catch {
      // Keep the receipt so Undo stays reachable — the rows are still gone, so
      // the sweep's "the deck is unchanged" would be the wrong action and false.
      setAutoError(recommendationsCopy.auto.restoreFailed);
    }
  }, [sweptRows, deck.id, cards, bodySize]);

  // Clear sweep state when the server list changes (revalidation settled).
  // The sweep receipt is decklist state: it persists across tab switches but
  // leaves when the player navigates away and the component unmounts.
  //
  // This sets state during render on purpose — React's documented "adjusting
  // state when a prop changes" pattern, not a stray render-phase write. The
  // `!==` guard makes it converge: React restarts the render immediately, the
  // stored value now matches, and the branch does not run again. An effect
  // would be worse here, because it lands a render later and the receipt
  // would flash back on screen offering to undo a sweep already undone.
  const [lastServerCardsForSweep, setLastServerCardsForSweep] = useState(deck.cards);
  if (lastServerCardsForSweep !== deck.cards) {
    setLastServerCardsForSweep(deck.cards);
    // The swept rows being back in the server list means the undo landed, so
    // the receipt has nothing left to offer. A settled sweep leaves them
    // absent, which is what keeps the receipt on screen.
    if (sweptRows && sweptRows.every((r) => deck.cards.some((c) => c.oracleId === r.oracleId))) {
      setSweptRows(null);
    }
  }

  // Not memoised: `removeOptimisticCard` is rebuilt every render and
  // `announceAdd` follows the card list, so a useMemo here would recompute on
  // essentially every pass while reading as though it prevented one.
  const deckEdits = {
    add: announceAdd,
    remove: removeCard,
    markSpent,
    announceUndo,
    reportRemoveFailure,
    resolveRow: resolveOptimisticRow,
    deleteRow: deleteOptimisticRow,
    keep: keepOptimisticCard,
  };

  // A shelf link is a two-step move: switch to Consider, then scroll to the
  // heading. The scroll cannot happen in the click handler, because the shelf
  // is not in the DOM until the view has changed and rendered.
  // A ref rather than state: the target is consumed by the effect that acts on
  // it, and holding it in state would mean a second render whose only job is to
  // clear it — which the react-compiler rule rightly rejects.
  const shelvedRoles = useMemo(() => rolesWithShelves(suggestions), [suggestions]);

  const pendingShelf = useRef<MixRole | null>(null);
  const seeShelf = useCallback(
    (role: MixRole) => {
      if (view === "consider") {
        scrollToShelf(role);
        return;
      }
      pendingShelf.current = role;
      setView("consider");
    },
    [view],
  );
  useEffect(() => {
    if (view !== "consider" || !pendingShelf.current) return;
    scrollToShelf(pendingShelf.current);
    pendingShelf.current = null;
  }, [view]);

  // The banner's `Take a look →`, and the same two-step move as seeShelf above
  // for the same reason — the group is not in the DOM until the view and the
  // filter have both changed and rendered. It has two switches to make rather
  // than one: Consider does not draw the group, and Shopping hides it, because
  // an unresolved line is not something the player can go and buy.
  const pendingUnresolved = useRef(false);
  const seeUnresolved = useCallback(() => {
    if (view === "deck" && filter === "all") {
      scrollToUnresolved();
      return;
    }
    pendingUnresolved.current = true;
    setView("deck");
    setFilter("all");
  }, [view, filter]);
  useEffect(() => {
    if (view !== "deck" || filter !== "all" || !pendingUnresolved.current) return;
    scrollToUnresolved();
    pendingUnresolved.current = false;
  }, [view, filter]);

  const openExport = () => setExportOpen(true);

  return (
    // One card-detail modal for every surface below — spine, decklist, suggestions, search.
    // Every card opened from this page belongs to THIS deck, which is what
    // scopes the sheet's proxy control. A card opened from `/collection` has no
    // deck and draws no control — that provider passes none.
    <CardDetailProvider
      deckId={deck.id}
      deckName={deck.name}
      deckOracleIds={proxyEligibleIds}
      // THE DECK'S OWN CARDS, PLUS ITS COMMANDERS — §4.3b rule 3, which the combo reader's
      // own parameter doc states: a commander counts as held. `deckOracleIds` is
      // `deck.cards` alone, so without them a partner that IS the commander read `you own
      // it` with the scope line naming that very commander directly above it, and a brew
      // holding only its commander misclassified every partner it had.
      //
      // Still a different set from `proxyEligibleIds` above, which answers a different
      // question — passing that one would call a card in-deck because it is proxyable.
      comboDeckOracleIds={comboScope}
    >
      <AddOptimisticCardProvider value={deckEdits}>
        <PassMarkProvider value={passMark}>
        {/* One column at both widths now that the rail is gone. The document is
            the only scrollport at both widths: desktop used to frame the column
            in the viewport (`h-screen` + `overflow-hidden` here, `overflow-y-auto`
            below) so the quick-add bar could sit against the bottom edge, but
            that box's edges cut across empty space whenever the content was
            shorter than the screen. The bar is `sticky`, so it pins to whichever
            scrollport contains it — the document serves that just as well. */}
        <div
          className="flex flex-col min-h-screen"
          style={{ background: "var(--bg)" }}
        >
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </span>

          <div className="flex-1 flex flex-col min-w-0">
            {removeFailure && (
              <div className="px-[14px] md:px-[20px] pt-[10px]">
                <MutationError message={removeFailure} />
              </div>
            )}

            {/* Builder Spine — unchanged by an import. No extra figure, no
                second bar, no "97 + 2": the deck's number is what's built, and
                the exception lives in the prose below it. */}
            <BuilderSpine
              deck={deck}
              counts={{ ...counts, proxiedCount }}
              onExport={openExport}
              // The server status, the same one the tab strip names. Passed
              // rather than recomputed inside the spine, which holds the
              // optimistic counts and would otherwise disagree with the page
              // around it mid-edit.
              status={serverStatus}
              bracket={headerBracket}
              onOpenBracket={() => setView("analysis")}
              notice={headerNoticeTag}
              onOpenNotices={openNoticesSheet}
              // State 2: a list that has never been committed and has reached a
              // full body.
              //
              // The SERVER count, like `serverStatus` above and for a sharper
              // reason: this offer leads to a commit, and `commitVersion`
              // snapshots `deck_cards` as the database holds them. Read off the
              // optimistic list, the link appears the instant the add that fills
              // the last slot is dispatched — and a player who follows it inside
              // that window can cut a v1 missing the card the page just said
              // completed the deck. A version cannot be uncut, so the offer
              // waits for the write it would freeze. Revalidation brings the
              // server figure with it, which is the same click, not a reload.
              //
              // `built`, the matched count, and never `total`: the status
              // contract is explicit that unresolved lines never push a deck to
              // its body size, so a deck at 98 matched plus one unnamed line
              // would cut a v1 of 98 cards under an offer that called the list
              // complete.
              //
              // An exact match, not `>=`: past the body size the deck is `Over`,
              // whose one next action is to cut the excess. An import or a list
              // edit can leave a brew above its commander-specific ceiling, and
              // a `>=` gate would offer to freeze an illegal list as v1.
              //
              // BOTH counts, and the conjunction is the point. The server count
              // alone holds the offer back until an add has landed, but it also
              // keeps it up through a pending removal — and following it there
              // freezes the shortened list the player is looking at. The
              // optimistic count alone has the opposite hole. A commit is
              // offered only where the two agree the deck is whole.
              //
              // The unresolved count is the same test `commitDeckVersion` now
              // applies inside its transaction: an unnamed line is not a
              // `deck_cards` row, so it reaches neither count above, and a v1
              // cut over it would silently drop it.
              offerFirstCommit={
                draft?.version === null &&
                deck.built === bodySize &&
                built === bodySize &&
                unresolvedCount === 0
              }
              {...commitments}
              // No link while the Shopping list is what the player is looking
              // at: it would point at the screen they are already on. Called
              // from Consider, it makes two switches rather than one — like
              // `seeUnresolved` above — because the list is not on screen there.
              onShowShopping={
                view === "deck" && filter === "shopping"
                  ? undefined
                  : () => {
                      setView("deck");
                      changeFilter("shopping");
                    }
              }
            />

            {/* The provenance ledger — one line per pass, oldest first. Leaves
                when the last auto card does (autoCount drives it off the
                optimistic list). Not shown during a first run because the deck
                is still in-flight then.

                Mounted once: `md:contents` inside the ledger flattens each
                line's phone wrappers on desktop, so one DOM serves both
                layouts and there is one set of undo controls in the tab order.

                `autoCount` is the header's figure as well as its condition. Not
                a sum of the lines: a deck predating the ledger has auto cards
                and no passes, and the design forbids a deck-wide total derived
                from passes anyway. */}
            {autoCount > 0 && !firstRun && (
              <ProvenanceLedger
                deckId={deck.id}
                cards={cards}
                total={autoCount}
                passes={fillPasses}
                bodySize={bodySize}
                markedPassId={markedPassId}
                onMarkChange={handleMarkChange}
                onAnnounce={setAnnouncement}
              />
            )}

            {/* Last-31 strip — the door onto the top-off list. Open slots are
                its only condition: it unmounts as a unit at 0 and at nothing
                else. An empty candidate pool is a state the strip renders, not
                a reason to take the door away, which is why there is no gate
                here any more — the old `candidates > 0` gate made STATES 12 and
                13 unreachable by unmounting exactly the case they describe.

                The count is measured against `total`, not `built`: an
                unresolved line is a card the player already chose and we could
                not name, so it holds the slot it arrived on. Measured against
                `built`, an import that came up two lines short offered to
                choose two more cards beside a banner explaining the two lines —
                and taking that offer would put the deck two cards over as soon
                as those lines were resolved.

                Mounted once, with responsive Tailwind classes for every
                width-dependent element — the same shape the ledger now takes. */}
            <LastSlotsStrip
              deckId={deck.id}
              openSlots={bodySize - counts.total}
              bodySize={bodySize}
              candidates={candidates}
              allNegative={candidatesAllNegative}
              deckOracleIds={topOffDeckOracleIds}
              newestAsOf={newestAsOf}
              declaredBracket={declaration.declared}
              noteCounts={deck.noteCounts}
              onAnnounce={setAnnouncement}
              onInflight={setFillInflight}
              onOpenChange={setTopOffOpen}
              onBarHeight={setTopOffBarHeight}
            />


            {/* Fill-failed banner — shown when the fill never landed (State
                15). Offers a retry. A swept deck is filled=true and must not
                see this banner — that is the entire reason the column exists.

                `!firstRun` costs one real case: a player whose only deck is a
                failed fill gets the guided banner instead of the retry. Nothing
                persisted distinguishes "the fill was attempted and failed" from
                "no fill was ever attempted" — both are filled=false with zero
                cards — so the alternative is telling every player who has just
                made their first deck by hand that a fill they never ran broke.
                That player still reaches the fill from the commander page's
                Build button; the second deck onwards sees the banner. Closing
                the gap properly needs a persisted attempt marker.

                An import whose every line went unresolved is also filled=false
                with zero cards, and it is not a failed fill — the player asked
                for a decklist, not a baseline. The unresolved group already
                explains what happened, so the banner would only add a second,
                wrong account of it. */}
            {!firstRun && unresolvedRows.length === 0 && (
              <FillFailedBannerConnected
                deckId={deck.id}
                filled={deck.filled}
                hasCards={cards.length > 0}
              />
            )}

            {/* Arrival chrome. Mutually exclusive by construction: a clean
                import gets the strip, an import that came up short gets the
                banner instead, whose warning would be contradicted by a line
                reading "nothing needs your attention". */}
            {arrivedFromImport && unresolvedRows.length === 0 && (
              /* A length, not `counts.total`: the strip's sentence says
                 "lines", and a Moxfield export writes basics as one line
                 ("35 Forest"), so the quantity sum would claim a 99-card deck
                 arrived on 99 lines when it arrived on nearer 65. Same
                 cards-vs-lines rule `unresolvedCardCount` documents — prose
                 that says lines counts lines.

                 And the SERVER list, not the optimistic one: the sentence is a
                 claim about what the import brought over, which an add the
                 player makes while the strip is still up must not revise. */
              <ArrivalStrip deckId={deck.id} importedLineCount={deck.cards.length} />
            )}

            {/* An update's own strip. Not gated on the unresolved banner the way
                the import's is: an update's sentence is about what moved, which
                unresolved lines do not contradict. */}
            {updateArrival && <UpdateStrip arrival={updateArrival} />}

            {/* Surface 1 (#389). Above the unresolved banner: what it says is
                that this list is not the deck's committed one yet, which every
                count below it is then read against. */}
            {draft && (
              <PendingBanner state={draft} deckId={deck.id} versionCards={versionCards} />
            )}

            {/* Above the coverage strip and the tabs, because what it says is
                that both of them are short by this many lines. Not gated on
                arrival: the lines stay unresolved across visits, and so does
                the explanation of why the counts do not add up. */}
            <UnresolvedBanner count={unresolvedRows.length} onTakeALook={seeUnresolved} />

            {/* Role Counter Strip — shown when deck has cards (mid-build) or always per design.
                IT LEAVES THIS SPINE when Analysis is on, and that move is what PAYS for the tab:
                Round 0 costs the tab at roughly 150px of net vertical above the tabs, all of it
                the strip's. Gated on the same flag as the tab, because an unconditional move
                would take the strip off the deck page wherever the tab is off, with nothing to
                receive it. */}
            {!analysisEnabled && (
              <RoleCounterStrip
                mix={mix}
                cards={cards}
                onSeeShelf={seeShelf}
                rolesWithShelves={shelvedRoles}
                justFilled={deck.filled && autoCount > 0}
                wasCounts={wasCounts}
              />
            )}

            {/* No degraded banner here. The old one ("Synergy data offline")
                fired alongside Consider's own ("EDHREC isn't answering right
                now."), so an outage was announced twice, in two voices, and the
                copy above the tabs was on screen while reading the decklist,
                which EDHREC has nothing to do with. The claim belongs on the
                shelf that makes it. */}
            {/* Guided first-run banner (only when firstRun === true) */}
            {firstRun && <GuidedBanner commanderName={deck.commander.name} />}

            {/* The decklist and Consider as peer tabs. The desktop toolbar rides
                this row; at phone width Consider draws its own toolbar row. */}
            <BuilderTabs
              tabs={builderTabSpecs({
                built,
                suggestionCount: suggestions.length,
                gameCount: games.length,
                versionCount: versions.length,
                analysisEnabled,
              })}
              view={view}
              onViewChange={setView}
            >
              {view === "consider" && suggestions.length > 0 && (
                <ConsiderToolbar
                  sort={sort}
                  onSortChange={setSort}
                  ownedCount={suggestions.filter((s) => s.owned).length}
                  unownedCount={suggestions.filter((s) => !s.owned).length}
                  degraded={degraded}
                />
              )}
            </BuilderTabs>

            {view === "analysis" ? (
              <div id="panel-analysis" role="tabpanel" aria-labelledby="tab-analysis" aria-busy={opening !== "off" || undefined}>
                {/* The readings sit ABOVE the strip, so the verdict arrives on top of the mix
                    rather than replacing it. The strip is counted from the list and is true in
                    every profile state, which is what makes a failed read a delay rather than an
                    outage. */}
                {/* ONE hover preview for the whole tab: the suggestion cards and the overview's
                    card names both borrow it rather than mount a second. */}
                <HoverPreviewProvider>
                <AnalysisPanel
                  state={profile.state}
                  opening={opening}
                  locked={lockedIds}
                  onRequest={requestAnalysis}
                  pressNote={{ analyze: analyzeNote?.text ?? null, reanalyze: reanalyzeNote?.text ?? null }}
                  pressSee={analyzeNote?.see ? { label: deckNoticesCopy.check.seeWhich, onPress: openNoticesSheet } : null}
                  legality={{ built, size: bodySize }}
                  declaration={{
                    declared: declaration.declared,
                    // `for version n` only when the answer on screen IS what version n recorded.
                    // A deck that is version n but was answered since carries that answer on its
                    // draft until the next commit copies it — naming version n would claim a
                    // record the version does not hold.
                    version:
                      thisVersion && (thisVersion.declaredBracket ?? null) === declaration.declared
                        ? thisVersion.number
                        : null,
                    // §E reads THIS version against the one before it, and only a committed deck
                    // with nothing changed since IS a version. `permits` is null on a version
                    // committed before the snapshot columns existed, which the rule reads as
                    // "recorded nothing" rather than as a reading.
                    previous: previousVersion
                      ? {
                          number: previousVersion.number,
                          permits: previousVersion.permits ?? null,
                          declared: previousVersion.declaredBracket ?? null,
                        }
                      : null,
                    onDeclare: declaration.declare,
                    refused: declaration.refused,
                  }}
                  art={findingArt}
                  overview={
                    synopsis.view.kind === "ready" ? (
                      <SynopsisOverview
                        state={synopsis.view.state}
                        busy={synopsis.view.busy}
                        deckName={deck.name}
                        art={findingArt}
                        readingFresh={readingFresh}
                        settled={synopsis.view.current}
                        onWrite={synopsis.write}
                        onRetry={synopsis.retry}
                        onSeeWhich={openNoticesSheet}
                        deeperLooks={deeperLooks}
                        reanalyze={{
                          onPress: requestAnalysis,
                          disabled: profile.state.kind === "loading" || built !== bodySize,
                          note: built !== bodySize ? null : reanalyzeNote?.text ?? null,
                        }}
                      />
                    ) : null
                  }
                  tuning={(permits) => (
                    <TuningPanel
                      deckId={deck.id}
                      permits={permits}
                      deeperLooks={deeperLooks}
                      facts={{
                        gameCount: gameSummary.count,
                        noteCount: games.filter((g) => g.note !== null).length,
                        fix: gameSummary.fix[0] ? { key: gameSummary.fix[0].key, hurt: gameSummary.fix[0].hurt } : null,
                        marked: gameSummary.marked,
                        cards: built,
                        intent: deck.intent,
                      }}
                      onLogGame={() => setView("games")}
                    />
                  )}
                >
                {/* The strip in its new home. It is REAL analysis content rather than a
                    placeholder — Round 0 moves it here on purpose — which is why this panel
                    draws something true on the day the tab lands, with the verdict arriving
                    on top of it rather than replacing it. */}
                <RoleCounterStrip
                  mix={mix}
                  cards={cards}
                  onSeeShelf={seeShelf}
                  rolesWithShelves={shelvedRoles}
                  justFilled={deck.filled && autoCount > 0}
                  wasCounts={wasCounts}
                  inset
                />
                </AnalysisPanel>
                </HoverPreviewProvider>
              </div>
            ) : view === "games" ? (
              <div id="panel-games" role="tabpanel" aria-labelledby="tab-games">
                <GamesPanel
                  deckId={deck.id}
                  games={games}
                  summary={gameSummary}
                  // Suggested changes lives on the Analysis tab over a reading, and the header's
                  // chip is the stored reading's own signal.
                  tuned={headerBracket !== null}
                  onOpenAnalysis={() => setView("analysis")}
                />
              </div>
            ) : view === "versions" ? (
              <div id="panel-versions" role="tabpanel" aria-labelledby="tab-versions">
                <VersionRail deckId={deck.id} versions={versions} />
              </div>
            ) : view === "consider" ? (
              <ConsiderPanel
              mix={mix}
                deckId={deck.id}
                declaredBracket={declaration.declared}
                noteCounts={deck.noteCounts}
                suggestions={suggestions}
                deckCards={cards}
                deckOracleIds={deckOracleIds}
                commanderOracleId={deck.commander.oracleId}
                commanderShortName={commanderShortName}
                degraded={degraded}
                sort={sort}
                onSortChange={setSort}
                newestAsOf={newestAsOf}
                provenance={provenance}
              />
            ) : (
            <div id="panel-deck" role="tabpanel" aria-labelledby="tab-deck">
            {isEmpty ? (
              /* §Empty Builder Mark + empty state (§Empty Builder Mark section).
                 Branches on deck.filled: a deck reached by deletion congratulates
                 the sweep; one that was never built welcomes the player. */
              <section className="flex flex-col items-center justify-center text-center px-[16px] py-[40px] md:py-[60px] bg-[radial-gradient(400px_220px_at_50%_80%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)]">
                {/* §Mark container (mobile). Each breakpoint keeps its own
                    card-mark geometry; the quiet crown sits below both. */}
                <div className="md:hidden mb-[20px] flex items-end justify-center gap-[16px]">
                  <div
                    className="relative flex-none"
                    style={{ width: 96, height: 104 }}
                    aria-hidden
                  >
                    {/* Back card: tilted left */}
                    <div
                      className="absolute rounded-[8px]"
                      style={{
                        left: "50%",
                        top: "50%",
                        width: 48,
                        height: 68,
                        background: "var(--surface-raised)",
                        border: "1.5px solid var(--border-strong)",
                        transform: "translate(-50%, -50%) rotate(-15deg) translateX(-18px)",
                      }}
                    />
                    {/* Middle card: upright */}
                    <div
                      className="absolute rounded-[8px]"
                      style={{
                        left: "50%",
                        top: "50%",
                        width: 48,
                        height: 68,
                        background: "var(--elevated)",
                        border: "1.5px solid var(--border-dashed)",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    {/* Front card: tilted right, accent-outlined, "99" */}
                    <div
                      className="absolute rounded-[8px] flex items-center justify-center"
                      style={{
                        left: "50%",
                        top: "50%",
                        width: 48,
                        height: 68,
                        background: "color-mix(in srgb, var(--accent) 24%, var(--bg))",
                        border: "1.5px solid var(--accent)",
                        transform: "translate(-50%, -50%) rotate(15deg) translateX(18px)",
                      }}
                    >
                      {/* §Front card — "99" numeral */}
                      <span
                        className="font-display font-extrabold text-[18px]"
                        style={{ color: "var(--accent)" }}
                      >
                        99
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop mark: §Mark container desktop 100-110 × 110-120; constrain to 104×112 */}
                <div className="hidden md:flex mb-[22px] items-end justify-center gap-[16px]">
                  <div
                    className="overflow-hidden flex-none"
                    style={{ width: 104, height: 112 }}
                    aria-hidden
                  >
                    {/* scale(104/120 ≈ 0.867) shrinks the 120×130 CardFan into the 104×112 target */}
                    <CardFan
                      variant="decks-desktop"
                      className="origin-top-left scale-[0.867]"
                    />
                  </div>
                </div>

                <Crown tone="quiet" className="mb-[14px]" />

                {deck.filled ? (
                  /* §Swept-empty branch: deck was filled then cleared by sweep */
                  <>
                    {/* §Swept-empty heading */}
                    <h2
                      className="font-display font-bold text-[21px] md:text-[24px] m-0"
                      style={{ color: "var(--fg)" }}
                    >
                      {recommendationsCopy.sweptEmpty.heading}
                    </h2>

                    {/* §Swept-empty body */}
                    <p
                      className="text-[13.5px] leading-[1.6] mt-[10px] md:text-[14px] md:leading-[1.65] md:mt-[12px] md:max-w-[440px]"
                      style={{ color: "var(--fg-body)" }}
                    >
                      {recommendationsCopy.sweptEmpty.body(commanderShortName)}
                    </p>

                    {/* §Swept-empty CTA — links into Consider */}
                    <button
                      type="button"
                      onClick={() => setView("consider")}
                      className="font-mono text-[11px] mt-[20px] cursor-pointer text-accent hover:text-accent-hover active:text-accent-mid"
                    >
                      {recommendationsCopy.sweptEmpty.cta}
                    </button>
                  </>
                ) : (
                  /* §First-run empty branch: deck was never filled */
                  <>
                    {/* §Empty state heading */}
                    <h2
                      className="font-display font-bold text-[21px] md:text-[24px] m-0"
                      style={{ color: "var(--fg)" }}
                    >
                      {addPanelCopy.builderEmpty.heading}
                    </h2>

                    {/* §Empty state body. One string at both widths now that both
                        point at the same two entrances. */}
                    <p
                      className="text-[13.5px] leading-[1.6] mt-[10px] md:text-[14px] md:leading-[1.65] md:mt-[12px] md:max-w-[440px]"
                      style={{ color: "var(--fg-body)" }}
                    >
                      {addPanelCopy.builderEmpty.caption(commanderShortName)}
                    </p>

                    {/* §Empty state role hint, now at both widths — mobile spent
                        that vertical budget on the deleted CTA. */}
                    <p
                      className="font-mono text-[11px] mt-[20px]"
                      style={{ color: "var(--fg-faint)" }}
                    >
                      {addPanelCopy.builderEmpty.roleHint}
                    </p>
                  </>
                )}
              </section>
            ) : (
              /* Task 8: Decklist body */
              /* The provider wraps the list from out here rather than from
                 inside it: `Decklist` returns three different trees, and mounted
                 within it the provider would have to be repeated in each. */
              <PendingChangeProvider value={pendingChange}>
              <LockCardsProvider value={lockCards}>
              <Decklist
              mix={mix}
                deckId={deck.id}
                cards={cards}
                unresolvedRows={unresolvedRows}
                commanderOracleId={deck.commander.oracleId}
                deckOracleIds={deckOracleIds}
                built={built}
                bodySize={bodySize}
                spentSlot={spentSlot}
                filled={deck.filled}
                filter={filter}
                grouping={grouping}
                onFilterChange={changeFilter}
                onGroupingChange={setGrouping}
                onUnresolvedExpandedChange={setUnresolvedExpanded}
                autoCount={autoCount}
                keptCount={keptCount}
                sweepPending={sweepPending || fillInflight}
                keepAllPending={keepAllPending || fillInflight}
                sweptRows={sweptRows}
                autoError={autoError}
                autoControls={autoControls}
                onRestoreAuto={handleRestoreAuto}
                shoppingFigures={shoppingFigures}
                newestAsOf={newestAsOf}
                provenance={provenance}
                pendingChanges={pendingChange?.moves}
                pendingVersion={draft?.version?.number ?? null}
                // The page's one live region, shared with every other write on
                // this surface. A reorder announces "Sorted by Name · Z–A." —
                // the only thing that says the list moved, since nothing scrolls
                // and no row changes.
                onAnnounce={setAnnouncement}
                lockMode={lockMode && filter === "all"}
                onLockModeChange={neverCut ? setLockMode : undefined}
                lockedAutoCount={lockedAutoCount}
                sweptLockedCount={sweptLockedCount}
              />
              </LockCardsProvider>
              </PendingChangeProvider>
            )}
            </div>
            )}

            {/* Quick add is chrome, not a mode: pinned under both views at both
                widths, and it takes the slot the mobile "+ Add cards" footer
                used to hold. `mt-auto` keeps it at the foot of a short column
                rather than floating under a two-line empty state. */}
            {/* One tab-bar height up at phone width, not `bottom-0`: the shell's
                tab bar is `fixed`, and the bottom padding `main` carries to
                reserve it does nothing to a sticky element, which pins to the
                scrollport edge and so sat underneath it. The offset reads
                --tabbar-h rather than the 80px it used to guess, which was 19px
                taller than the bar and left that band of the scrolling list
                showing between the two. */}
            {/* `z-20`: without it this bar is a positioned element at `z-auto`,
                which loses to the `z-10` availability dots on the suggestion
                tiles scrolling underneath — they drew on top of the search
                field. Below the tab bar's `z-40`, which owns the bottom edge. */}
            {/* The phone drops the bar entirely while a resolution expander is
                open: two comboboxes on one narrow screen means the keyboard
                covers one of them and `↵` is ambiguous. Desktop has room for
                both, so it keeps the bar. */}
            {(isDesktop || !unresolvedExpanded) && (
              <div
                data-testid="quick-add-dock"
                className={[
                  "sticky bottom-[var(--tabbar-h)] md:bottom-0 z-20 mt-auto px-[16px] pt-[10px] pb-[12px] md:px-[30px] md:py-[11px]",
                  // The top-off commit bar takes this slot at phone widths. Hidden
                  // rather than unmounted, so the query survives the list closing.
                  topOffOpen ? "max-md:hidden" : "",
                ].join(" ")}
                style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}
              >
                <QuickAddBar
                  deckId={deck.id}
                  commanderIdentity={commanderIdentity}
                  deckOracleIds={deckOracleIds}
                  commanderShortName={commanderShortName}
                  commanderOracleId={deck.commander.oracleId}
                  declaredBracket={declaration.declared}
                  noteCounts={deck.noteCounts}
                />
              </div>
            )}

            {/* Stands in for the dock the open top-off list hides, in the same
                slot and at the same measured height, so the last rows of the
                decklist can still be scrolled clear of the bar. Desktop never
                needs it: there the commit row is an ordinary element at the foot
                of the list and nothing is pinned. */}
            {topOffBarHeight > 0 && (
              <div
                aria-hidden
                data-testid="top-off-bar-reserve"
                className="md:hidden"
                style={{ height: topOffBarHeight }}
              />
            )}
          </div>

          {/* Export dialog — Task 10 */}
          {noticesShown && (
            <NoticesBody
              notices={noticesShown}
              deckName={deck.name}
              commanders={{
                names: [deck.commander.name, ...(deck.partner ? [deck.partner.name] : [])],
                identity: deckIdentity(deck.commander.colorIdentity, deck.partner?.colorIdentity ?? null),
              }}
              foot={
                !noticesShown.analyzedAt
                  ? { kind: "none" }
                  : noticesShown.readingStale
                    ? { kind: "toTab", onPress: () => { closeNoticesSheet(); setView("analysis"); } }
                    : {
                        kind: "reanalyze",
                        busy: footBusy,
                        failed: footFailed ? deckNoticesCopy.sheet.foot.failed : null,
                        note: noticesShown.violationCount > 0 ? deckNoticesCopy.check.note : null,
                        onPress: reanalyzeFromNotices,
                      }
              }
              onClose={closeNoticesSheet}
            />
          )}
          {exportOpen && (
            <ExportDialog
              deckName={deck.name}
              commanderName={deck.commander.name}
              partnerName={deck.partner?.name ?? null}
              decklistCards={cards.map((c) => ({
                // The whole printed string, not the front face: an export is
                // read by another deckbuilder, which wants the full name and
                // has no width to run out of. Naming the printing while still
                // exporting the oracle name would emit a line whose set and
                // number describe a card face that reads something else.
                name: printedNameOf(c),
                quantity: c.quantity,
                setCode: c.printedSetCode ?? undefined,
                collectorNumber: c.printedCollectorNumber ?? undefined,
              }))}
              // The Shopping filter's own predicate, not a second `!owned` list.
              // The two diverged: this one carried the unowned basics the filter
              // refuses to show and dropped the spoken-for cards it puts front
              // and centre, so the buy link under it bought a basket the player
              // never saw.
              shoppingCards={cards
                .filter(isShoppingCard)
                .map((c) => ({
                  name: c.name,
                  role: c.role,
                  quantity: c.quantity,
                  owned: c.owned,
                }))}
              open={exportOpen}
              onClose={() => setExportOpen(false)}
            />
          )}
        </div>
        </PassMarkProvider>
      </AddOptimisticCardProvider>
    </CardDetailProvider>
  );
}

// Re-export types so Task 9+ can import from this module without circular deps.
export type { BuilderShellProps };
