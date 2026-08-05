// Builder Shell — top-level client composition for /decks/[id].
// Owns: Add-panel tab state, group toggle, All|Shopping filter, mobile Add sheet, export open.
// Task 8 (decklist body), Task 9 (Add panel), Task 10 (export dialog) — leave named slots.
"use client";

import { useState, useMemo } from "react";
import type { DeckDetail } from "../../lib/decks/read";
import { statusPill } from "../../lib/decks/status";
import { shouldCelebrate } from "../../lib/decks/celebration";
import { CompletionReveal } from "./completion-reveal";
import { useCelebrated } from "./use-celebrated";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { PrimaryButton } from "@/components/ui/button";
import { BuilderSpine } from "./builder-spine";
import { RoleCounterStrip } from "./role-counter-strip";
import { DegradedBanner } from "./degraded-banner";
import { GuidedBanner } from "./guided-banner";
import { CardFan } from "../marks";
import { Crab } from "../character/crab";
import { addPanelCopy, decksBuilderCopy, shortCommanderName } from "../../lib/copy/decks-builder";
import { Decklist } from "./decklist";
import { AddPanel } from "./add-panel";
import { ExportDialog } from "./export-dialog";
import { CardDetailProvider } from "./card-detail-provider";
import { AddOptimisticCardProvider, useOptimisticDeckCards } from "./optimistic-deck";
import { deckCounts } from "../../lib/decks/grouping";

interface BuilderShellProps {
  deck: DeckDetail;
  suggestions: DeckSuggestion[];
  degraded: boolean;
  firstRun: boolean;
  commanderIdentity: string[];
}

export function BuilderShell({
  deck,
  suggestions,
  degraded,
  firstRun,
  commanderIdentity,
}: BuilderShellProps) {
  // UI state
  const [filter, setFilter] = useState<"all" | "shopping">("all");
  const [grouping, setGrouping] = useState<"type" | "role">("type");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [celebrated, markCelebrated] = useCelebrated(deck.id);

  // Every count and row below is drawn from this list rather than the server
  // props, so an add lands across the whole builder in the same frame as the
  // click. `deck.cards` remains the base React reverts to.
  const { cards, addOptimisticCard } = useOptimisticDeckCards(deck.cards);
  const counts = deckCounts(cards);
  const { built, toBuyCount } = counts;

  // The one deliberate exception. Keyed off the SERVER counts because the
  // reveal is a one-shot that burns a persisted flag — firing it on a predicted
  // 99th card that the server then rejects would spend the moment on a deck
  // that never reached 99, and there is no way to give it back.
  const showReveal = shouldCelebrate({
    status: statusPill({ built: deck.built, ownedCount: deck.ownedCount }),
    alreadyCelebrated: celebrated,
  });

  // Deliberately the SERVER list, not the optimistic one. AddPanel feeds this to
  // each row's `inDeck`, which use-deck-mutation treats as committed truth — and
  // it clears the row's error whenever that value changes, on the reasoning that
  // the server has since settled the question. Wire the optimistic list in here
  // and a failed add flips the value twice (add, then revert), the second flip
  // wiping the refusal before the user can read it. Rows still show their own
  // optimistic "✓ In deck", so nothing is lost by keeping this one committed.
  const deckOracleIds = useMemo(() => deck.cards.map((c) => c.oracleId), [deck.cards]);

  const isEmpty = built === 0;
  const commanderShortName = shortCommanderName(deck.commander.name);

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
      <AddOptimisticCardProvider value={addOptimisticCard}>
        {/* On desktop the viewport is the frame and each column scrolls inside it,
            rather than the page growing to the taller of the two. The columns are
            lists of unrelated length, so a page-level scroll leaves whichever one
            ran out first sitting above dead space. Mobile stays a single flow. */}
        <div
          className="flex flex-col md:flex-row min-h-screen md:h-screen md:min-h-0 md:overflow-hidden"
          style={{ background: "#100D0A" }}
        >
          {/* ── Left / main column ── */}
          <div className="flex-1 flex flex-col min-w-0 md:min-h-0 md:overflow-y-auto">
            {/* The 99/99 kaiju reveal — one-shot, above the builder body */}
            {showReveal && (
              <CompletionReveal
                commanderShortName={commanderShortName}
                onDismiss={markCelebrated}
                onExport={openExport}
              />
            )}

            {/* Builder Spine */}
            <BuilderSpine deck={deck} counts={counts} onExport={openExport} />

            {/* Role Counter Strip — shown when deck has cards (mid-build) or always per design */}
            <RoleCounterStrip cards={cards} />

            {/* Degraded suggestions banner */}
            {degraded && <DegradedBanner deckId={deck.id} />}

            {/* Guided first-run banner (only when firstRun === true) */}
            {firstRun && <GuidedBanner commanderName={deck.commander.name} />}

            {/* ── Decklist body — Task 8 placeholder ── */}
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
                built={built}
                toBuyCount={toBuyCount}
                filter={filter}
                grouping={grouping}
                onFilterChange={setFilter}
                onGroupingChange={setGrouping}
              />
            )}

            {/* §"+ Add cards" sticky footer button (mobile mid-build) */}
            {!isEmpty && (
              <div
                className="md:hidden sticky bottom-0 px-[16px] py-[10px]"
                style={{ background: "#100D0A", borderTop: "1px solid #2A241D" }}
              >
                <PrimaryButton
                  onClick={() => setSheetOpen(true)}
                  className="w-full text-[15px] py-[13px]"
                >
                  + Add cards
                </PrimaryButton>
              </div>
            )}
          </div>

          {/* ── Right column — Add panel (Task 9) ── */}
          {/* Desktop: always visible right column */}
          <aside
            className="hidden md:flex flex-col flex-none min-h-0"
            style={{
              width: 340,
              background: "#181410",
              borderLeft: "1px solid #2A241D",
            }}
          >
            <AddPanel
              deckId={deck.id}
              commanderIdentity={commanderIdentity}
              suggestions={suggestions}
              degraded={degraded}
              deckOracleIds={deckOracleIds}
              variant="column"
            />
          </aside>

          {/* Mobile bottom sheet (mid-build and empty) — AddPanel variant="sheet" */}
          {sheetOpen && (
            <AddPanel
              deckId={deck.id}
              commanderIdentity={commanderIdentity}
              suggestions={suggestions}
              degraded={degraded}
              deckOracleIds={deckOracleIds}
              variant="sheet"
              onCloseSheet={() => setSheetOpen(false)}
            />
          )}

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
