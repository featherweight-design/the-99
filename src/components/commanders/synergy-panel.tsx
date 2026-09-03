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
          /* Phone: single line "{ownedCount} / {edhrecTotal} owned" */
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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

        {/* Phone: progress bar (sits below the count line) */}
        {isPhone && (
          <div
            style={{
              height: 6,
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

      {/* Sub-caption */}
      <p
        className="m-0 font-mono"
        style={{ fontSize: 12, color: "var(--fg-faint)", margin: "10px 0 10px" }}
      >
        {isPhone
          ? synergyCopy.panel.subcaptionMobile(String(cards.length))
          : synergyCopy.panel.subcaption(String(cards.length))}
      </p>

      {/* Facet strip */}
      <FacetStrip counts={counts} selected={facet} onSelect={selectFacet} />

      {/* Figure legend */}
      <p
        className="m-0 font-mono"
        style={{ fontSize: 10, color: "var(--fg-locked)", margin: "8px 0 8px", lineHeight: 1.4 }}
      >
        {isPhone ? synergyCopy.panel.legendMobile : synergyCopy.panel.legend}
      </p>

      {/* Column header row — desktop only */}
      {!isPhone && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 6px 0 12px",
            marginBottom: 4,
          }}
        >
          {/* Spacer for ownership dot */}
          <span style={{ width: 7, flexShrink: 0 }} />
          {/* Card name column */}
          <span
            className="font-mono"
            style={{ flex: "auto", fontSize: 10, color: "var(--fg-locked)", textTransform: "uppercase" }}
          >
            {synergyCopy.panel.colCard}
          </span>
          {/* Type column */}
          <span
            className="font-mono"
            style={{ width: 150, flexShrink: 0, fontSize: 10, color: "var(--fg-locked)", textTransform: "uppercase" }}
          >
            {synergyCopy.panel.colType}
          </span>
          {/* Synergy column */}
          <span
            className="font-mono"
            style={{ width: 64, flexShrink: 0, fontSize: 10, color: "var(--fg-locked)", textTransform: "uppercase", textAlign: "right" }}
          >
            {synergyCopy.panel.colSynergy}
          </span>
          {/* Decks column */}
          <span
            className="font-mono"
            style={{ width: 46, flexShrink: 0, fontSize: 10, color: "var(--fg-locked)", textTransform: "uppercase", textAlign: "right" }}
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
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            ...(expanded
              ? { maxHeight: "480px", overflowY: "auto" }
              : {}),
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
          className="font-mono cursor-pointer w-full flex items-center justify-center gap-[6px] bg-transparent border-0 text-[color:var(--accent)] [border-top:1px_dashed_var(--border-strong)]"
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
