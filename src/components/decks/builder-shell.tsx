// Builder Shell — top-level client composition for /decks/[id].
// Owns: deck|consider view, group toggle, All|Shopping filter, Consider sort, export open.
// Discovery is a peer view of the decklist rather than a rail or a sheet, so the
// coverage strip stays above both and the quick-add bar is pinned under both.
"use client";

import { useStoredView } from "../ui/use-stored-view";
import { DECK_GROUPING_KEY, isDeckGrouping } from "../../lib/copy/deck-sort";
import { SHOW_DECK_TOKENS } from "./deck-tokens-landing";
import type { DeckStatsInput } from "../../lib/decks/stats";
import { printedFaceName } from "../../lib/collection/browse";
import { useState, useMemo, useCallback, useContext, useEffect, useRef, useTransition } from "react";
import { printedNameOf } from "../../lib/collection/browse";
import { deckBodySize } from "../../lib/decks/deck-size";
import type { DeckDetail } from "../../lib/decks/read";
import { countStatus, statusPill } from "../../lib/decks/status";
import { availabilityState, hardDecks } from "../../lib/decks/availability";
import { commanderShoppingRows, isShoppingCard } from "../../lib/decks/shopping";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { BuilderSpine } from "./builder-spine";
import type { DeckShelf } from "./deck-shelf-move";
import type { FriendDeckPrefs } from "../../lib/social/deck-visibility-rule";
import { AnalysisPanel } from "./analysis-panel";
import { HoverPreviewProvider } from "./hover-preview";
import { CutsPanelView } from "./cuts-panel";
import { ManaBalancePanel } from "./mana-balance-panel";
import { hasColoredPip } from "../../lib/tuning/mana-view";
import { TuningPanel, type TuningV2 } from "./tuning-panel";
import { strategyName } from "../../lib/copy/strategy-focus";
import { localDay } from "../../lib/copy/credits";
import { plainText } from "../../lib/decks/notes-body";
import { hasOverviewContent } from "../../lib/tuning/v2/intake";
import { TuningHub, type HubRequest } from "./tuning-hub";
import { pressNote } from "./synopsis-note";
import { SynopsisOverview } from "./synopsis-overview";
import { OVERVIEW_HOLD_MS, useDeckSynopsis } from "./synopsis-state";
import { shownReading, useDeckProfile } from "./use-deck-profile";
import { deckAnalyzed, holdsOpening, isOpening, useOpenOnce, useOpeningGate } from "./use-opening-gate";
import { useHeaderBracket } from "./use-header-bracket";
import { chipAnswer } from "../../lib/bracket/chip-answer";
import type { Bracket } from "../../lib/bracket/types";
import { useDeclaration } from "./use-declaration";
import { useStrategyFocus } from "./use-strategy-focus";
import { StrategyBlock } from "./strategy-block";
import type { StrategyRead } from "@/lib/strategy/load";
import { RoleCounterStrip } from "./role-counter-strip";
import { ArrivalStrip, PreconArrivalBand } from "./arrival-strip";
import { receiptDrawn, useVisitReceipts } from "./use-visit-receipts";
import type { PreconAddReceipt } from "../../lib/precons/add-receipt-read";
import type { ImportAddReceipt } from "../../lib/decks/import-add-receipt";
import type { PreconArrival } from "../../lib/precons/arrival-read";
import type { PreconMatch } from "../../lib/precons/link";
import type { DeckOrigin } from "../../lib/precons/origin";
import { PreconSuggestion } from "./precons/precon-suggestion";
import { LinkPreconRow } from "./precons/precon-link-dialogs";
import { UpdateStrip } from "./update-strip";
import type { ArrivalPrintings, UpdateArrivalState } from "../../lib/decks/arrival";
import { FillFailedRow, OverRow, PendingRow, SpokenForTwiceRow, TodoCard, UnresolvedRow } from "./todo-card";
import { deckTodo } from "../../lib/decks/todo";
import { CardFan } from "../marks";
import { Crown } from "../ui/crown";
import { addPanelCopy, builtFragment, shortCommanderName } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import {
  clearAutoCards,
  keepAllAutoCards,
  restoreAutoCards,
  setBasicQuantity,
  type SweptRow,
} from "../../app/decks/actions";
import { saveDeckDescription } from "../../app/decks/tuning-actions";
import { Decklist } from "./decklist";
import { TokensGroup } from "./tokens-group";
import { BuilderTabs, type BuilderView } from "./builder-tabs";
import { builderTabSpecs } from "../../lib/decks/builder-tab-specs";
import { initialBuilderView, type DeckBody } from "../../lib/decks/builder-view";
import { DeckPanelContext } from "./deck-panel";
import { deckViewOf, usePublishBuilderScreen } from "./builder-screen";
import { EmptyDeckNotes } from "./notes/empty-deck-notes";
import type { DeckPanel } from "./group-toggle";
import type { DeckNotesView } from "../../lib/decks/notes-types";
import { ConsiderPanel, rolesWithShelves } from "./consider-panel";
import { useHeldPrefill } from "./held-prefill";
import { GamesPanel } from "./games-panel";
import type { DeckOpponentsWire } from "../../lib/decks/deck-opponents-read";
import type { TablePrefill } from "../../lib/social/rule-zero-log";
// Types only: `games.ts` reaches for the database, and a value import from a
// "use client" module would drag drizzle into the browser bundle.
import type { DeckGame, GameSummary } from "../../lib/decks/games";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";
import { QuickAddBar } from "./quick-add-bar";
import { ExportDialog } from "./export-dialog";
import { deckExportData } from "../../lib/decks/export-data";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { DeckSiblingsProvider } from "./deck-siblings";
import { comboScopeIds } from "../../lib/decks/combo-scope";
import { AddOptimisticCardProvider, useOptimisticDeckCards } from "./optimistic-deck";
import { BasicCountsProvider, createBasicCounts, type BasicCounts } from "./basic-counts";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { DeckRefusalToast } from "./token-refusal-toast";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { ProvenanceLedger } from "./provenance-line";
import { PassSheet, type PassSheetTarget } from "./pass-sheet";
import { CombosCloseSheet } from "./combos-close-sheet";
import { useDeckTitleFocusOnClose } from "./deck-title-focus";
import type { NearCombos } from "../../lib/combos/near-combos";
// Type only, for the same reason `games.ts` is imported as one: the module
// reaches for the database.
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { LastSlotsStrip } from "./last-slots-strip";
import { VersionRail } from "./version-history";
// Type only: `versions.ts` reaches `src/db`, which throws at module init in a
// browser. See `src/lib/client-bundle-safety.test.ts`.
import type { VersionSummary } from "../../lib/decks/versions";
import { PendingChangeProvider } from "./pending-change";
import { LockCardsProvider, useCardLocks } from "./lock-cards";
// `draft-shape`, not `draft-state`: the latter holds the reads and imports `db`.
import { hasChanges, type DraftState } from "../../lib/decks/draft-shape";
import { cardCopies, deckCounts, unresolvedCardCount, type CardTypeGroup, type DeckDetailCard } from "../../lib/decks/grouping";
import { ROLE_ORDER, type MixRole, type RecommendedMix } from "../../lib/decks/mix";
import type { JobRowsByCard } from "../../lib/decks/job-tally";
import { roleCounterFor, roleNamedFor } from "../../lib/decks/label-role-counts";
import { LabelRowsProvider } from "./label-rows-context";
import { useIsDesktop } from "../ui/use-is-desktop";
import type { ProvenanceForm } from "../../lib/decks/price";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
import { proxiedCardCount } from "../../lib/decks/proxy-count";
import { NoticesBody } from "./notices-body";
import { headerNotice } from "./notice-tag";
import { deckNoticesCopy } from "../../lib/copy/notices";
import { deckIdentity } from "../../lib/decks/format";
import { openNotices, peekNotices } from "../../lib/notices/actions";
import { NOTICES_PARAM } from "../../lib/notices/arrival";
import type { DeckNotices } from "../../lib/notices/read";
import { mirrorUrl } from "../../lib/url/mirror";
import { reveal } from "../../lib/ui/reveal";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
import { useToolLanding } from "../discovery/use-tool-landing";
import { TOOL_PARAM, toolLanding, type ToolId, type ToolLanding } from "../../lib/discovery/tools";
import { useMergedRef } from "../ui/use-merged-ref";
import type { PrintedInSet } from "../../lib/sets/printed-in";

// Shared by both shelf paths — the one that is already on Consider and the one
// that has to switch views first — so they land identically.
// Focus moves as well as the scroll: activating a coverage cell is a jump, and
// a keyboard user whose focus stayed behind on the strip would have to tab the
// whole way down to reach what they just asked for. The heading carries
// tabIndex={-1} for exactly this.
function scrollToShelf(role: MixRole) {
  const heading = document.getElementById(`shelf-${role}`);
  if (!heading) return;
  reveal(heading, "start");
  heading.focus({ preventScroll: true });
}

// The unresolved group renders only in the deck view under the All filter, so
// both paths into it — already there, or having just been sent there — land on
// the same call.
function scrollToUnresolved() {
  reveal(document.getElementById("unresolved-group"), "start");
}

/** Immutable omit of one key, for the per-card receipt maps (H29): returns the
 *  same object when the key is already absent, so a `setState` call built on
 *  this never schedules a render that changes nothing. */
function dropKey<T>(map: Record<string, T>, key: string): Record<string, T> {
  if (!(key in map)) return map;
  const next = { ...map };
  delete next[key];
  return next;
}

interface BuilderShellProps {
  /** What this deck is compared to, resolved once per request by the route. A PROP rather than
   *  an import: the targets are per-commander now, and a component reaching for a module
   *  constant would draw one deck's recommendation on every deck. */
  mix: RecommendedMix;
  deck: DeckDetail;
  /** The deck's shelf and the reader's shelves, for the header menu's Move. The route always reads
   *  it; the shell's tests, which draw no menu, leave it out. */
  shelf?: DeckShelf;
  /** Hidden from friends (`FRIEND_DECKS_ENABLED` for the reader): the header menu's row and mark. Absent while off. */
  friendHide?: { hidden: boolean; prefs: FriendDeckPrefs };
  /** "Kept for this deck"'s Set picker (H35, PR 2) — every set that printed a commander. */
  printedInSets?: readonly PrintedInSet[];
  suggestions: DeckSuggestionWithFacts[];
  degraded: boolean;
  firstRun: boolean;
  commanderIdentity: string[];
  /** True only on the navigation the import itself made — see src/lib/decks/arrival.ts. */
  arrivedFromImport: boolean;
  /** The precon a deck was started from, on the one navigation the start made; else null. */
  preconArrival?: PreconArrival | null;
  /** The receipt of the collection add this precon start made, read from the ledger; null when there was none. */
  preconAddReceipt?: PreconAddReceipt | null;
  /** The ticked import's collection add (no-collection entry S10), read from the ledger; null when there was none. */
  importAddReceipt?: ImportAddReceipt | null;
  /** The import's printing counts for the strip's clauses (deck printings), or null. */
  arrivalPrintings?: ArrivalPrintings | null;
  /** An UNLINKED deck's precon link doors (precons R3): the shared rule's suggestions (K1, K15) and
   *  the Versions foot row's picker (K5, K6). Null for a linked deck, or with precons off. */
  preconLink?: { suggestions: PreconMatch[]; picker: PreconMatch[] } | null;
  /** A linked deck's v0 (precons PR 6b): drawn last in Versions, never current. Its presence also
   *  draws the Versions tab on a linked brew (K14); the deck stays a brew. Null when unlinked or off. */
  preconOrigin?: DeckOrigin | null;
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
  /** The seats of each game and the matchups (Social R3), or null with the switch off or no opponents read. */
  gameOpponents?: DeckOpponentsWire | null;
  /** What this deck's draft has changed since its newest version (#389). Read on
      every visit, so it is always present in the app — optional only so the
      shell's own tests can leave it out. Its absence draws no banner and no row
      marks, which is the right rendering for a surface that knows nothing. */
  draft?: DraftState | null;
  /** The role counts the newest version held, for the mix cells' `was n` line.
      Derived by the route from the same `computeRoleCounts` the strip uses. */
  wasCounts?: Record<MixRole, number>;
  /** The deck's label rows when the page counts roles by label (`LABEL_ROLE_COUNTS_ENABLED`): the
   *  strip, the Changed strip, the Consider shelves and the toast below all count through them. Absent
   *  or null counts by `card.role`, exactly as before. */
  labelRows?: JobRowsByCard | null;
  /** The ids that read covered. The map is sparse, so this is what tells an unlabeled card from a
   *  search result the page never asked about. */
  labelQueried?: readonly string[] | null;
  /** Every version this deck has committed, newest first. Empty on a brew, which
      draws no `Versions` tab at all — a tab explaining that a deck has no
      history is a tab advertising its own emptiness (§Decisions 4) — unless it is
      linked to a precon, whose v0 is history (`preconOrigin`, K14). */
  versions?: VersionSummary[];
  /** The tab this visit lands on, read off the URL by the route. Only the
      arrival: switching tabs stays component state, so nothing writes it back. */
  initialView?: BuilderView;
  /** The body Your deck opens on (`?panel=`, the ?'s way back): applied only when the builder opens on the deck tab. */
  initialBody?: DeckBody | null;
  /** `ANALYSIS_TAB_ENABLED` — whether this deployment draws the Analysis tab. Off is
   *  today's layout, exactly. */
  analysisEnabled?: boolean;
  /** `DECK_STATS_ENABLED`, read on the server. Off: the list control draws no Stats segment. */
  statsEnabled?: boolean;
  /** `DECK_NOTES_ENABLED`, read on the server. Off: the list control draws no Notes segment. */
  notesEnabled?: boolean;
  notesData?: DeckNotesView | null;
  /** What the Stats panel needs beyond the card list: the commander row(s), which count toward the
   *  curve. The figures themselves are derived on the client from the optimistic list. Null when off. */
  statsData?: DeckStatsInput | null;
  /** `NOTICES_ENABLED` (`src/lib/notices/flag.ts`): whether the header draws the notice tag and the
   *  Notices sheet can open. Off, nothing of the notices is read or drawn. */
  noticesEnabled?: boolean;
  /** The deck's notices as the page's loader read them, so the header's tag paints WITH the header
   *  rather than popping in after a client read. Null when off, unread, or the read failed. */
  initialNotices?: DeckNotices | null;
  /** The URL asked for the Notices sheet (`?notices=1`, the /decks tile's `!`): it opens on arrival
   *  and the parameter is stripped. */
  openNoticesOnArrival?: boolean;
  /** The stored analysis's permitted range, for the header's bracket chip; null when unread. */
  storedPermits?: Bracket[] | null;
  /** The stored analysis could not be read, so `storedPermits`' null says nothing about whether
   *  the deck was ever analyzed: the tab's opening then holds as it does for an analyzed deck. */
  storedPermitsUnknown?: boolean;
  /** `NEVER_CUT_ENABLED` (`src/lib/decks/never-cut-flag.ts`): whether the rows draw the lock and
   *  the toolbar offers Lock cards. Off, nothing of the lock is drawn or pressable. */
  neverCut?: boolean;
  /** `tuningEnabled(env)` (`src/lib/tuning/flag.ts`): whether this deployment draws "Suggested
   *  changes". Off, the Analysis tab still draws the bracket and the Overview — the tab mounts
   *  no `TuningPanel`, the empty state's description field (asked only to feed a run) and the
   *  credit lines' mention of it are withheld, same as `analysisEnabled` withholds the whole tab. */
  tuningEnabled?: boolean;
  /** `loadDeckStrategy` for this reader: the strategy block on Analysis. Null with `STRATEGY_FOCUS_ENABLED` off. */
  strategy?: StrategyRead | null;
  /** `socialGamesEnabled(env)` for this reader: the game log draws its "Across the table" row. */
  socialGames?: boolean;
  /** A Rule 0 table's seats for the game log to open with (plan §PR 8), read per request by the page. */
  gamePrefill?: TablePrefill | null;
  /** `proposedCutsEnabled(env)`: whether the Analysis tab draws Proposed cuts after Suggested changes. */
  proposedCutsEnabled?: boolean;
  /** `manaBalanceEnabled(env)`: whether the Analysis tab offers Mana Balance (a hub tile, or mounted
   *  directly when it is the only tool on). */
  manaBalanceEnabled?: boolean;
  /** `tuningHubEnabled(env)`: whether the Analysis tab draws the Tuning hub, mounting Suggested changes
   *  and Proposed cuts inside its tiles, and the trim line offers `Proposed cuts →`. Off, both
   *  tools mount directly, exactly as before the hub. */
  tuningHubEnabled?: boolean;
  /** `suggestedChangesV2Enabled(env)` for this reader (plan 2026-10-27, P5): Suggested changes draws the v2 intake and
   *  press, and its hub tile goes inert off 99 with a link to the tool that brings the deck back. Off, the panel and the
   *  hub are as shipped. */
  suggestedChangesV2?: boolean;
  /** Try it's `?tool=` (discovery R2, E11), decided by the page from this reader's switches: the deck tool to land
   *  on. The page opens its tab; the shell opens its view and lands on its target. Null strips the parameter. */
  landing?: Pick<ToolLanding, "tool" | "target" | "moment" | "lands"> | null;
  /** A token that moves on each render carrying `?tool=`, so a landing on the mounted shell runs again. */
  landingRequest?: string | null;
  /** `loadNearCombos` (two pieces): the combos this deck is one piece away from, for the status line's
   *  segment and its list (combos close). Null when the read failed or never ran: no segment. Empty
   *  while `NEAR_COMBOS_ENABLED` is off. */
  nearCombos?: NearCombos | null;
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
  shelf,
  friendHide,
  printedInSets = [],
  suggestions,
  degraded,
  firstRun,
  commanderIdentity,
  arrivedFromImport,
  preconArrival = null,
  preconAddReceipt = null,
  importAddReceipt = null,
  arrivalPrintings = null,
  preconLink = null,
  preconOrigin = null,
  updateArrival = null,
  shoppingFigures = {},
  newestAsOf,
  provenance = null,
  candidates = [],
  candidatesAllNegative = false,
  fillPasses = [],
  games = [],
  gameSummary = NO_GAMES,
  gameOpponents = null,
  draft = null,
  wasCounts,
  labelRows = null,
  labelQueried = null,
  versions = [],
  initialView = "deck",
  initialBody = null,
  analysisEnabled = false,
  statsEnabled = false,
  notesEnabled = false,
  notesData = null,
  statsData = null,
  noticesEnabled = false,
  initialNotices = null,
  openNoticesOnArrival = false,
  storedPermits = null,
  storedPermitsUnknown = false,
  neverCut = false,
  tuningEnabled = false,
  strategy = null,
  socialGames = false,
  gamePrefill = null,
  proposedCutsEnabled = false,
  manaBalanceEnabled = false,
  tuningHubEnabled = false,
  suggestedChangesV2 = false,
  landing = null,
  landingRequest = null,
  nearCombos = null,
}: BuilderShellProps) {
  // The table's log prefill (Rule 0 PR 8), held here because the Games panel remounts on every tab change.
  const [offeredPrefill, spendPrefill] = useHeldPrefill(gamePrefill);
  // UI state. A landing on Cheaper stand-ins or Friends' spares opens on Shopping, where their press is.
  // `?panel=` (the ?'s way back) opens Your deck on the body the ? was pressed on, on the deck tab only, and only on a
  // panel this reader is drawn: Stats or Notes behind a switch that is off opens on the list, so the ? and the phone
  // dock read the list too. Shopping has no switch.
  const body =
    initialView !== "deck" || (initialBody === "stats" && !statsEnabled) || (initialBody === "notes" && !notesEnabled)
      ? null
      : initialBody;
  const [filter, setFilter] = useState<"all" | "shopping">(
    (landing?.lands.kind === "deck" && landing.lands.view === "shopping") || body === "shopping" ? "shopping" : "all",
  );
  // A nudge's press (discovery R3, N1 to N3) lands as Try it does: it writes `?tool=` and hands the hook its own landing,
  // so the halo, the visit and the moment follow one rule. Newer than the page's landing, so it wins until the next one.
  const [pressedLanding, setPressedLanding] = useState<{ landing: ToolLanding; nonce: number } | null>(null);
  useToolLanding(
    pressedLanding?.landing ?? landing,
    pressedLanding ? `press:${pressedLanding.nonce}` : (landingRequest ?? deck.id),
  );
  // The grouping persists per reader, as the List / Card view does (`DECK_GROUPING_KEY`): "I read decks by role"
  // is a fact about the reader, not about one deck. By type until this browser says otherwise, which is also what
  // the server renders.
  const [storedGrouping, setGrouping] = useStoredView(DECK_GROUPING_KEY, isDeckGrouping);
  const grouping = storedGrouping ?? "type";
  // Which body the deck list shows (list or Stats). Held here, not in the list: the list remounts on
  // a tab switch, and a deck opened afresh must open on its list.
  const deckPanel = useState<DeckPanel>(body === "stats" || body === "notes" ? body : "list");
  // v0 drawn as a row of its own: a linked deck's, unless the deck was started from the precon and its
  // first version IS v0 (`startVersionId`).
  const originApart = preconOrigin !== null && preconOrigin.startVersionId === null;
  const [view, setView] = useState<BuilderView>(
    initialBuilderView(initialView, versions.length + (originApart ? 1 : 0), analysisEnabled),
  );
  // The benchmark ledger's Stats link (audit build rule 6): Your deck, its Stats panel, and the
  // card the ledger is built on. The Decklist opens the panel and scrolls once per request.
  // Unlinking a brew from v0's panel takes the Versions tab away with v0: fall back to the deck
  // during render, so no frame draws an empty rail under no selected tab.
  if (view === "versions" && versions.length === 0 && !originApart) setView("deck");
  // The ? in the shell reads which of the deck's screens this is from here, never the URL (discovery R2·8).
  usePublishBuilderScreen(deckViewOf(view, filter, deckPanel[0]), view);
  const [statsFocus, setStatsFocus] = useState<{ card: "curve" | "jobs"; n: number } | null>(null);
  const clearStatsFocus = useCallback(() => setStatsFocus(null), []);
  const openStatsAt = useCallback((card: "curve" | "jobs") => {
    setView("deck");
    setStatsFocus((f) => ({ card, n: (f?.n ?? 0) + 1 }));
  }, []);

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
  // One owner for the focus, as for the declaration, so Suggested changes can read the same pick (strategy focus PR 4).
  const strategyFocus = useStrategyFocus(deck.id, strategy?.focus?.key ?? null);
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

  // The pass sheet (deck messages PR 3): one pass's cards, from the ledger's `Show these N`, or the
  // cards other drafts want too, from the foot. One target at a time, for the visit.
  const [passSheet, setPassSheet] = useState<PassSheetTarget | null>(null);
  // A pass the incoming summaries no longer list (an undo, a sweep, a keep-all) takes its sheet with
  // it. Adjusted during render, so the stale sheet never paints.
  if (passSheet?.kind === "pass" && !fillPasses.some((p) => p.id === passSheet.passId)) setPassSheet(null);

  // Combos one piece away, the list (combos close), open for the visit.
  const nearComboCount = nearCombos?.total ?? 0;
  const [combosSheet, setCombosSheet] = useState(false);
  useDeckTitleFocusOnClose(combosSheet);
  // With none left the sheet closes itself, once the reader is back on its list: never from under a
  // combo the reader is reading (or a card stacked on it).

  // The top-off list is open. At phone widths its commit bar takes the bottom
  // slot, so the quick-add dock hides — one bottom slot, one occupant (state
  // 20). Hidden with `display:none` rather than unmounted, so a half-typed
  // query is still there when the list closes.
  const [topOffOpen, setTopOffOpen] = useState(false);
  // Suggested changes v2's `Top off on Your deck →` (Not-At-99 A): a request the top-off row answers by opening its list
  // once, on arrival at Your deck. Dropped once answered, so a later visit to the tab does not open it again.
  const [topOffRequest, setTopOffRequest] = useState<number | null>(null);
  const topOffNonce = useRef(0);
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
    setOptimisticQuantity,
  } = useOptimisticDeckCards(deck.cards, deck.unresolvedRows);
  // Whether the import arrived with unresolved lines, fixed at arrival: the owned strip's head is a claim about what
  // the import brought over, which resolving a line while the strip is up must not revise.
  const [arrivedUnresolved] = useState(() => deck.unresolvedRows.length > 0);
  // The receipts, held for the visit: the page's parameters leave the address once read, so a later server refresh
  // (resolving a line) arrives with none and would drop the strip or its add line. ✕ hides it for the visit.
  const receipts = useVisitReceipts({
    fromImport: arrivedFromImport,
    printings: arrivalPrintings,
    importAdd: importAddReceipt,
    precon: preconArrival,
    preconAdd: preconAddReceipt,
    update: updateArrival,
  });
  // The basics stepper's save queue, one for the deck (`basic-counts.tsx`): it outlives a List ↔ Card switch,
  // and Clear auto and the Add panel flush it before writing the rows it would race. Built once, and handed
  // this render's prediction and router after each commit; a press always comes after one.
  const appRouter = useContext(AppRouterContext);
  const [, startBasicCount] = useTransition();
  const [basicCounts] = useState<BasicCounts>(() => createBasicCounts());
  // Leaving the builder (for the review page, where the commit is) settles every open burst AT ONCE, so the count
  // the player saw is saved on the way out rather than 600ms later, behind a commit that would snapshot the old one.
  useEffect(() => () => void basicCounts.flush(), [basicCounts]);
  useEffect(() => {
    basicCounts.configure({
      save: (oracleId, n, expected) => setBasicQuantity(deck.id, oracleId, n, expected),
      predict: setOptimisticQuantity,
      transition: (fn) => startBasicCount(fn),
      refresh: () => appRouter?.refresh(),
    });
  });
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
  // A nudge's press: open the tool's tab (and Your deck's Shopping view), then land on its target. Only a nudge whose
  // tool is on for this reader is drawn, so the registry's switch is already decided.
  const setDeckPanel = deckPanel[1];
  const pressTool = useCallback(
    (id: ToolId) => {
      const next = toolLanding(id, () => true);
      if (next === null || next.lands.kind !== "deck") return;
      setView(next.lands.tab);
      if (next.lands.view === "shopping") {
        setDeckPanel("list");
        changeFilter("shopping");
      }
      const url = new URL(window.location.href);
      url.searchParams.set(TOOL_PARAM, id);
      mirrorUrl(url, window.history.state);
      setPressedLanding((p) => ({ landing: next, nonce: (p?.nonce ?? 0) + 1 }));
    },
    [changeFilter, setDeckPanel],
  );
  // Card details' `Tokens ›` asks for the deck's list at All, where the Tokens group is drawn: from Analysis, Consider or Games too.
  useEffect(() => {
    const show = () => {
      setView("deck");
      deckPanel[1]("list");
      changeFilter("all");
    };
    window.addEventListener(SHOW_DECK_TOKENS, show);
    return () => window.removeEventListener(SHOW_DECK_TOKENS, show);
  }, [changeFilter, deckPanel]);
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
  // ...AND UNTIL EVERYTHING ELSE THE TAB DRAWS HAS ANSWERED (Hugh's staging walk, 2026-09-25):
  // the overview (and the credit notes beside Analyze, which it prices) and, over a reading,
  // Suggested changes with its own credit line. Each arrived on its own clock before, so the tab
  // painted in pieces: an overview landing above a bracket already drawn, a credit line popping in
  // after the rest. The loader now lets go once, onto the whole tab. ONLY THE OPENING waits: once a
  // visit to the tab has opened, a press or a refetch never brings the loader back, which the
  // latch below enforces. A new visit (the tab left and re-entered) opens afresh, since Suggested
  // changes remounts and reads again.
  const [visit, setVisit] = useState({ view, n: 0 });
  if (visit.view !== view) setVisit({ view, n: view === "analysis" ? visit.n + 1 : visit.n });
  const visitKey = `${deck.id}:${visit.n}`;
  const [tuningSettled, setTuningSettled] = useState<string | null>(null);
  const onTuningSettled = useCallback(() => setTuningSettled(visitKey), [visitKey]);
  const [cutsSettledKey, setCutsSettledKey] = useState<string | null>(null);
  const onCutsSettled = useCallback(() => setCutsSettledKey(visitKey), [visitKey]);
  const [manaSettledKey, setManaSettledKey] = useState<string | null>(null);
  const onManaSettled = useCallback(() => setManaSettledKey(visitKey), [visitKey]);
  // With the hub on, the tools mount only when opened, so the tab's loader waits on the landing's
  // own first read instead of on theirs.
  const [hubSettledKey, setHubSettledKey] = useState<string | null>(null);
  const onHubSettled = useCallback(() => setHubSettledKey(visitKey), [visitKey]);
  // A shortcut's ask for the hub (the trim line's `Proposed cuts →`), answered once per nonce.
  // Dropped once the hub has answered it, so a later visit to the tab opens on the landing.
  const [hubRequest, setHubRequest] = useState<HubRequest | null>(null);
  const hubNonce = useRef(0);
  const onHubRequestAnswered = useCallback(
    (nonce: number) => setHubRequest((r) => (r?.nonce === nonce ? null : r)),
    [],
  );
  // Shared by the empty-state field (`AnalysisEmpty`, via `AnalysisPanel`) and the checklist's
  // own "Describing in place" editor (`TuningPanel`, H35 PR 3 review fix) — the two mounts are
  // mutually exclusive, but both write through the same action.
  const saveDescription = useCallback(
    (value: string) => {
      const form = new FormData();
      form.set("intent", value);
      return saveDeckDescription(deck.id, form);
    },
    [deck.id],
  );
  const holding = holdsOpening({
    analyzed: deckAnalyzed({ storedPermits, hasReading: reading !== null, storedUnknown: storedPermitsUnknown }),
    peekPending: isOpening({ shown: true, kind: profile.state.kind, storedPermits, peekSettled: profile.peekSettled, storedUnknown: storedPermitsUnknown }),
    overviewSettled: !analysisEnabled || synopsis.settled,
    hasReading: reading !== null,
    // A tool that is off is never mounted, so it has nothing to wait for.
    suggestionsSettled: tuningHubEnabled || !tuningEnabled || tuningSettled === visitKey,
    // The tools mounted directly (hub off): Proposed cuts and, alone, Mana Balance.
    cutsSettled: tuningHubEnabled
      ? hubSettledKey === visitKey
      : (!proposedCutsEnabled || cutsSettledKey === visitKey) && (!manaBalanceEnabled || manaSettledKey === visitKey),
  });
  const opening = useOpeningGate(useOpenOnce(holding, visitKey, view === "analysis"), deck.id);
  // The credit note beside each press that also writes, and whether it does (`synopsis-note.ts`).
  const analyzeNote = analysisEnabled ? pressNote(synopsis.view, "analyze") : null;
  const reanalyzeNote = analysisEnabled ? pressNote(synopsis.view, "reanalyze") : null;
  // A PRESS WRITES ONLY WHAT ITS NOTE SAID IT WOULD. Recorded when the press is made, so a note
  // that was not drawn (the state not yet read, the list already written, no credit left) is a
  // press that spends nothing, whatever the state says by the time the reading lands.
  const pressWrites = useRef(false);
  // THE FIRST PRESS HOLDS ITS LOADER THROUGH THE WRITE (Hugh, 2026-09-26): a first Analyze that
  // also writes the overview keeps the empty state's ring up, its heading stepping from reading the
  // deck to writing the overview, until the verdict AND the overview can paint together, so nothing
  // moves once they do. A write that fails or is refused releases it at once (the slot then shows
  // 1d or 7h), and so does `OVERVIEW_HOLD_MS` passing mid-write: the verdict paints and the slot
  // takes the addendum's 1b status line, so only a slow run pays the one-time growth. Re-analysis
  // holds nothing: a reading is already painted, and the held overview stays under its label row.
  const [staged, setStaged] = useState<{ deckId: string; writing: boolean } | null>(null);
  // The panel says the verdict and the overview together when a held press lets go, so the
  // overview's own *Overview ready.* stays quiet for it. It speaks again for a press that let go at
  // the limit (the overview then lands on its own) and for the overview's own write controls.
  const [quietReady, setQuietReady] = useState(false);
  const requestAnalysis = useCallback(() => {
    pressWrites.current = Boolean(analyzeNote?.writes);
    const holds = pressWrites.current && reading === null;
    if (holds) setStaged({ deckId: deck.id, writing: false });
    setQuietReady(holds);
    profile.request();
  }, [analyzeNote?.writes, profile, reading, deck.id]);
  const writeSynopsisNow = synopsis.write;
  useEffect(() => {
    writeOnFresh.current = (landed: string) => {
      if (landed !== deck.id || !pressWrites.current) return;
      pressWrites.current = false;
      setStaged((s) => (s && s.deckId === landed ? { ...s, writing: true } : s));
      // A refusal (reused, in flight, allowance) is a silent no-op: the Overview re-reads either way.
      // However the write ends, the first press's hold is over.
      void writeSynopsisNow().finally(() => setStaged((s) => (s && s.deckId === landed ? null : s)));
    };
  }, [deck.id, writeSynopsisNow]);
  // A read that settles without starting a write ends the hold here, during render, so a later
  // press (the Notices foot's, say) never finds a stale one waiting.
  if (staged && !staged.writing && staged.deckId === deck.id && profile.state.kind !== "loading") setStaged(null);
  const stagedWriting = staged?.deckId === deck.id && staged.writing;
  useEffect(() => {
    if (!stagedWriting) return;
    const id = setTimeout(() => {
      setStaged(null);
      setQuietReady(false);
    }, OVERVIEW_HOLD_MS);
    return () => clearTimeout(id);
  }, [stagedWriting]);
  // Held while the bracket is read, and then while the overview is written. A read that ends any
  // other way (failed, refused, an edit landing mid-press) calls no write and so ends the hold.
  const hold: "reading" | "writing" | null = staged?.deckId !== deck.id
    ? null
    : profile.state.kind === "loading" ? "reading" : staged.writing ? "writing" : null;
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

  // DECK NOTICES (plan PR 6). Read by the page's loader, so the tag paints with the header (a read
  // after mount popped it in once everything else had drawn), and read again by `peekNotices`
  // whenever a reading lands (a re-analysis clears data notices). Opening the sheet marks what it
  // showed as read (`openNotices`); the tag goes quiet at once rather than on the next read. A URL
  // asking for the sheet (the tile's `!`) has it open in the first paint.
  const [notices, setNotices] = useState<DeckNotices | null>(initialNotices);
  const [noticesShown, setNoticesShown] = useState<DeckNotices | null>(openNoticesOnArrival ? initialNotices : null);
  // Whether the foot pressed the reading now in flight or on screen: its busy and failed states are
  // DERIVED from the profile's own state while that holds, so a failure from the tab's Analyze is the
  // tab's to say. Cleared when the sheet closes.
  const [footPressed, setFootPressed] = useState(false);
  // All of it belongs to ONE deck. The shell is kept across a move between decks, so the tag and an
  // open sheet from the deck just left are dropped during render, before the next deck paints.
  const [noticesDeck, setNoticesDeck] = useState(deck.id);
  if (noticesDeck !== deck.id) {
    setNoticesDeck(deck.id);
    setNotices(initialNotices);
    setNoticesShown(openNoticesOnArrival ? initialNotices : null);
    setFootPressed(false);
  }
  const readingAt = reading?.analyzedAt ?? null;
  // The deck the peek below last ran for: its first run for a deck the loader already read is
  // skipped, since that read is what the tag is drawing.
  const peekedDeck = useRef<string | null>(null);
  useEffect(() => {
    if (!analysisEnabled || !noticesEnabled) return;
    const firstForDeck = peekedDeck.current !== deck.id;
    peekedDeck.current = deck.id;
    if (firstForDeck && initialNotices) return;
    let live = true;
    // An open sheet takes the new read too: after the foot's Re-analyze the entries the new reading
    // absorbed leave the list at once, rather than on the next open.
    void peekNotices(deck.id).then((n) => {
      if (!live) return;
      setNotices(n);
      setNoticesShown((shown) => (shown && n ? n : shown));
    }).catch(() => {});
    return () => { live = false; };
  }, [analysisEnabled, noticesEnabled, deck.id, readingAt, listKey, initialNotices]);
  // Which deck's sheet is open NOW (null: none), readable from the reply's continuation:
  // `openNotices` answers after the sheet draws, and a reply landing after a close, or after a move
  // to another deck, must not draw the sheet or the tag again.
  const noticesOpenFor = useRef<string | null>(null);
  const deckNow = useRef(deck.id);
  useEffect(() => {
    deckNow.current = deck.id;
    noticesOpenFor.current = null;
  }, [deck.id]);
  // Arriving with `?notices=1`: the sheet is already drawn from the loader's read (state above), so
  // this records the open, as a press does, and strips the parameter so a refresh or a back step
  // lands on the deck alone. After the reset above, which clears `noticesOpenFor` for a new deck.
  useEffect(() => {
    if (!openNoticesOnArrival) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has(NOTICES_PARAM)) {
      url.searchParams.delete(NOTICES_PARAM);
      mirrorUrl(url, window.history.state);
    }
    const id = deck.id;
    noticesOpenFor.current = id;
    void openNotices(id).then((n) => {
      if (!n || deckNow.current !== id) return;
      setNotices(n);
      if (noticesOpenFor.current === id) setNoticesShown(n);
    }).catch(() => {});
  }, [deck.id, openNoticesOnArrival]);
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
  // What the benchmark ledger's rows draw for each card's copies: the decklist row's own facts, and
  // the commanders' (a commander's absent `owned` means owned, as everywhere else).
  const ledgerAvailability = useMemo(
    () => new Map([
      // A proxied slot is filled by its proxy, so it draws no marker, as the decklist row suppresses it.
      ...cards.map((c) => [c.oracleId, { owned: c.owned && !c.proxied, availability: c.proxied ? null : c.availability ?? null }] as const),
      ...[deck.commander, ...(deck.partner ? [deck.partner] : [])].map((c) =>
        [c.oracleId, { owned: (c.owned ?? true) && !c.proxied, availability: c.proxied ? null : c.availability ?? null }] as const),
    ]),
    [cards, deck.commander, deck.partner],
  );
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
  //
  // An EMPTY map on a committed deck with nothing pending, not null: the basics stepper reads "this deck has
  // a version to compare against" off the provider, to draw `from N` during its first burst before any move
  // exists. Every reader asks `moves.get`, so an empty map draws no mark and no note.
  const pendingChange = useMemo(() => {
    if (!draft?.version) return null;
    const moves = new Map<string, { from: number; to: number }>();
    for (const c of draft.addChanges) moves.set(c.oracleId, { from: c.from, to: c.to });
    for (const c of draft.removes) {
      if (c.to > 0) moves.set(c.oracleId, { from: c.from, to: c.to });
    }
    return { moves };
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
    //
    // The commanders count too (H28): `loadDeckBuyRows` bills an unowned or spoken-for commander,
    // and the Shopping list draws it, so this pill counts it as the list's own pill does.
    unfundedCount: cardCopies([
      ...commanderShoppingRows(deck.commander, deck.partner, deck.cards),
      ...deck.cards.filter(isShoppingCard),
    ]),
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
  // The commanders apart (combos close UI-3): the near-combos read holds a command-zone-only piece
  // only as a commander and reads the deck's colors from them.
  const comboCommanders = useMemo(
    () => [deck.commander.oracleId, ...(deck.partner ? [deck.partner.oracleId] : [])],
    [deck.commander.oracleId, deck.partner],
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
  // The other-drafts sheet leaves with its claims: a later refresh that claims again must not
  // reopen a sheet nobody pressed. Adjusted during render, like the `pass` case above.
  if (passSheet?.kind === "drafts" && commitments.softClaimed === 0) setPassSheet(null);

  // The spent slots the undo rows are drawn from, one receipt per removed card
  // (H29). Decklist state rather than row state, because a removal unmounts
  // its row: held here it survives a tab switch to Consider and back, and any
  // re-sort. Keyed on oracle id so several stand independently — undoing one
  // never touches another. Each receipt is cleared by exactly three things —
  // its own Undo accepted, its own card removed again, or leaving the builder
  // route (this component unmounting) or discarding the draft, either of which
  // clears every receipt at once. Never by a timer.
  //
  // `landed` is whether the server has shown that receipt's card GONE since the
  // slot was set: its removal landed. Only then can the card coming back mean
  // an undo succeeded rather than a list from before it.
  const [spentSlots, setSpentSlots] = useState<Record<string, { card: DeckDetailCard; landed: boolean }>>({});

  // The swept rows from a clearAutoCards action. Null means no sweep has run
  // (or it has been undone/navigated away). Lives beside spentSlots: it is decklist
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
    built === 0 &&
    unresolvedRows.length === 0 &&
    Object.keys(spentSlots).length === 0 &&
    !sweptRows?.length;
  // The cards the decklist draws receipts for — every standing one, in no
  // particular order: the decklist sorts each into its own card's place.
  const spentSlotCards = Object.values(spentSlots).map((r) => r.card);
  const commanderShortName = shortCommanderName(deck.commander.name);

  // An add changes three numbers at once — the tile's button, the tab count and
  // a role cell — and a screen reader sees none of them, because all three are
  // ordinary text elsewhere in the tree. The live region is the only place the
  // add is narrated, so every add path goes through this wrapper rather than
  // calling addOptimisticCard directly. (`announcement` itself is declared above,
  // beside the lock state that also speaks into it.)

  // Composed from the pre-add list plus this card. `useOptimistic` state is not
  // readable synchronously here, and reading it a render later would announce
  // the previous add.
  const labelQueriedSet = useMemo(() => (labelQueried ? new Set(labelQueried) : null), [labelQueried]);
  const announceAdd = useCallback(
    (card: Parameters<typeof addOptimisticCard>[0]) => {
      addOptimisticCard(card);
      const before = cards;
      const nextBuilt = deckCounts(before).built + card.quantity;
      // By label, the card's role is the first role its label names, and a queried card with no
      // label names none; a land or a card the page never queried (a search result) takes `card.role`.
      const countRoles = roleCounterFor(labelRows);
      const role = roleNamedFor(card, labelRows, labelQueriedSet);
      const cell = mix.cells[role as MixRole] as
        | RecommendedMix["cells"][MixRole]
        | undefined;
      setAnnouncement(
        cell
          ? addPanelCopy.announce.added(
              card.name,
              nextBuilt,
              cell.label,
              countRoles(before)[role as MixRole] + card.quantity,
              cell.target,
              bodySize,
            )
          : addPanelCopy.announce.addedNoRole(card.name, nextBuilt, bodySize),
      );
    },
    [addOptimisticCard, cards, bodySize, labelRows, labelQueriedSet, mix],
  );

  // Split in two on purpose. `useDeckMutation` dispatches its optimistic update
  // inside an async transition, and React holds every *ordinary* state update
  // made in one until the action settles — only the `useOptimistic` override
  // paints early. The slot and the announcement would therefore appear only
  // after the server answered, which is the whole window the undo row exists
  // for. So the row calls `markSpent` straight from the click, outside `run`,
  // and leaves only the optimistic dispatch inside it.
  // A refused Undo's message, held here because the receipt that asked has unmounted: see
  // `reportUndoFailure` below. Keyed on oracle id (H29) — a map rather than one value, since
  // several receipts stand at once and a refusal for one must never mark another.
  const [undoFailure, setUndoFailure] = useState<Record<string, string>>({});
  // Which removal an Undo belongs to, per card. The ref is what a late report is checked
  // against (the state it arrives through may be a render behind); the state is what each
  // receipt hands its own undo. A single counter feeds both maps, so two cards' generations
  // never collide, but each card's own history is what a report is compared against.
  const removalCounterRef = useRef(0);
  const removalRef = useRef<Record<string, number>>({});
  const [removal, setRemoval] = useState<Record<string, number>>({});
  // A failed removal outlives the row that asked for it, so its reason is held
  // here, keyed on oracle id (H29). Cleared only when that card's own state
  // moves — see `markSpent`, which drops this card's own entry on the next
  // removal of the same card — never by any server card update: with several
  // removals in flight, card B landing must not erase card A's refusal.
  //
  // Declared ahead of `markSpent` because its setter is read there.
  const [removeFailure, setRemoveFailure] = useState<Record<string, { name: string; key: number }>>({});
  const [oracleIdOfFailure, failure] = Object.entries(removeFailure)[0] ?? [];
  const latestRemoveFailure = failure ? { oracleId: oracleIdOfFailure, ...failure } : null;
  const markSpent = useCallback(
    (card: DeckDetailCard) => {
      removalCounterRef.current += 1;
      const generation = removalCounterRef.current;
      removalRef.current = { ...removalRef.current, [card.oracleId]: generation };
      setRemoval((prev) => ({ ...prev, [card.oracleId]: generation }));
      // This removal settles whatever this SAME card's last removal left,
      // including a refused undo's message — but leaves every other card's
      // receipt and refusal exactly as they were.
      setUndoFailure((prev) => dropKey(prev, card.oracleId));
      // "that card's own state moves" (H29 §2): a new removal attempt on this
      // card is what retires a stale removal refusal, never another card
      // landing or any other server update.
      setRemoveFailure((prev) => dropKey(prev, card.oracleId));
      setSpentSlots((prev) => {
        if (card.quantity > 1) {
          // A stack that decrements keeps its row, and its own count is the
          // receipt — no undo row for this card.
          if (!(card.oracleId in prev)) return prev;
          return dropKey(prev, card.oracleId);
        }
        return { ...prev, [card.oracleId]: { card, landed: false } };
      });
      // A removal is announced only when it leaves an undo row behind. A stack
      // that decrements keeps its row, and its own count is the receipt.
      if (card.quantity > 1) return generation;
      setAnnouncement(
        addPanelCopy.undo.announceRemoved(
          // The pair of `announceUndone` below, and named the same way: the row
          // that left and the receipt that brings it back are one card.
          printedFaceName(card),
          deckCounts(cards).built - 1,
          bodySize,
        ),
      );
      return generation;
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
  const [lastServerCards, setLastServerCards] = useState(deck.cards);
  if (lastServerCards !== deck.cards) {
    setLastServerCards(deck.cards);
    // Settling runs per receipt, so one undo landing does not take the others
    // away. The slot settles on the card being genuinely back in the deck, not
    // on the undo's promise resolving. Settling on success would drop the
    // receipt before the new HTML landed, flashing the pre-undo list back for a
    // frame once the optimistic re-add let go. A refusal needs the slot
    // standing too: the reverted prediction draws the receipt again, and it
    // reads the message from `undoFailure`. A revalidation that still lacks the
    // card — the removal itself — leaves the slot standing. So does a list that
    // holds the card before this slot's own removal has landed: an undo
    // overtaken by a newer removal answers with the card present, and settling
    // on that would take the newer receipt away.
    if (Object.keys(spentSlots).length > 0) {
      setSpentSlots((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [oracleId, receipt] of Object.entries(prev)) {
          const back = deck.cards.some((c) => c.oracleId === oracleId);
          if (!back) {
            if (receipt.landed) {
              next[oracleId] = receipt;
            } else {
              next[oracleId] = { ...receipt, landed: true };
              changed = true;
            }
          } else if (receipt.landed) {
            changed = true; // settled: drop the receipt
          } else {
            next[oracleId] = receipt; // overtaken; still standing
          }
        }
        return changed ? next : prev;
      });
    }
  }
  // A refused Undo outlives the receipt that asked, which the optimistic re-add unmounted. Keyed
  // on the card's oracle id, and dropped only when THAT card has been removed again since its
  // undo was pressed — its own generation moved — never by any other card's removal or by the
  // next server list: a refusal can arrive in the same render as a revalidation, and clearing on
  // that would erase it unread.
  const reportUndoFailure = useCallback((oracleId: string, message: string, from: number) => {
    // An undo pressed before a newer removal of THIS card answers for a receipt
    // that no longer exists. Another card's removal never bumps this entry.
    if (from !== (removalRef.current[oracleId] ?? 0)) return;
    setUndoFailure((prev) => ({ ...prev, [oracleId]: message }));
  }, []);
  const reportRemoveFailure = useCallback((oracleId: string, cardName: string, from: number) => {
    // Same rule as `reportUndoFailure`: a failure from a removal attempt that
    // this card has since moved past (a later removal already bumped its
    // generation) answers for a receipt that no longer describes the card's
    // current state, and must not clear a newer one standing in its place.
    if (from !== (removalRef.current[oracleId] ?? 0)) return;
    // One failure at a time (deck messages A1): a newer one replaces whatever the toast was saying.
    setRemoveFailure({ [oracleId]: { name: cardName, key: Date.now() } });
    // The card never left, so there is nothing to undo. Leaving its own slot
    // would offer to put back a card the deck still holds — every other
    // receipt stands.
    setSpentSlots((prev) => dropKey(prev, oracleId));
  }, []);
  // A discard throws the whole draft away (§3): the receipts describe removals
  // the draft made, and a discard ends the draft without unmounting this
  // component, so nothing else would ever clear them. `hasChanges` flips from
  // true to false exactly once a discard lands — a commit never does this in
  // place, since the review screen it routes through navigates away first.
  const draftHasChanges = draft ? hasChanges(draft) : false;
  const [lastDraftHasChanges, setLastDraftHasChanges] = useState(draftHasChanges);
  if (draftHasChanges !== lastDraftHasChanges) {
    setLastDraftHasChanges(draftHasChanges);
    if (lastDraftHasChanges && !draftHasChanges) {
      setSpentSlots({});
      setUndoFailure({});
      setRemoveFailure({});
      // `removalRef` is a read cache for `reportUndoFailure`'s synchronous
      // check; a ref must never be written during render. Leaving a stale
      // generation behind is harmless — nothing reads it without a matching
      // `spentSlots` entry, and the next removal of that same card overwrites
      // it exactly as any other removal does.
      setRemoval({});
    }
  }

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
      // A basic the stepper is still settling is about to be claimed (its save clears `auto`): flush first, or
      // the sweep deletes the land the player just counted. A save that did not confirm leaves that count
      // unknown, so the sweep does not run over it.
      if (!(await basicCounts.flush())) {
        setAutoError(recommendationsCopy.auto.sweepFailed);
        return;
      }
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
    setQuantity: setOptimisticQuantity,
    undo: { restore: addOptimisticCard, reportFailure: reportUndoFailure, failure: undoFailure, removal },
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

  // The to-do card's unresolved `Look`, and the same two-step move as seeShelf above
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

  // The tools, built once and mounted either directly (hub off) or inside the hub's tiles.
  // `inHub`: mounted under the hub's tab row, where it opens fresh each visit and, at the line,
  // finishes in place rather than draw nothing under the row.
  const cutsPanel = (inHub: boolean) => (
    <CutsPanelView
      freshEachVisit={inHub}
      finishInPlace={inHub}
      key={deck.id}
      deckId={deck.id}
      onSettled={onCutsSettled}
      revision={`${listKey}|${deck.intent ?? ""}|${declaration.declared ?? ""}|${[...lockedIds].sort().join(",")}`}
    />
  );
  // Read fresh on every open, and again whenever the list, a commander or a lock moves: a locked
  // basic never moves in its help, so a lock retires a kept help result too.
  const manaPanel = (
    <ManaBalancePanel
      key={deck.id}
      deckId={deck.id}
      // The commanders count too: their pips, their identity and the cards figure.
      revision={`${deck.commander.oracleId}|${deck.partner?.oracleId ?? ""}|${listKey}|${[...lockedIds].sort().join(",")}`}
      // Mounted directly (Mana alone on), its first read holds the tab's opening, as Proposed cuts' does.
      onSettled={onManaSettled}
    />
  );
  // The land cell offers Mana Balance only for a deck with a color to count (design table, R3).
  const coloredPip = hasColoredPip(cards, [deck.commander, ...(deck.partner ? [deck.partner] : [])]);
  // The Analysis tab's moments (discovery R1). M2 at the deck's size; M3 over it and M4 at it, each standing in for its
  // own shortcut only while that shortcut is not drawn (audit resolution 2), which the provider decides.
  // Not while Analysis is the open tab: the tab is then where the reader already is.
  const atSize = built === bodySize;
  // Whether the Tuning hub draws for these permits. Mana Balance needs no reading, so with it on the hub draws for any
  // deck. One rule for the hub and for the panel deciding where Suggested changes' landing target is.
  const hubDraws = (permits: readonly Bracket[] | null) => permits !== null || built > bodySize || manaBalanceEnabled;
  const offAnalysis = view !== "analysis";
  // The tab is the moment's control but never the tool's target: a landing reaches the tool itself (its tile).
  const suggestedMoment = useMomentAnchor("suggested-changes", {
    eligible: atSize && offAnalysis,
    copy: momentsCopy.suggestedChanges,
    target: false,
  });
  const cutsTabMoment = useMomentAnchor("proposed-cuts", {
    eligible: built > bodySize && offAnalysis,
    copy: momentsCopy.proposedCuts(built - bodySize),
    fallback: true,
  });
  // A colorless deck gets no Mana Balance moment anywhere: the tool would only say there is no color to count.
  const manaTabMoment = useMomentAnchor("mana-balance", {
    eligible: atSize && offAnalysis && coloredPip,
    copy: momentsCopy.manaBalance,
    fallback: true,
  });
  const analysisTabRef = useMergedRef(suggestedMoment.ref, cutsTabMoment.ref, manaTabMoment.ref);
  const analysisTabDescribedBy =
    suggestedMoment["aria-describedby"] ?? cutsTabMoment["aria-describedby"] ?? manaTabMoment["aria-describedby"];
  // Suggested changes v2 (plan 2026-10-27, UI PRs 5a and 5b), on this reader's switch: the 99 the tool keeps a deck at, the links
  // to the tools that bring a deck back there, and what the "What we noticed" chips read (README item 2, plan H5).
  // `at` is the deck on the tool's 99 scale: the built count, with a partner's second slot added back.
  const proposedCutsPress = !proposedCutsEnabled
    ? undefined
    : tuningHubEnabled
      ? () => { setView("analysis"); setHubRequest({ tool: "cuts", nonce: (hubNonce.current += 1) }); }
      : () => pressTool("proposed-cuts");
  const topOffPress = () => {
    setView("deck");
    setDeckPanel("list");
    setTopOffRequest((topOffNonce.current += 1));
  };
  let suggestedV2: TuningV2 | null = null;
  if (suggestedChangesV2) {
    const have = roleCounterFor(labelRows)(cards);
    // Newest first (the page's order): the first game whose note says anything.
    const noted = games.find((g) => g.note !== null && plainText(g.note).trim() !== "");
    suggestedV2 = {
      at: built + (deckBodySize(false) - bodySize),
      over: built - bodySize,
      noticed: {
        roles: ROLE_ORDER.map((role) => ({
          role, label: mix.cells[role].label, have: have[role], target: mix.cells[role].target, advisory: mix.cells[role].advisory,
        })),
        focus: strategyFocus.settled ? strategyName(strategyFocus.settled) : null,
        game: noted ? { note: plainText(noted.note!), date: localDay(noted.playedAt) } : null,
      },
      // The overview the run reads (`readTuningContext`): the shown synopsis, with a strategy or Key cards in it.
      hasOverview: synopsis.view.kind === "ready" && hasOverviewContent(synopsis.view.state.synopsis?.content ?? null),
      // Offered only while Your deck draws the Top off row (`bodySize - counts.total > 0`): a gap that unresolved lines
      // fill has no row to open, so the count is named with no link rather than promising one.
      onTopOff: bodySize - counts.total > 0 ? topOffPress : undefined,
      onProposedCuts: proposedCutsPress,
      // The deck page's own type groups, for the results' By type heads (`n in the deck`).
      typeCounts: cards.reduce<Partial<Record<CardTypeGroup, number>>>((acc, c) => {
        acc[c.cardTypeGroup] = (acc[c.cardTypeGroup] ?? 0) + c.quantity;
        return acc;
      }, {}),
    };
  }
  const suggestedPanel = (permits: readonly Bracket[], freshEachVisit = false) => (
    <TuningPanel
      v2={suggestedV2}
      landingTarget={!tuningHubEnabled}
      freshEachVisit={freshEachVisit}
      deckId={deck.id}
      permits={permits}
      facts={{
        gameCount: gameSummary.count,
        noteCount: games.filter((g) => g.note !== null).length,
        fix: gameSummary.fix[0] ? { key: gameSummary.fix[0].key, hurt: gameSummary.fix[0].hurt } : null,
        marked: gameSummary.marked,
        cards: built,
        intent: deck.intent,
        limits: deck.limits ?? { capCents: null, sets: [], ownedOnly: false },
        // The focus the server holds, not the press in flight: the panel re-reads its gate when it moves.
        focus: strategyFocus.settled,
        focusRevision: strategyFocus.settledRevision,
      }}
      printedInSets={printedInSets}
      onLogGame={() => setView("games")}
      onSettled={onTuningSettled}
      onSaveDescription={saveDescription}
    />
  );

  return (
    // One card-detail modal for every surface below — spine, decklist, suggestions, search.
    // Every card opened from this page belongs to THIS deck, which is what
    // scopes the sheet's proxy control. A card opened from `/collection` has no
    // deck and draws no control — that provider passes none.
    <CardDetailProvider
      deckPage
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
      comboCommanderOracleIds={comboCommanders}
      deckPrintingPicks={deck.printingPicks ?? null}
    >
      <DeckSiblingsProvider>
      <AddOptimisticCardProvider value={deckEdits}>
        <BasicCountsProvider value={basicCounts}>
        <LabelRowsProvider value={labelRows} queried={labelQueried}>
        {/* One column at both widths now that the rail is gone. The document is
            the only scrollport at both widths: desktop used to frame the column
            in the viewport (`h-screen` + `overflow-hidden` here, `overflow-y-auto`
            below) so the quick-add bar could sit against the bottom edge, but
            that box's edges cut across empty space whenever the content was
            shorter than the screen. The bar is `sticky`, so it pins to whichever
            scrollport contains it — the document serves that just as well. */}
        <div
          className="flex flex-col min-h-dvh"
          style={{ background: "var(--bg)" }}
        >
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </span>
          {/* A failed removal (deck messages A1) is the deck toast: one at a time, a newer replaces it, no press. */}
          {latestRemoveFailure && (
            <DeckRefusalToast
              key={latestRemoveFailure.key}
              title={DECK_REMOVE_FALLBACK_MESSAGE}
              detail={latestRemoveFailure.name}
              onDone={() => setRemoveFailure((prev) => dropKey(prev, latestRemoveFailure.oracleId))}
            />
          )}

          <div className="flex-1 flex flex-col min-w-0">
            {/* Builder Spine — unchanged by an import. No extra figure, no
                second bar, no "97 + 2": the deck's number is what's built, and
                the exception lives in the prose below it. */}
            <BuilderSpine
              deck={deck}
              shelf={shelf}
              friendHide={friendHide}
              counts={counts}
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
            />


            {/* Arrival chrome. Mutually exclusive by construction: a clean
                import gets the strip, an import that came up short gets the
                to-do card's unresolved row instead, whose warning would be contradicted by a line
                reading "nothing needs your attention". */}
            {receipts.shown && receipts.held.precon && (
              <PreconArrivalBand
                onDismiss={receipts.dismiss}
                arrival={receipts.held.precon}
                added={receipts.held.preconAdd ? { entryId: receipts.held.preconAdd.entryId } : null}
              />
            )}
            {/* The suggestion only when no receipt is on the page (deck messages A11). */}
            {!receiptDrawn(receipts.held, receipts.shown, unresolvedRows.length) && preconLink && preconLink.suggestions.length > 0 && (
              <PreconSuggestion deckId={deck.id} deckName={deck.name} suggestions={preconLink.suggestions} />
            )}
            {/* A ticked import (no-collection entry) also draws its strip over unresolved lines: what it
                added is a fact the unresolved row does not state, and its head then says only that. */}
            {receipts.shown && receipts.held.fromImport && (unresolvedRows.length === 0 || receipts.held.importAdd) && (
              /* A length, not `counts.total`: the strip's sentence says
                 "lines", and a Moxfield export writes basics as one line
                 ("35 Forest"), so the quantity sum would claim a 99-card deck
                 arrived on 99 lines when it arrived on nearer 65. Same
                 cards-vs-lines rule `unresolvedCardCount` documents — prose
                 that says lines counts lines.

                 And the SERVER list, not the optimistic one: the sentence is a
                 claim about what the import brought over, which an add the
                 player makes while the strip is still up must not revise. */
              <ArrivalStrip
                onDismiss={receipts.dismiss}
                importedLineCount={deck.cards.length}
                printings={receipts.held.printings}
                added={receipts.held.importAdd}
                unresolved={arrivedUnresolved}
              />
            )}

            {/* An update's own strip. Not gated on the unresolved row the way
                the import's is: an update's sentence is about what moved, which
                unresolved lines do not contradict. */}
            {receipts.shown && receipts.held.update && <UpdateStrip arrival={receipts.held.update} onDismiss={receipts.dismiss} />}

            {/* The to-do card (handoff `deck_messages`): what the deck is waiting on, one row each,
                under the receipts. `deckTodo` holds every element's shipped gate and the order; fill
                failed, unresolved, over the body, spoken for twice, the last N and pending feed it here.

                Fill failed's gate is the old banner's, now the rule's: never on a first run (nothing
                persisted tells a failed fill from one never asked for, so a player who made their
                first deck by hand would be told a fill they never ran broke), and never over
                unresolved lines (an import whose every line went unresolved is not a failed fill —
                the player asked for a decklist, not a baseline). Unresolved is not gated on arrival:
                the lines stay unresolved across visits, and so does the explanation of why the
                counts do not add up.

                The last N's only condition is its open slots, and an empty pool is a state the row
                draws (ran out), not a reason to take it away. The count is measured against `total`,
                not `built`: an unresolved line is a card the player already chose and we could not
                name, so it holds the slot it arrived on. Measured against `built`, an import two
                lines short offered to choose two more cards, and taking that offer would put the
                deck two over the moment those lines were resolved. On a first run the guided step
                heads the card and this is its one row. */}
            <TodoCard
              todo={deckTodo({
                firstRun,
                filled: deck.filled,
                cards: cards.length,
                unresolved: unresolvedRows.length,
                openSlots: bodySize - counts.total,
                candidates: candidates.length,
                // A committed deck whose list differs from its newest version. A brew has no version
                // to be pending against: its offer is `Commit as v1`, in the header.
                pending: draft !== null && draft.version !== null && draftHasChanges,
                // The optimistic count, as the header's figure is: the row leaves the instant a cut lands.
                over: built - bodySize,
                // The server list, as the band read it: a just-added card has no availability yet.
                spokenForTwice: commitments.overCommitted,
              })}
              deckName={deck.name}
              // The status line under the rows, and the quiet strip with none. The version only while
              // the list matches it: the pending row says otherwise. The provenance ledger leaves
              // when the last auto card does (autoCount, off the optimistic list), and not on a first
              // run, whose deck is still in flight; `autoCount` is the header's figure as well as its
              // condition, never a sum of the lines (a deck predating the ledger has no passes). The
              // other drafts count is the server list's, pre-99 only (`commitments`).
              foot={{
                version: draft?.version && !draftHasChanges
                  ? { number: draft.version.number, committedAt: draft.version.committedAt }
                  : null,
                noVersion: draft !== null && draft.version === null,
                proxies: proxiedCount,
                provenance: autoCount > 0 && !firstRun
                  ? {
                      count: autoCount,
                      panel: (
                        <ProvenanceLedger
                          deckId={deck.id}
                          cards={cards}
                          total={autoCount}
                          passes={fillPasses}
                          bodySize={bodySize}
                          onShow={(passId) => setPassSheet({ kind: "pass", passId })}
                          onAnnounce={setAnnouncement}
                        />
                      ),
                    }
                  : null,
                otherDrafts: commitments.softClaimed > 0
                  ? { count: commitments.softClaimed, onOpen: () => setPassSheet({ kind: "drafts" }) }
                  : null,
                nearCombos: nearComboCount > 0 ? { count: nearComboCount, onOpen: () => setCombosSheet(true) } : null,
              }}
              renderRow={(row) =>
                row.kind === "fillFailed" ? (
                  <FillFailedRow deckId={deck.id} next={row.next} />
                ) : row.kind === "unresolved" ? (
                  <UnresolvedRow count={unresolvedRows.length} next={row.next} onLook={seeUnresolved} />
                ) : row.kind === "lastN" || row.kind === "ranOut" ? (
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
                    next={row.next}
                    onConsider={() => setView("consider")}
                    onAnnounce={setAnnouncement}
                    onInflight={setFillInflight}
                    openRequest={topOffRequest}
                    onOpenRequestAnswered={() => setTopOffRequest(null)}
                    onOpenChange={setTopOffOpen}
                    onBarHeight={setTopOffBarHeight}
                  />
                ) : row.kind === "over" ? (
                  <OverRow
                    over={built - bodySize}
                    bodySize={bodySize}
                    next={row.next}
                    // N2b (discovery R3): on Proposed cuts' own switch. With the hub off, the press lands on the panel
                    // the tab mounts directly (R3 gap 7).
                    onProposedCuts={proposedCutsPress}
                  />
                ) : row.kind === "spokenForTwice" ? (
                  <SpokenForTwiceRow
                    count={commitments.overCommitted}
                    card={commitments.overCommittedCard}
                    // No press while the Shopping list is what the player is looking at: it would point at the
                    // screen they are already on. From Consider it makes two switches, like `seeUnresolved`.
                    onShowShopping={
                      view === "deck" && filter === "shopping"
                        ? undefined
                        : () => {
                            setView("deck");
                            changeFilter("shopping");
                          }
                    }
                  />
                ) : row.kind === "pending" && draft ? (
                  <PendingRow state={draft} deckId={deck.id} next={row.next} />
                ) : null
              }
            />

            {/* Role Counter Strip. One mount, at "Your deck", whether or not Analysis is on:
                its "consider →" cells switch this shell to Consider, so the strip has to
                live on the spine that owns the tab switch rather than inside one panel. */}
            <RoleCounterStrip
              mix={mix}
              cards={cards}
              onSeeShelf={seeShelf}
              rolesWithShelves={shelvedRoles}
              justFilled={deck.filled && autoCount > 0}
              wasCounts={wasCounts}
              labelRows={labelRows}
              // N2 (discovery R3): on Mana Balance's own switch, as gap 7 has it for `Proposed cuts →`.
              onBalanceMana={!(manaBalanceEnabled && coloredPip)
                ? undefined
                : tuningHubEnabled
                  ? () => { setView("analysis"); setHubRequest({ tool: "mana", nonce: (hubNonce.current += 1) }); }
                  : () => pressTool("mana-balance")}
              // N1 (discovery R3): a deck at its body size (98 with a partner) offers Suggested changes from a short
              // cell. It lands on the hub's tile, or with the hub off on the panel, or on the empty state when no
              // reading is held (R3 gap 8); it never runs anything.
              onSuggest={tuningEnabled && analysisEnabled && atSize
                ? () => {
                    // A hub tool left open hides the tiles: back to them first, so the tile is there to land on.
                    if (tuningHubEnabled) setHubRequest({ tool: null, nonce: (hubNonce.current += 1) });
                    pressTool("suggested-changes");
                  }
                : undefined}
              balanceMoment={atSize && coloredPip}
            />

            {/* No degraded banner here. The old one ("Synergy data offline")
                fired alongside Consider's own ("EDHREC isn't answering right
                now."), so an outage was announced twice, in two voices, and the
                copy above the tabs was on screen while reading the decklist,
                which EDHREC has nothing to do with. The claim belongs on the
                shelf that makes it. */}

            {/* The decklist and Consider as peer tabs. The desktop toolbar rides
                this row; at phone width Consider draws its own toolbar row. */}
            <BuilderTabs
              tabs={builderTabSpecs({
                built,
                suggestionCount: suggestions.length,
                gameCount: games.length,
                versionCount: versions.length,
                hasOrigin: originApart,
                analysisEnabled,
              })}
              view={view}
              onViewChange={setView}
              anchor={{ view: "analysis", ref: analysisTabRef, describedBy: analysisTabDescribedBy }}
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
                {/* ONE hover preview for the whole tab: the suggestion cards and the overview's
                    card names both borrow it rather than mount a second. */}
                <HoverPreviewProvider>
                <AnalysisPanel
                  state={profile.state}
                  opening={opening}
                  locked={lockedIds}
                  onRequest={requestAnalysis}
                  hold={hold}
                  overviewReady={synopsis.view.kind === "ready" && !synopsis.view.busy && !synopsis.view.state.stale && !!synopsis.view.state.synopsis?.content?.overview}
                  pressNote={{ analyze: analyzeNote?.text ?? null, reanalyze: reanalyzeNote?.text ?? null }}
                  pressNotePending={analysisEnabled && !synopsis.settled}
                  pressSee={analyzeNote?.see ? { label: deckNoticesCopy.check.seeWhich, onPress: openNoticesSheet } : null}
                  description={deck.intent ?? null}
                  onSaveDescription={saveDescription}
                  tuningEnabled={tuningEnabled}
                  strategy={strategy ? (
                    <StrategyBlock read={strategy} focus={strategyFocus.focus} refused={strategyFocus.refused} onPick={strategyFocus.setFocus} />
                  ) : undefined}
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
                  ledgerAvailability={ledgerAvailability}
                  onStats={statsEnabled ? openStatsAt : undefined}
                  overview={
                    synopsis.view.kind === "ready" ? (
                      <SynopsisOverview
                        state={synopsis.view.state}
                        busy={synopsis.view.busy}
                        pressed={synopsis.pressed}
                        deckName={deck.name}
                        art={findingArt}
                        readingFresh={readingFresh}
                        settled={synopsis.view.current}
                        announceReady={!quietReady}
                        onWrite={() => { setQuietReady(false); return synopsis.write(); }}
                        onRetry={(id) => { setQuietReady(false); return synopsis.retry(id); }}
                        onSeeWhich={openNoticesSheet}
                        reanalyze={{
                          onPress: requestAnalysis,
                          disabled: profile.state.kind === "loading" || built !== bodySize,
                          note: built !== bodySize ? null : reanalyzeNote?.text ?? null,
                        }}
                      />
                    ) : null
                  }
                  cuts={proposedCutsEnabled ? cutsPanel(false) : undefined}
                  mana={manaBalanceEnabled ? manaPanel : undefined}
                  hubDraws={hubDraws}
                  hub={!tuningHubEnabled ? undefined : (permits, drawn) => (
                    <TuningHub
                      // Per deck: the shell survives a move between decks, and the hub's open tool,
                      // tiles and first-read latch belong to the deck they were read for.
                      key={deck.id}
                      deckId={deck.id}
                      drawn={drawn}
                      request={hubRequest}
                      onRequestAnswered={onHubRequestAnswered}
                      onSettled={onHubSettled}
                      tools={[
                        ...(tuningEnabled
                          ? [{
                            tool: "suggested" as const,
                            panel: permits ? suggestedPanel(permits, true) : null,
                            v2: suggestedV2 ? { at: suggestedV2.at, over: suggestedV2.over, onTopOff: suggestedV2.onTopOff } : null,
                          }]
                          : []),
                        ...(manaBalanceEnabled ? [{ tool: "mana" as const, panel: manaPanel }] : []),
                        ...(proposedCutsEnabled
                          ? [{ tool: "cuts" as const, panel: cutsPanel(true), over: Math.max(0, built - bodySize), total: built + (deck.partner !== null ? 2 : 1) }]
                          : []),
                        // History is part of the hub, not a switch of its own: last, whenever the hub draws.
                        { tool: "history" as const },
                      ]}
                    />
                  )}
                  tuning={!tuningEnabled ? undefined : suggestedPanel}
                >
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
                  gameOpponents={gameOpponents}
                  opponents={socialGames ? { you: { name: deck.commander.name, deckName: deck.name, imageUri: deck.commander.imageUri ?? null } } : undefined}
                  prefill={offeredPrefill ?? undefined}
                  onPrefillSpent={spendPrefill}
                />
              </div>
            ) : view === "versions" ? (
              <div id="panel-versions" role="tabpanel" aria-labelledby="tab-versions">
                <VersionRail
                  deckId={deck.id}
                  deckName={deck.name}
                  versions={versions}
                  origin={preconOrigin}
                  // K5's row is the unlinked deck's door; a linked deck has v0 in its place.
                  foot={preconLink && !preconOrigin ? <LinkPreconRow deckId={deck.id} deckName={deck.name} picker={preconLink.picker} /> : null}
                />
              </div>
            ) : view === "consider" ? (
              <HoverPreviewProvider>
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
              </HoverPreviewProvider>
            ) : (
            <div id="panel-deck" role="tabpanel" aria-labelledby="tab-deck">
            {isEmpty ? (
              <DeckPanelContext.Provider value={deckPanel}>
              <EmptyDeckNotes
                enabled={notesEnabled}
                deckId={deck.id}
                notes={notesData}
                deckCards={[deck.commander, ...(deck.partner ? [deck.partner] : [])].map((c) => ({ oracleId: c.oracleId, name: c.name, typeLine: c.typeLine, imageUri: c.imageUri ?? null }))}
              >
              <>
              {/* §Empty Builder Mark + empty state (§Empty Builder Mark section).
                 Branches on deck.filled: a deck reached by deletion congratulates
                 the sweep; one that was never built welcomes the player. */}
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
                        style={{ color: "var(--accent-text)" }}
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
                      className="font-mono text-[11px] mt-[20px] cursor-pointer text-accent-text hover:text-accent-hover active:text-accent-mid transition-colors"
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
              {/* A commander makes tokens whether or not the list holds a card yet, so the group is drawn here
                  too, with its own preview provider (the decklist's is not mounted on this branch). */}
              <HoverPreviewProvider className="px-[16px] pb-[12px] md:px-[26px]">
                <TokensGroup />
              </HoverPreviewProvider>
              </>
              </EmptyDeckNotes>
              </DeckPanelContext.Provider>
            ) : (
              /* Task 8: Decklist body */
              /* The provider wraps the list from out here rather than from
                 inside it: `Decklist` returns three different trees, and mounted
                 within it the provider would have to be repeated in each. */
              <PendingChangeProvider value={pendingChange}>
              <LockCardsProvider value={lockCards}>
              <DeckPanelContext.Provider value={deckPanel}>
              <Decklist
              statsEnabled={statsEnabled}
              notesEnabled={notesEnabled}
              notesData={notesData}
              statsData={statsData}
              statsFocus={statsFocus}
              onStatsFocused={clearStatsFocus}
              games={games}
              versions={versions}
              onLogGame={() => setView("games")}
              mix={mix}
                deckId={deck.id}
                cards={cards}
                unresolvedRows={unresolvedRows}
                commanderOracleId={deck.commander.oracleId}
                commander={deck.commander}
                partner={deck.partner}
                deckOracleIds={deckOracleIds}
                built={built}
                bodySize={bodySize}
                spentSlots={spentSlotCards}
                filled={deck.filled}
                filter={filter}
                grouping={grouping}
                onFilterChange={changeFilter}
                onGroupingChange={setGrouping}
                onLandTool={pressTool}
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
              </DeckPanelContext.Provider>
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
                // A bar pinned over the window's foot: an open `[[` list keeps clear of it (card-tag-picker.tsx).
                data-foot-bar=""
                className={[
                  "sticky bottom-[var(--tabbar-h)] md:bottom-0 z-20 mt-auto px-[16px] pt-[10px] pb-[12px] md:px-[30px] md:py-[11px]",
                  // On a phone the bar is for the All list only (Hugh, 2026-10-12): Shopping, Notes and Stats
                  // are not places to add a card from, and a bar that came and went with a note field's focus
                  // moved the page under the reader. Decided by the panel, never by focus.
                  deckPanel[0] !== "list" || filter !== "all" ? "max-md:hidden" : "",
                  // The top-off commit bar takes this slot at phone widths. Hidden rather than
                  // unmounted, so the owned toggle keeps its setting; the query does not survive,
                  // since the press that opens the bar is outside it and clears it (`useSearchDismiss`).
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
              {...deckExportData(deck.commander, deck.partner, cards)}
              open={exportOpen}
              onClose={() => setExportOpen(false)}
            />
          )}
          {/* Inside every provider the list's rows read, plus the two the list takes from out here,
              so the sheet's rows are the list's own (`PassSheet`). The other-drafts form leaves with
              the foot segment that opens it. */}
          {passSheet && (passSheet.kind === "pass" || commitments.softClaimed > 0) && (
            <PendingChangeProvider value={pendingChange}>
              <LockCardsProvider value={lockCards}>
                <PassSheet
                  target={passSheet}
                  deckId={deck.id}
                  cards={cards}
                  passes={fillPasses}
                  bodySize={bodySize}
                  newestAsOf={newestAsOf}
                  onAnnounce={setAnnouncement}
                  // Only the sheet this callback belongs to: an Undo finishing after Done must not
                  // dismiss the sheet opened since.
                  onClose={() => setPassSheet((cur) => (cur === passSheet ? null : cur))}
                />
              </LockCardsProvider>
            </PendingChangeProvider>
          )}
          {combosSheet && nearCombos && (
            <CombosCloseSheet
              nearCombos={nearCombos}
              deckId={deck.id}
              deckName={deck.name}
              commanderOracleIds={[deck.commander.oracleId, ...(deck.partner ? [deck.partner.oracleId] : [])]}
              art={findingArt}
              onClose={() => setCombosSheet(false)}
            />
          )}
        </div>
        </LabelRowsProvider>
        </BasicCountsProvider>
      </AddOptimisticCardProvider>
      </DeckSiblingsProvider>
    </CardDetailProvider>
  );
}

// Re-export types so Task 9+ can import from this module without circular deps.
export type { BuilderShellProps };
