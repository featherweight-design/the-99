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
import { explainedCopy } from "../../lib/copy/commander-explained";
import { KeyPip } from "../ui/ownership-dot";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { useDiscardedScroll } from "../ui/scroll-reset";
import { FacetStrip } from "./facet-strip";
import { SynergyRow } from "./synergy-row";

// Resting cap: how many rows are visible before the disclosure is opened.
const RESTING_CAP_DESKTOP = 10;
const RESTING_CAP_PHONE = 6;

// Display label for each facet in the disclosure copy (plural noun).
const FACET_PLURAL: Record<CardFacet | "all", string> = {
  all: synergyCopy.facet.allPlural,
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
  newestAsOf,
}: {
  cards: SynergyCard[];
  ownedCount: number;
  edhrecTotal: number;
  selected: Set<string>;
  onToggle: (oracleId: string) => void;
  width: "desktop" | "phone";
  /** The price table's newest `as_of`, for the rows' buy tags. One per panel:
      liveness is the table's property, not a card's. Required — see
      `SelectableSynergyPanel` for what a default costs. */
  newestAsOf: Date | null;
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

  // Discarding the scroll position takes a WRITE, and collapsing the list is not
  // one. The `<ul>` below is the same DOM node across every facet and every
  // disclosure — same `id`, same position in the tree — so the browser keeps the
  // offset it was left at while the box is unscrollable and hands it straight
  // back the moment `maxHeight`/`overflowY` return. Switching from a list scrolled
  // to its foot and pressing `Show all` on the next facet therefore reopened at the
  // BOTTOM of a list the reader had never scrolled: the collapse above reads as the
  // discard and never was one.
  //
  // Keyed on both pieces of state, because both transitions owe the same discard
  // — a facet change, and an expansion that a previous one left an offset behind
  // for. Role Coverage's own lists have the same rule and take the same hook.
  const listRef = useDiscardedScroll<HTMLUListElement>([facet, expanded]);

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

  // Disclosure copy. The All facet's prose noun is "cards" — the same word the
  // aria templates append — so at that facet the accessible name is the visible
  // sentence rather than "Show all 258 cards cards".
  const isAllFacet = facet === "all";
  const facetLabel = FACET_PLURAL[facet];
  const facetCountStr = String(facetCount);
  const showAllName = isAllFacet
    ? synergyCopy.disclosure.showAll(facetCountStr, facetLabel)
    : synergyCopy.disclosure.showAllAria(facetCountStr, facetLabel);
  const showFewerName = isAllFacet
    ? synergyCopy.disclosure.showFewer
    : synergyCopy.disclosure.showFewerAria(facetLabel);
  // The scroll container is named by the pill the player chose, so it takes the
  // pill's label and not the prose noun: "All, 258 cards".
  const scrollLabel = isAllFacet ? synergyCopy.facet.all : facetLabel;

  // Siblings for the card-detail trigger (the full list, so tapping opens a
  // list-traversal modal that covers the whole set), carrying each card's own
  // art (H23 carousel PR 1b).
  const siblings = cards.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri }));

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
        <span style={{ color: "var(--accent)" }}>{synergyCopy.panel.legendToken}</span>{" "}
        {isPhone ? synergyCopy.panel.legendRestMobile : synergyCopy.panel.legendRest}
      </p>

      {/* The dot legend, drawn ALWAYS (handoff K.4).
      
          It was conditional on a visible committed row, because the mark it
          explained was the committed dot and that dot was often absent.
      
          Unconditional is Design's ruling (K.4), and it is a claim about the
          PANEL rather than about any one render: this is the only list in the app
          that mixes owned and unowned rows, so both dots are what it is for. A
          render where every visible row happens to be owned still prints
          `Not owned.` — the key describes the list's vocabulary, not its current
          contents. The alternative reads the visible slice and changes the key
          under a reader who scrolls, which is what the role panels' own key
          deliberately avoids by reading all four panels rather than the capped
          slice.
      
          Each clause is preceded by the dot it describes, drawn by the same
          component the rows use, so no clause has to name a colour. That matters
          more than it did: Canopy now overrides --success, so a legend naming a
          hex would be wrong in one of six themes. */}
      <p
          className="m-0 font-mono"
          style={{
            fontSize: 10,
            color: "var(--fg-locked)",
            marginTop: 0,
            marginBottom: isPhone ? 10 : 12,
            lineHeight: 1.4,
          }}
        >
          {/* TWO entries, not three. The committed dot is gone with the
              three-state dot it named: the marker beside each row carries
              severity now, and this panel's dot is ownership alone.

              Unlike Role Coverage's key, both entries are unconditional — this
              is the only panel that can draw an unowned row, so both states are
              always reachable and neither needs a condition. */}
          <KeyPip owned />
          {explainedCopy.committed.dotOwned}{" "}
          <KeyPip owned={false} />
          {explainedCopy.committed.dotUnowned}
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
          {/* Spacer for the availability slot. Without it the header's columns
              stop lining up with the rows beneath them: the toggle spacer lands
              where the slot starts, and every heading to its left reads against
              the wrong column. */}
          <span style={{ width: 88, flexShrink: 0 }} />
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
          ref={listRef}
          id={listId}
          // Expanded, the list is a 480px scroll box. A scroll container with no
          // tabIndex and no name is unreachable by keyboard, so it takes both —
          // but only while it is actually scrollable, or a resting six-row list
          // would put a stop in the tab order for nothing.
          tabIndex={scrollable ? 0 : undefined}
          aria-label={scrollable ? synergyCopy.facet.itemAria(scrollLabel, facetCountStr) : undefined}
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
              newestAsOf={newestAsOf}
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
          aria-label={expanded ? showFewerName : showAllName}
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
