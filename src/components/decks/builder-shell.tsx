// Builder Shell — top-level client composition for /decks/[id].
// Owns: Add-panel tab state, group toggle, All|Shopping filter, mobile Add sheet, export open.
// Task 8 (decklist body), Task 9 (Add panel), Task 10 (export dialog) — leave named slots.
"use client";

import { useState } from "react";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { BuilderSpine } from "./builder-spine";
import { RoleCounterStrip } from "./role-counter-strip";
import { DegradedBanner } from "./degraded-banner";
import { GuidedBanner } from "./guided-banner";
import { CardFan } from "../marks";

interface BuilderShellProps {
  deck: DeckDetail;
  suggestions: DeckSuggestion[];
  degraded: boolean;
  firstRun: boolean;
  allDecksCount: number;
  commanderIdentity: string[];
}

export function BuilderShell({
  deck,
  suggestions: _suggestions,
  degraded,
  firstRun,
  commanderIdentity,
}: BuilderShellProps) {
  // UI state
  const [tab, setTab] = useState<"suggestions" | "search">("suggestions");
  const [filter, setFilter] = useState<"all" | "shopping">("all");
  const [grouping, setGrouping] = useState<"type" | "role">("type");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Suppress unused warnings in skeleton — these will be consumed by Task 8/9/10 slots.
  void tab; void filter; void grouping; void sheetOpen; void commanderIdentity;
  // _suggestions will be passed to the Task 9 Add panel slot.
  void _suggestions;

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
              className="relative mb-[20px] md:mb-[22px]"
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

            {/* Desktop mark (larger) */}
            <div className="hidden md:block mb-[22px]" aria-hidden>
              <CardFan variant="decks-desktop" />
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
          /* Task 8: Decklist body placeholder */
          <div className="flex-1 px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
            {/* Filter + group toggle — Task 8 */}
            <div
              className="flex items-center gap-[7px] md:gap-[10px] pb-[9px] md:pb-[10px] mb-[8px]"
              style={{ borderBottom: "1px solid #2A241D" }}
            >
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="font-sans font-semibold text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                style={{
                  color: filter === "all" ? "#14110E" : "#8E8269",
                  background: filter === "all" ? "#C9A24B" : "transparent",
                  border: filter === "all" ? "none" : "1px solid #3A3229",
                }}
              >
                All {deck.built}
              </button>
              <button
                type="button"
                onClick={() => setFilter("shopping")}
                className="font-sans font-medium text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                style={{
                  color: filter === "shopping" ? "#14110E" : "#E0913C",
                  background: filter === "shopping" ? "#C9A24B" : "transparent",
                  border: filter === "shopping" ? "none" : "1px solid #4A3A24",
                }}
              >
                Shopping {deck.toBuyCount}
              </button>
              <div className="ml-auto flex items-center gap-[7px] md:gap-[10px]">
                <button
                  type="button"
                  onClick={() => setGrouping("type")}
                  className="font-sans font-medium text-[12px] md:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                  style={{ color: grouping === "type" ? "#C9A24B" : "#8E8269" }}
                >
                  By type
                </button>
                <button
                  type="button"
                  onClick={() => setGrouping("role")}
                  className="font-sans font-medium text-[12px] md:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                  style={{ color: grouping === "role" ? "#C9A24B" : "#8E8269" }}
                >
                  By role
                </button>
              </div>
            </div>

            {/* Task 8: Decklist rows placeholder */}
            <p className="font-mono text-[11px] text-center py-[20px]" style={{ color: "#6E6353" }}>
              [Decklist — Task 8]
            </p>
          </div>
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

      {/* ── Right column — Add panel (Task 9 placeholder) ── */}
      {/* Desktop: always visible right column; Mobile: bottom sheet (when sheetOpen) */}
      <aside
        className="hidden md:flex flex-col flex-none w-[340px] xl:w-[380px]"
        style={{
          background: "#181410",
          borderLeft: "1px solid #2A241D",
          minHeight: "100vh",
        }}
      >
        {/* Tab bar */}
        <div
          className="flex items-center gap-[0px]"
          style={{ borderBottom: "1px solid #2A241D" }}
        >
          {(["suggestions", "search"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 font-mono text-[11px] uppercase tracking-[0.1em] px-[16px] py-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
              style={{
                color: tab === t ? "#C9A24B" : "#8E8269",
                borderBottom: tab === t ? "2px solid #C9A24B" : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? "#C9A24B" : "transparent",
              }}
            >
              {t === "suggestions" ? "Suggestions" : "Search"}
            </button>
          ))}
        </div>

        {/* Task 9: Add panel content placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-[11px]" style={{ color: "#6E6353" }}>
            [Add panel — Task 9]
          </p>
        </div>
      </aside>

      {/* Mobile bottom sheet (mid-build) — Task 9 placeholder */}
      {sheetOpen && !isEmpty && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "rgba(8,6,4,0.60)" }}
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          {/* Sheet */}
          <div
            className="md:hidden fixed left-0 right-0 bottom-0 z-50 flex flex-col"
            style={{
              height: 520,
              background: "#1A160F",
              borderTop: "1px solid #3A3229",
              borderRadius: "22px 22px 0 0",
              boxShadow: "0 -20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center px-[16px] pt-[14px] pb-[10px]">
              <span className="font-mono text-[12px] font-semibold" style={{ color: "#C6B79A" }}>
                Add cards
              </span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="ml-auto font-mono text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                style={{ color: "#8E8269" }}
                aria-label="Close add cards panel"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-[11px]" style={{ color: "#6E6353" }}>
                [Add panel — Task 9]
              </p>
            </div>
          </div>
        </>
      )}

      {/* Mobile empty-deck sheet (open from CTA) — same shape */}
      {sheetOpen && isEmpty && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "rgba(8,6,4,0.60)" }}
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          <div
            className="md:hidden fixed left-0 right-0 bottom-0 z-50 flex flex-col"
            style={{
              height: 520,
              background: "#1A160F",
              borderTop: "1px solid #3A3229",
              borderRadius: "22px 22px 0 0",
              boxShadow: "0 -20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center px-[16px] pt-[14px] pb-[10px]">
              <span className="font-mono text-[12px] font-semibold" style={{ color: "#C6B79A" }}>
                Add your first card
              </span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="ml-auto font-mono text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                style={{ color: "#8E8269" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-[11px]" style={{ color: "#6E6353" }}>
                [Add panel — Task 9]
              </p>
            </div>
          </div>
        </>
      )}

      {/* Export dialog — Task 10 placeholder */}
      {exportOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(8,6,4,0.68)" }}
            onClick={() => setExportOpen(false)}
            aria-hidden
          />
          <div
            className="fixed z-50 left-0 right-0 bottom-0 md:left-1/2 md:top-1/2 md:bottom-auto md:right-auto"
            style={{
              // mobile: bottom sheet shape
              background: "#1A160F",
              borderTop: "1px solid #3A3229",
              borderRadius: "22px 22px 0 0",
              boxShadow: "0 -20px 50px rgba(0,0,0,0.5)",
              // desktop overrides via media (can't use Tailwind dynamic md: on inline)
            }}
          >
            <div className="p-[20px]">
              <p className="font-display font-bold text-[19px] md:text-[22px]" style={{ color: "#EDE6D8" }}>
                Export deck
              </p>
              <p className="font-mono text-[11px] mt-[8px]" style={{ color: "#6E6353" }}>
                [Export dialog — Task 10]
              </p>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="mt-[16px] font-sans text-[13px] rounded-[8px] px-[16px] py-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
                style={{
                  color: "#EDE6D8",
                  background: "transparent",
                  border: "1px solid #3A3229",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Re-export types so Task 9+ can import from this module without circular deps.
export type { BuilderShellProps };
