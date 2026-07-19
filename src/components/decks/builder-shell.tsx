// Builder Shell — top-level client composition for /decks/[id].
// Owns: Add-panel tab state, group toggle, All|Shopping filter, mobile Add sheet, export open.
// Task 8 (decklist body), Task 9 (Add panel), Task 10 (export dialog) — leave named slots.
"use client";

import { useState, useMemo } from "react";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { BuilderSpine } from "./builder-spine";
import { RoleCounterStrip } from "./role-counter-strip";
import { DegradedBanner } from "./degraded-banner";
import { GuidedBanner } from "./guided-banner";
import { CardFan } from "../marks";
import { Decklist } from "./decklist";
import { AddPanel } from "./add-panel";
import { ExportDialog } from "./export-dialog";

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

  // Derive the oracle IDs already in the deck (client-side, no round-trip);
  // AddPanel builds its lookup Set from this list.
  const deckOracleIds = useMemo(
    () => deck.cards.map((c) => c.oracleId),
    [deck.cards],
  );

  const isEmpty = deck.built === 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: "#100D0A" }}>
      {/* ── Left / main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Builder Spine */}
        <BuilderSpine deck={deck} onExport={() => setExportOpen(true)} />

        {/* Role Counter Strip — shown when deck has cards (mid-build) or always per design */}
        <RoleCounterStrip cards={deck.cards} />

        {/* Degraded suggestions banner */}
        {degraded && <DegradedBanner deckId={deck.id} />}

        {/* Guided first-run banner (only when firstRun === true) */}
        {firstRun && <GuidedBanner commanderName={deck.commander.name} />}

        {/* ── Decklist body — Task 8 placeholder ── */}
        {isEmpty ? (
          /* §Empty Builder Mark + empty state (§Empty Builder Mark section) */
          <section className="flex flex-col items-center justify-center text-center px-[16px] py-[40px] md:py-[60px]">
            {/* §Mark container */}
            <div
              className="relative md:hidden mb-[20px]"
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

            {/* Desktop mark: §Mark container desktop 100-110 × 110-120; constrain to 104×112 */}
            <div
              className="hidden md:block mb-[22px] overflow-hidden"
              style={{ width: 104, height: 112 }}
              aria-hidden
            >
              {/* scale(104/120 ≈ 0.867) shrinks the 120×130 CardFan into the 104×112 target */}
              <CardFan
                variant="decks-desktop"
                className="origin-top-left scale-[0.867]"
              />
            </div>

            {/* §Empty state heading */}
            <h2
              className="font-display font-bold text-[21px] md:text-[24px] m-0"
              style={{ color: "#EDE6D8" }}
            >
              Your deck is empty
            </h2>

            {/* §Empty state body */}
            <p
              className="text-[13.5px] md:text-[14px] leading-[1.6] md:leading-[1.65] mt-[10px] md:mt-[12px] md:max-w-[440px]"
              style={{ color: "#C6B79A" }}
            >
              Add cards from your suggestions or search your collection to build your 99.
            </p>

            {/* §Empty state role hint (desktop) */}
            <p
              className="hidden md:block font-mono text-[11px] mt-[20px]"
              style={{ color: "#8E8269" }}
            >
              Try filling your ramp, draw, removal, and wipe slots first.
            </p>

            {/* §"Add your first card" CTA button (mobile empty) */}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="md:hidden font-sans font-semibold text-[15px] rounded-[8px] px-[26px] py-[13px] mt-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
              style={{
                color: "#14110E",
                background: "#C9A24B",
                border: "none",
              }}
            >
              Add your first card
            </button>
          </section>
        ) : (
          /* Task 8: Decklist body */
          <Decklist
            deckId={deck.id}
            cards={deck.cards}
            built={deck.built}
            toBuyCount={deck.toBuyCount}
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
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="w-full font-sans font-semibold text-[15px] rounded-[8px] py-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
              style={{
                color: "#14110E",
                background: "#C9A24B",
                border: "none",
              }}
            >
              + Add cards
            </button>
          </div>
        )}
      </div>

      {/* ── Right column — Add panel (Task 9) ── */}
      {/* Desktop: always visible right column */}
      <aside
        className="hidden md:flex flex-col flex-none"
        style={{
          width: 340,
          background: "#181410",
          borderLeft: "1px solid #2A241D",
          minHeight: "100vh",
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
          decklistCards={deck.cards.map((c) => ({ name: c.name, quantity: c.quantity }))}
          shoppingCards={deck.cards
            .filter((c) => !c.owned)
            .map((c) => ({ name: c.name, role: c.role }))}
          open={exportOpen}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

// Re-export types so Task 9+ can import from this module without circular deps.
export type { BuilderShellProps };
