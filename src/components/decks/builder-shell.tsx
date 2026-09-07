// Builder Shell — top-level client composition for /decks/[id].
// Owns: deck|consider view, group toggle, All|Shopping filter, Consider sort, export open.
// Discovery is a peer view of the decklist rather than a rail or a sheet, so the
// coverage strip stays above both and the quick-add bar is pinned under both.
"use client";

import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from "react";
import type { DeckDetail } from "../../lib/decks/read";
import { statusPill } from "../../lib/decks/status";
import { availabilityState, hardDecks } from "../../lib/decks/availability";
import { fillCompletedKey, shouldCelebrate } from "../../lib/decks/celebration";
import { isShoppingCard } from "../../lib/decks/shopping";
import { CompletionReveal } from "./completion-reveal";
import { useCelebrated } from "./use-celebrated";
import { useLocalFlag } from "./use-local-flag";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { BuilderSpine } from "./builder-spine";
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
import { ConsiderPanel, rolesWithShelves } from "./consider-panel";
import { GamesPanel } from "./games-panel";
import { gameLogCopy } from "../../lib/copy/game-log";
// Types only: `games.ts` reaches for the database, and a value import from a
// "use client" module would drag drizzle into the browser bundle.
import type { DeckGame, GameSummary } from "../../lib/decks/games";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";
import { QuickAddBar } from "./quick-add-bar";
import { ExportDialog } from "./export-dialog";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { AddOptimisticCardProvider, useOptimisticDeckCards } from "./optimistic-deck";
import { MutationError } from "./mutation-error";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { ProvenanceLine, FillFailedBannerConnected } from "./provenance-line";
import { LastSlotsStrip } from "./last-slots-strip";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import { LAND_TARGET } from "../../lib/decks/suggest";
import { cardCopies, deckCounts, unresolvedCardCount, type DeckDetailCard } from "../../lib/decks/grouping";
import { computeRoleCounts, RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import { useIsDesktop } from "../ui/use-is-desktop";
import type { ProvenanceForm } from "../../lib/decks/price";

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
  deck: DeckDetail;
  suggestions: DeckSuggestion[];
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
  /** The newest `as_of` in `printing_prices`. Every price's liveness is a
      comparison against this one scalar, so it travels rather than a per-card
      flag. Null when the read failed or the table is empty — every tag stays
      bare. */
  newestAsOf?: Date | null;
  /** Built on the server by `provenanceForm`, never in the browser: it compares
      against a clock, and a second call could flip `behind` at hydration. */
  provenance?: ProvenanceForm | null;
  /** Owned synergy cards planLastSlots would place into the open slots, derived
      once by the page route. Zero means the owned fill control is absent. */
  ownedCandidates?: number;
  /** Unowned synergy cards planLastSlots would add beyond the owned ones.
      Zero means the top-up control is absent. */
  unownedCandidates?: number;
  /** Every game logged against this deck, newest first. */
  games?: DeckGame[];
  /** Aggregated on the server — `summarizeGames` is pure, so running it here
      would only ship the work to the browser. */
  gameSummary?: GameSummary;
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
  deck,
  suggestions,
  degraded,
  firstRun,
  commanderIdentity,
  arrivedFromImport,
  updateArrival = null,
  shoppingFigures = {},
  newestAsOf = null,
  provenance = null,
  ownedCandidates = 0,
  unownedCandidates = 0,
  games = [],
  gameSummary = NO_GAMES,
}: BuilderShellProps) {
  // UI state
  const [filter, setFilter] = useState<"all" | "shopping">("all");
  const [grouping, setGrouping] = useState<"type" | "role">("type");
  const [view, setView] = useState<BuilderView>("deck");
  const [sort, setSort] = useState<SortKey>("gaps");
  const [exportOpen, setExportOpen] = useState(false);
  const [unresolvedExpanded, setUnresolvedExpanded] = useState(false);
  const isDesktop = useIsDesktop();

  const [celebrated, markCelebrated, celebratedHere] = useCelebrated(deck.id);
  const [completedByFill, markCompletedByFill, , clearCompletedByFill] = useLocalFlag(fillCompletedKey(deck.id));

  // True while LastSlotsStrip has a fill write in flight (A or B). Used to
  // disable control C (ClearAutoButton) during either fill per design table
  // state 3 / state 8.
  const [fillInflight, setFillInflight] = useState(false);

  // Every count and row below is drawn from this list rather than the server
  // props, so an add lands across the whole builder in the same frame as the
  // click. `deck.cards` remains the base React reverts to.
  const {
    cards,
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
  const counts = deckCounts(cards, unresolvedCount);
  const { built } = counts;

  // The one deliberate exception. Keyed off the SERVER counts because the
  // reveal is a one-shot that burns a persisted flag — firing it on a predicted
  // 99th card that the server then rejects would spend the moment on a deck
  // that never reached 99, and there is no way to give it back.
  const serverStatus = statusPill({
    built: deck.built,
    ownedCount: deck.ownedCount,
    unresolvedCount: unresolvedCardCount(deck.unresolvedRows),
  });

  // The flag is a receipt for a deck a fill completed, and the rule it serves is
  // that the reveal belongs to the player who placed the last card. Once the deck
  // drops back out of Complete the fill is no longer what completed it — the same
  // reasoning the sweep already applies — so the suppression is retired and a
  // player who builds back to 99 by hand can earn the reveal. Left standing, it
  // would outlive the completion it describes and silence a hand-built 99 the
  // fill had no part in.
  useEffect(() => {
    if (completedByFill && serverStatus !== "Complete") clearCompletedByFill();
  }, [completedByFill, serverStatus, clearCompletedByFill]);

  const revealDue = shouldCelebrate({
    status: serverStatus,
    alreadyCelebrated: celebrated,
    arrivedFromImport,
    completedByFill,
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
        // counts finished lists out loud, and with an empty name array it would
        // say "on 0 finished lists" — the same hole `markerAria` guards.
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
      // `soft` counts claims by OTHER unfinished decks, so a deck of this
      // player's own reaching 99 leaves those claims standing. Read through
      // `statusPill` rather than a hand-rolled `built < 99`, so there is one
      // maturity threshold on this page and not two.
      softClaimed: serverStatus === "Draft" || serverStatus === "Building" ? softClaimed : 0,
      overCommittedCard: overCommitted === 1 ? lone : null,
    };
  }, [deck.cards, serverStatus]);

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
  // calling addOptimisticCard directly.
  const [announcement, setAnnouncement] = useState("");
  // Composed from the pre-add list plus this card. `useOptimistic` state is not
  // readable synchronously here, and reading it a render later would announce
  // the previous add.
  const announceAdd = useCallback(
    (card: Parameters<typeof addOptimisticCard>[0]) => {
      addOptimisticCard(card);
      const before = cards;
      const nextBuilt = deckCounts(before).built + card.quantity;
      const mix = RECOMMENDED_MIX[card.role as MixRole] as
        | (typeof RECOMMENDED_MIX)[MixRole]
        | undefined;
      setAnnouncement(
        mix
          ? addPanelCopy.announce.added(
              card.name,
              nextBuilt,
              mix.label,
              computeRoleCounts(before)[card.role as MixRole] + card.quantity,
              mix.target,
            )
          : addPanelCopy.announce.addedNoRole(card.name, nextBuilt),
      );
    },
    [addOptimisticCard, cards],
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
        addPanelCopy.undo.announceRemoved(card.name, deckCounts(cards).built - 1),
      );
    },
    [cards],
  );
  const removeCard = useCallback(
    (card: DeckDetailCard) => removeOptimisticCard(card.oracleId),
    [removeOptimisticCard],
  );

  const announceUndo = useCallback(
    (card: DeckDetailCard) => {
      setAnnouncement(
        addPanelCopy.undo.announceUndone(card.name, deckCounts(cards).built + card.quantity),
      );
    },
    [cards],
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

  const handleClearAuto = useCallback(() => {
    if (sweepPending) return;
    startSweep(async () => {
      setAutoError(null);
      // One edit, not a loop of removals: the server deletes each auto row
      // whole, while `removeOptimisticCard` takes off a single copy — which
      // would leave 36 of the fill's 37 basics on screen until revalidation.
      sweepOptimisticAuto();
      try {
        const removed = await clearAutoCards(deck.id);
        setSweptRows(removed);
        // The fill-suppression flag is a receipt for a deck completed by fill.
        // After a sweep the fill is no longer what completed it, so a player who
        // rebuilds to 99 by hand can earn the reveal.
        clearCompletedByFill();
        const remaining = deckCounts(cards.filter((c) => !c.auto)).built;
        const removedCount = removed.reduce((n, r) => n + r.quantity, 0);
        setAnnouncement(
          recommendationsCopy.auto.sweptAnnounce(String(removedCount), builtFragment(remaining)),
        );
      } catch {
        // No explicit rollback: the transition ends here and React drops the
        // predictions with it, putting the rows back from the server list.
        setAutoError(recommendationsCopy.auto.sweepFailed);
      }
    });
  }, [sweepPending, cards, deck.id, sweepOptimisticAuto, clearCompletedByFill]);

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
          builtFragment(deckCounts(cards).built + restored),
        ),
      );
      setSweptRows(null);
    } catch {
      // Keep the receipt so Undo stays reachable — the rows are still gone, so
      // the sweep's "the deck is unchanged" would be the wrong action and false.
      setAutoError(recommendationsCopy.auto.restoreFailed);
    }
  }, [sweptRows, deck.id, cards]);

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

  // The one-shot is spent by the band appearing, not by the user dismissing it.
  // Scrolling past is the commonest way to leave a page, and "Complete" is a
  // derived status that reads true forever, so while the flag burned only on an
  // explicit dismiss the reveal fired again on every visit to a finished deck.
  //
  // Burning it makes `revealDue` false in the same frame, so `celebratedHere`
  // — "this visit is the one that spent it" — holds the band up for the rest of
  // the visit.
  useEffect(() => {
    if (revealDue) markCelebrated();
  }, [revealDue, markCelebrated]);

  const [revealDismissed, setRevealDismissed] = useState(false);
  const revealOpen = (revealDue || celebratedHere) && !revealDismissed;

  // Every route into the export dialog closes the reveal, not just the one
  // inside it — the user has acted on the moment, so leaving the band standing
  // behind the dialog is noise. Only while it is actually showing, though: an
  // export from a half-built deck would otherwise spend the dismissal in
  // advance and swallow the reveal when that same visit reaches 99.
  const openExport = () => {
    if (revealOpen) setRevealDismissed(true);
    setExportOpen(true);
  };

  return (
    // One card-detail modal for every surface below — spine, decklist, suggestions, search.
    <CardDetailProvider>
      <AddOptimisticCardProvider value={deckEdits}>
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
            {/* The 99/99 reveal — one-shot, above the builder body */}
            {revealOpen && (
              <CompletionReveal
                commanderShortName={commanderShortName}
                onDismiss={() => setRevealDismissed(true)}
                onExport={openExport}
              />
            )}

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
              counts={counts}
              onExport={openExport}
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
                      setFilter("shopping");
                    }
              }
            />

            {/* Fill provenance line — tells the player where the auto cards
                came from. Leaves when the last auto card does (autoCount
                drives it off the optimistic list). Not shown during a first
                run because the deck is still in-flight then. */}
            {autoCount > 0 && !firstRun && (() => {
              const autoCards = cards.filter((c) => c.auto);
              const filledCount = cardCopies(autoCards);
              const boughtCount = cardCopies(autoCards.filter((c) => !c.owned));
              // The line reads "we filled N — the other M are yours", so N and M
              // have to close at 99: measuring M against `built` would drop the
              // cards the player kept or added out of the sentence entirely.
              // "Yours" covers both — a kept card and an empty slot are equally
              // the player's, and the spine carries the authoritative built/open
              // split for anyone asking how much room is actually left.
              const openCount = Math.max(0, 99 - filledCount);
              // Detect a role shortfall: compare the auto cards' role tally to
              // ROLE_TARGETS, and the lands to LAND_TARGET — a mana base that
              // missed its target is a shortfall the line has copy for, and
              // leaving it out let the commonest one of all go unnamed.
              // Land comes last, the order buildFillPlan reports shortfalls in.
              const roleCounts = computeRoleCounts(autoCards);
              const shortRole =
                (["ramp", "draw", "removal", "wipes"] as const).find(
                  (r) => roleCounts[r] < ROLE_TARGETS[r],
                ) ?? (roleCounts.land < LAND_TARGET ? ("land" as const) : undefined);
              return (
                <>
                  <div className="md:hidden">
                    <ProvenanceLine
                      cards={cards}
                      filled={filledCount}
                      bought={boughtCount}
                      open={openCount}
                      shortRole={shortRole}
                      width="phone"
                    />
                  </div>
                  <div className="hidden md:block">
                    <ProvenanceLine
                      cards={cards}
                      filled={filledCount}
                      bought={boughtCount}
                      open={openCount}
                      shortRole={shortRole}
                      width="desktop"
                    />
                  </div>
                </>
              );
            })()}

            {/* Last-31 strip — shown when the deck still has open slots and
                the commander's EDHREC support list has cards to offer. Unmounts
                as a unit at 0 open slots. Mounted once: unlike ProvenanceLine,
                which uses a `width` prop to branch conditional non-interactive
                content and therefore needs two mounts, the strip uses responsive
                Tailwind classes for all width-dependent elements (caption text,
                the ⓘ disc, the shortfall border-radius). Interactive controls
                A and B appear exactly once in the DOM. */}
            {(ownedCandidates > 0 || unownedCandidates > 0) && (
              <LastSlotsStrip
                deckId={deck.id}
                openSlots={99 - built}
                ownedCandidates={ownedCandidates}
                unownedCandidates={unownedCandidates}
                commanderShortName={commanderShortName}
                onAnnounce={setAnnouncement}
                onCompletedByFill={markCompletedByFill}
                onInflight={setFillInflight}
              />
            )}

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

            {/* Above the coverage strip and the tabs, because what it says is
                that both of them are short by this many lines. Not gated on
                arrival: the lines stay unresolved across visits, and so does
                the explanation of why the counts do not add up. */}
            <UnresolvedBanner count={unresolvedRows.length} onTakeALook={seeUnresolved} />

            {/* Role Counter Strip — shown when deck has cards (mid-build) or always per design */}
            <RoleCounterStrip
              cards={cards}
              onSeeShelf={seeShelf}
              rolesWithShelves={shelvedRoles}
              justFilled={deck.filled && autoCount > 0}
            />

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
              tabs={[
                {
                  id: "deck",
                  label: addPanelCopy.tabs.deck,
                  count: built,
                  accessibleName: addPanelCopy.tabs.deckAria(built),
                },
                {
                  id: "consider",
                  label: addPanelCopy.tabs.consider,
                  count: suggestions.length,
                  accessibleName: addPanelCopy.tabs.considerAria(suggestions.length),
                },
                {
                  id: "games",
                  label: gameLogCopy.tab.label,
                  // Omitted rather than zero: a tab reading "Games · 0"
                  // advertises its own emptiness.
                  count: games.length > 0 ? games.length : undefined,
                  accessibleName:
                    games.length > 0
                      ? gameLogCopy.tab.aria(String(games.length))
                      : gameLogCopy.tab.ariaNone,
                },
              ]}
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

            {view === "games" ? (
              <div id="panel-games" role="tabpanel" aria-labelledby="tab-games">
                <GamesPanel deckId={deck.id} games={games} summary={gameSummary} />
              </div>
            ) : view === "consider" ? (
              <ConsiderPanel
                deckId={deck.id}
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
              <Decklist
                deckId={deck.id}
                cards={cards}
                unresolvedRows={unresolvedRows}
                commanderOracleId={deck.commander.oracleId}
                deckOracleIds={deckOracleIds}
                built={built}
                spentSlot={spentSlot}
                filled={deck.filled}
                filter={filter}
                grouping={grouping}
                onFilterChange={setFilter}
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
              />
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
                className="sticky bottom-[var(--tabbar-h)] md:bottom-0 z-20 mt-auto px-[16px] pt-[10px] pb-[12px] md:px-[30px] md:py-[11px]"
                style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}
              >
                <QuickAddBar
                  deckId={deck.id}
                  commanderIdentity={commanderIdentity}
                  deckOracleIds={deckOracleIds}
                  commanderShortName={commanderShortName}
                  commanderOracleId={deck.commander.oracleId}
                />
              </div>
            )}
          </div>

          {/* Export dialog — Task 10 */}
          {exportOpen && (
            <ExportDialog
              deckName={deck.name}
              commanderName={deck.commander.name}
              decklistCards={cards.map((c) => ({ name: c.name, quantity: c.quantity }))}
              // The Shopping filter's own predicate, not a second `!owned` list.
              // The two diverged: this one carried the unowned basics the filter
              // refuses to show and dropped the spoken-for cards it puts front
              // and centre, so the buy link under it bought a basket the player
              // never saw.
              shoppingCards={cards
                .filter(isShoppingCard)
                .map((c) => ({ name: c.name, role: c.role, quantity: c.quantity }))}
              open={exportOpen}
              onClose={() => setExportOpen(false)}
            />
          )}
        </div>
      </AddOptimisticCardProvider>
    </CardDetailProvider>
  );
}

// Re-export types so Task 9+ can import from this module without circular deps.
export type { BuilderShellProps };
