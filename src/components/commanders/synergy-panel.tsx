"use client";
// SynergyPanel — the commander's EDHREC synergy card list, with facet filter
// and disclosure. Owns two pieces of local state: `facet` and `expanded`.
// Selection state lives one level up in detail.tsx (Task 7 reads it there).
//
// Structure, top to bottom:
//   Ownership headline bar (inner card — --surface-raised / --border)
//   Sub-caption
//   Facet strip
//   Figure legend
//   Column header row (desktop only)
//   Card list (capped by resting cap until expanded)
//   Disclosure button

import { useState, useId } from "react";
import type { CardFacet } from "../../lib/cards/facet";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import { facetCounts } from "../../lib/commanders/synergy-cards";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { FacetStrip } from "./facet-strip";
import { SynergyRow } from "./synergy-row";

// Resting cap: how many rows are visible before the disclosure is opened.
const RESTING_CAP_DESKTOP = 10;
const RESTING_CAP_PHONE = 6;

// Display label for each facet in the disclosure copy (plural noun).
const FACET_PLURAL: Record<CardFacet | "all", string> = {
  all: synergyCopy.facet.all,
  creature: synergyCopy.facet.creatures,
  spell: synergyCopy.facet.spells,
  artifact: synergyCopy.facet.artifacts,
  enchantment: synergyCopy.facet.enchantments,
  land: synergyCopy.facet.lands,
  other: "",
};

export function SynergyPanel({
  cards,
  ownedCount,
  edhrecTotal,
  selected,
  onToggle,
  width,
}: {
  cards: SynergyCard[];
  ownedCount: number;
  edhrecTotal: number;
  selected: Set<string>;
  onToggle: (oracleId: string) => void;
  width: "desktop" | "phone";
}) {
  const isPhone = width === "phone";
  const restingCap = isPhone ? RESTING_CAP_PHONE : RESTING_CAP_DESKTOP;

  const listId = useId();

  // Counts from the full (post-exclusion) list — used for the facet strip.
  const counts = facetCounts(cards);

  // Default facet: creature if any exist, else "all".
  const initialFacet: CardFacet | "all" = counts.creature > 0 ? "creature" : "all";

  const [facet, setFacetState] = useState<CardFacet | "all">(initialFacet);
  const [expanded, setExpanded] = useState(false);

  // A facet change collapses to the resting cap and discards the scroll
  // position — the property table's *Expanded scroll container* row. Leaving a
  // 258-row expansion open under a pill the player just switched to would drop
  // them into the middle of a list they did not ask to be deep in.
  function selectFacet(next: CardFacet | "all") {
    setFacetState(next);
    setExpanded(false);
  }

  // Filter the card list by the selected facet.
  const facetCards = facet === "all" ? cards : cards.filter((c) => c.facet === facet);
  const facetCount = facetCards.length;

  // Apply the resting cap unless expanded.
  const visibleCards = expanded ? facetCards : facetCards.slice(0, restingCap);
  const canExpand = facetCount > restingCap;
  // Expanded past the resting cap is the only state where the list scrolls.
  const scrollable = expanded && canExpand;

  // Ownership headline bar figures.
  const pct = edhrecTotal > 0 ? Math.round((ownedCount / edhrecTotal) * 100) : 0;

  // Disclosure copy.
  const facetLabel = FACET_PLURAL[facet];
  const facetCountStr = String(facetCount);

  // Sibling oracle ids for the card-detail trigger (the full list, so tapping
  // opens a list-traversal modal that covers the whole set).
  const siblings = cards.map((c) => c.oracleId);

  return (
    <div>
      {/* Ownership headline bar — inner card */}
      <div
        className="rounded-[10px] md:rounded-[12px]"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          padding: isPhone ? "13px 14px" : "18px 20px",
          marginTop: isPhone ? 0 : 16,
        }}
      >
        {isPhone ? (
          /* Phone: single line "{ownedCount} / {edhrecTotal} owned" — 9px bottom margin */
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <span
              className="font-mono"
              style={{ fontSize: 12, color: "var(--fg)" }}
            >
              {ownedCount} / {edhrecTotal} owned
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 12, color: "var(--success)", marginLeft: "auto" }}
            >
              {pct}% owned
            </span>
          </div>
        ) : (
          /* Desktop: count figure + "of top N" label + bar + percentage */
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 30, color: "var(--fg)" }}
            >
              {ownedCount}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 14, color: "var(--fg-faint)" }}
            >
              of top {edhrecTotal}
            </span>
            {/* Progress bar track */}
            <div
              style={{
                flex: 1,
                height: 10,
                borderRadius: 999,
                overflow: "hidden",
                background: "var(--border)",
              }}
            >
              <div
                data-testid="synergy-owned-bar"
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--accent)",
                  borderRadius: 999,
                }}
              />
            </div>
            <span
              className="font-mono"
              style={{ fontSize: 12, color: "var(--success)" }}
            >
              {pct}% owned
            </span>
          </div>
        )}

        {/* Phone: progress bar (sits below the count line). The brief puts the
            12px gap under the bar, not under the count line above it. */}
        {isPhone && (
          <div
            style={{
              height: 6,
              marginBottom: 12,
              borderRadius: 999,
              overflow: "hidden",
              background: "var(--border)",
            }}
          >
            <div
              data-testid="synergy-owned-bar"
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "var(--accent)",
                borderRadius: 999,
              }}
            />
          </div>
        )}
      </div>

      {/* Sub-caption — 11.5px phone, 12px desktop; 2px top margin */}
      <p
        className="m-0 font-mono"
        style={{
          fontSize: isPhone ? 11.5 : 12,
          color: "var(--fg-faint)",
          marginTop: 2,
          marginBottom: 0,
        }}
      >
        {isPhone
          ? synergyCopy.panel.subcaptionMobile(String(cards.length))
          : synergyCopy.panel.subcaption(String(cards.length))}
      </p>

      {/* Facet strip — block margin: 18px top, 10px bottom (design table §FacetStrip) */}
      <div style={{ marginTop: 18, marginBottom: 10 }}>
        <FacetStrip counts={counts} selected={facet} onSelect={selectFacet} />
      </div>

      {/* Figure legend — 9.5px phone, 10px desktop; margin-bottom 10px/12px */}
      <p
        className="m-0 font-mono"
        style={{
          fontSize: isPhone ? 9.5 : 10,
          color: "var(--fg-locked)",
          marginTop: 0,
          marginBottom: isPhone ? 10 : 12,
          lineHeight: 1.4,
        }}
      >
        {isPhone ? synergyCopy.panel.legendMobile : synergyCopy.panel.legend}
      </p>

      {/* Column header row — desktop only; 9.5px mono uppercase 0.14em tracking */}
      {!isPhone && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 6px 6px 12px",
          }}
        >
          {/* Spacer for ownership dot */}
          <span style={{ width: 7, flexShrink: 0 }} />
          {/* Card name column */}
          <span
            className="font-mono"
            style={{ flex: "auto", fontSize: 9.5, color: "var(--fg-locked)", textTransform: "uppercase", letterSpacing: "0.14em" }}
          >
            {synergyCopy.panel.colCard}
          </span>
          {/* Type column */}
          <span
            className="font-mono"
            style={{ width: 150, flexShrink: 0, fontSize: 9.5, color: "var(--fg-locked)", textTransform: "uppercase", letterSpacing: "0.14em" }}
          >
            {synergyCopy.panel.colType}
          </span>
          {/* Synergy column — accent per design table */}
          <span
            className="font-mono"
            style={{ width: 64, flexShrink: 0, fontSize: 9.5, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.14em", textAlign: "right" }}
          >
            {synergyCopy.panel.colSynergy}
          </span>
          {/* Decks column */}
          <span
            className="font-mono"
            style={{ width: 46, flexShrink: 0, fontSize: 9.5, color: "var(--fg-locked)", textTransform: "uppercase", letterSpacing: "0.14em", textAlign: "right" }}
          >
            {synergyCopy.panel.colDecks}
          </span>
          {/* Spacer for toggle button */}
          <span style={{ width: 34, flexShrink: 0 }} />
        </div>
      )}

      {/* Empty facet state */}
      {facetCount === 0 && (
        <p
          className="font-mono"
          style={{ fontSize: 12, color: "var(--fg-locked)", padding: "12px 0" }}
        >
          {synergyCopy.facet.empty(facetLabel)}
        </p>
      )}

      {/* Card list */}
      {facetCount > 0 && (
        <ul
          id={listId}
          // Expanded, the list is a 480px scroll box. A scroll container with no
          // tabIndex and no name is unreachable by keyboard, so it takes both —
          // but only while it is actually scrollable, or a resting six-row list
          // would put a stop in the tab order for nothing.
          tabIndex={scrollable ? 0 : undefined}
          aria-label={scrollable ? synergyCopy.facet.itemAria(facetLabel, facetCountStr) : undefined}
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            ...(scrollable ? { maxHeight: "480px", overflowY: "auto" } : {}),
          }}
        >
          {visibleCards.map((card) => (
            <SynergyRow
              key={card.oracleId}
              card={card}
              selected={selected.has(card.oracleId)}
              onToggle={() => onToggle(card.oracleId)}
              siblings={siblings}
              width={width}
              facet={facet}
            />
          ))}
        </ul>
      )}

      {/* Disclosure button — only when the list overflows the resting cap */}
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((prev) => !prev)}
          className="font-mono cursor-pointer w-full flex items-center justify-center gap-[8px] bg-transparent text-[color:var(--accent)] [border:1px_dashed_var(--border-strong)] rounded-[8px]"
          style={{
            height: 44,
            fontSize: 12,
            marginTop: 4,
          }}
          aria-label={
            expanded
              ? synergyCopy.disclosure.showFewerAria(facetLabel)
              : synergyCopy.disclosure.showAllAria(facetCountStr, facetLabel)
          }
        >
          {expanded ? (
            synergyCopy.disclosure.showFewer
          ) : (
            <>
              {synergyCopy.disclosure.showAll(facetCountStr, facetLabel)}
              {/* Desktop only: trailing arrow glyph — canvas wins over README on this divergence */}
              {!isPhone && <span aria-hidden="true"> →</span>}
            </>
          )}
        </button>
      )}
    </div>
  );
}
