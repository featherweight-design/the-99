// Builder Shell — top-level client composition for /decks/[id].
// Owns: deck|consider view, group toggle, All|Shopping filter, Consider sort, export open.
// Discovery is a peer view of the decklist rather than a rail or a sheet, so the
// coverage strip stays above both and the quick-add bar is pinned under both.
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { DeckDetail } from "../../lib/decks/read";
import { statusPill } from "../../lib/decks/status";
import { availabilityState } from "../../lib/decks/availability";
import { shouldCelebrate } from "../../lib/decks/celebration";
import { CompletionReveal } from "./completion-reveal";
import { useCelebrated } from "./use-celebrated";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { BuilderSpine } from "./builder-spine";
import { RoleCounterStrip } from "./role-counter-strip";
import { ArrivalStrip } from "./arrival-strip";
import { UnresolvedBanner } from "./unresolved-banner";
import { GuidedBanner } from "./guided-banner";
import { CardFan } from "../marks";
import { Crab } from "../character/crab";
import { addPanelCopy, shortCommanderName } from "../../lib/copy/decks-builder";
import { Decklist } from "./decklist";
import { BuilderTabs, type BuilderView } from "./builder-tabs";
import { ConsiderPanel, rolesWithShelves } from "./consider-panel";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";
import { QuickAddBar } from "./quick-add-bar";
import { ExportDialog } from "./export-dialog";
import { CardDetailProvider } from "./card-detail-provider";
import { AddOptimisticCardProvider, useOptimisticDeckCards } from "./optimistic-deck";
import { MutationError } from "./mutation-error";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { deckCounts, unresolvedCardCount, type DeckDetailCard } from "../../lib/decks/grouping";
import { computeRoleCounts, RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import { useIsDesktop } from "../ui/use-is-desktop";

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
}

export function BuilderShell({
  deck,
  suggestions,
  degraded,
  firstRun,
  commanderIdentity,
  arrivedFromImport,
}: BuilderShellProps) {
  // UI state
  const [filter, setFilter] = useState<"all" | "shopping">("all");
  const [grouping, setGrouping] = useState<"type" | "role">("type");
  const [view, setView] = useState<BuilderView>("deck");
  const [sort, setSort] = useState<SortKey>("gaps");
  const [exportOpen, setExportOpen] = useState(false);
  const [unresolvedExpanded, setUnresolvedExpanded] = useState(false);
  const isDesktop = useIsDesktop();

  const [celebrated, markCelebrated] = useCelebrated(deck.id);

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
  } = useOptimisticDeckCards(deck.cards, deck.unresolvedRows);
  const counts = deckCounts(cards, unresolvedCount);
  const { built, toBuyCount } = counts;

  // The one deliberate exception. Keyed off the SERVER counts because the
  // reveal is a one-shot that burns a persisted flag — firing it on a predicted
  // 99th card that the server then rejects would spend the moment on a deck
  // that never reached 99, and there is no way to give it back.
  const serverStatus = statusPill({
    built: deck.built,
    ownedCount: deck.ownedCount,
    unresolvedCount: unresolvedCardCount(deck.unresolvedRows),
  });

  const showReveal = shouldCelebrate({
    status: serverStatus,
    alreadyCelebrated: celebrated,
    arrivedFromImport,
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
        // say "on 0 finished lists" — the same hole `markerAria` guards at
        // availability-marker.ts:107.
        lone =
          a.hardDeckNames.length > 0
            ? { name: card.name, deckCount: a.hardDeckNames.length, ownedQty: a.owned }
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

  // Unresolved rows keep the builder out of the empty state: a deck whose every
  // line failed to match has nothing built, but it has plenty to show and act on.
  // A spent slot does the same — emptying the deck by removing its last card
  // must not swap the undo row out for "a king with no army".
  const isEmpty = built === 0 && unresolvedRows.length === 0 && !spentSlot;
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

  // Every route into the export dialog dismisses the reveal, not just the one
  // inside it — the user has acted on the moment, so leaving the band standing
  // behind the dialog is noise. Only while the band is actually up, though:
  // the spine's Export is live from the first card on, and marking there would
  // burn the one-shot flag long before the deck ever reaches 99/99.
  const openExport = () => {
    if (showReveal) markCelebrated();
    setExportOpen(true);
  };

  return (
    // One card-detail modal for every surface below — spine, decklist, suggestions, search.
    <CardDetailProvider>
      <AddOptimisticCardProvider value={deckEdits}>
        {/* One column at both widths now that the rail is gone. Desktop still
            makes the viewport the frame so the quick-add bar can sit against the
            bottom edge rather than at the end of a long page scroll. */}
        <div
          className="flex flex-col min-h-screen md:h-screen md:min-h-0 md:overflow-hidden"
          style={{ background: "#100D0A" }}
        >
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </span>

          <div className="flex-1 flex flex-col min-w-0 md:min-h-0 md:overflow-y-auto">
            {/* The 99/99 kaiju reveal — one-shot, above the builder body */}
            {showReveal && (
              <CompletionReveal
                commanderShortName={commanderShortName}
                onDismiss={markCelebrated}
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
            <BuilderSpine deck={deck} counts={counts} onExport={openExport} {...commitments} />

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
              view={view}
              onViewChange={setView}
              deckCount={built}
              considerCount={suggestions.length}
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

            {view === "consider" ? (
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
              />
            ) : (
            <div id="panel-deck" role="tabpanel" aria-labelledby="tab-deck">
            {isEmpty ? (
              /* §Empty Builder Mark + empty state (§Empty Builder Mark section) */
              <section className="flex flex-col items-center justify-center text-center px-[16px] py-[40px] md:py-[60px] bg-[radial-gradient(400px_220px_at_50%_80%,rgba(201,162,75,0.07),transparent_70%)]">
                {/* §Mark container (mobile). The richness mock composes the crab
                    and the card mark as one flex row — crab first, gap 16px,
                    baselines aligned — so each breakpoint's existing mark keeps
                    its own geometry and gains a crab sized for it. */}
                <div className="md:hidden mb-[20px] flex items-end justify-center gap-[16px]">
                  <Crab size={72} className="flex-none" />
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
                        background: "#221D16",
                        border: "1.5px solid #3A3229",
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
                        background: "#2A241D",
                        border: "1.5px solid #4A4033",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    {/* Front card: tilted right, brass-outlined, "99" */}
                    <div
                      className="absolute rounded-[8px] flex items-center justify-center"
                      style={{
                        left: "50%",
                        top: "50%",
                        width: 48,
                        height: 68,
                        background: "#3E3020",
                        border: "1.5px solid #C9A24B",
                        transform: "translate(-50%, -50%) rotate(15deg) translateX(18px)",
                      }}
                    >
                      {/* §Front card — "99" numeral */}
                      <span
                        className="font-display font-extrabold text-[18px]"
                        style={{ color: "#C9A24B" }}
                      >
                        99
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop mark: §Mark container desktop 100-110 × 110-120; constrain to 104×112 */}
                <div className="hidden md:flex mb-[22px] items-end justify-center gap-[16px]">
                  <Crab size={88} className="flex-none" />
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

                {/* §Empty state heading */}
                <h2
                  className="font-display font-bold text-[21px] md:text-[24px] m-0"
                  style={{ color: "#EDE6D8" }}
                >
                  {addPanelCopy.builderEmpty.heading}
                </h2>

                {/* §Empty state body. One string at both widths now that both
                    point at the same two entrances. */}
                <p
                  className="text-[13.5px] leading-[1.6] mt-[10px] md:text-[14px] md:leading-[1.65] md:mt-[12px] md:max-w-[440px]"
                  style={{ color: "#C6B79A" }}
                >
                  {addPanelCopy.builderEmpty.caption(commanderShortName)}
                </p>

                {/* §Empty state role hint, now at both widths — mobile spent
                    that vertical budget on the deleted CTA. */}
                <p
                  className="font-mono text-[11px] mt-[20px]"
                  style={{ color: "#8E8269" }}
                >
                  {addPanelCopy.builderEmpty.roleHint}
                </p>
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
                toBuyCount={toBuyCount}
                spentSlot={spentSlot}
                filter={filter}
                grouping={grouping}
                onFilterChange={setFilter}
                onGroupingChange={setGrouping}
                onUnresolvedExpandedChange={setUnresolvedExpanded}
              />
            )}
            </div>
            )}

            {/* Quick add is chrome, not a mode: pinned under both views at both
                widths, and it takes the slot the mobile "+ Add cards" footer
                used to hold. `mt-auto` keeps it at the foot of a short column
                rather than floating under a two-line empty state. */}
            {/* `bottom-[80px]` at phone width, not `bottom-0`: the shell's
                tab bar is `fixed` and 80px tall, and the `pb-[80px]` main
                carries to reserve it does nothing to a sticky element, which
                pins to the scrollport edge and so sat underneath it. */}
            {/* The phone drops the bar entirely while a resolution expander is
                open: two comboboxes on one narrow screen means the keyboard
                covers one of them and `↵` is ambiguous. Desktop has room for
                both, so it keeps the bar. */}
            {(isDesktop || !unresolvedExpanded) && (
              <div
                className="sticky bottom-[80px] md:bottom-0 mt-auto px-[16px] pt-[10px] pb-[12px] md:px-[30px] md:py-[11px]"
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
              shoppingCards={cards
                .filter((c) => !c.owned)
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
