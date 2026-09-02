"use client";
// CoverageChip, CoverageRow, CoverageDisclosure — presentational atoms for
// the Role Coverage panel (#131). Task 7 composes these into the four role
// panels.
//
// Design bindings (all from the handoff's component table, exact):
//   Chip:  #221D16 bg · 1px solid #33402F · radius 999px · h-[28px]
//          padding 0 4px 0 10px (with figure) / 0 10px (absent or showFigures=false)
//          gap 8px · dot 6px --success · name mono 11.5px --fg-body
//          hover: border --brass, name --fg
//   Figure plate: bg --elevated · radius 999px · 3px 7px · mono 10.5px --fg · tabular-nums
//   Absent (showFigures=true, inclusionPct=null): plate removed, dash mono 10.5px --fg-locked
//   showFigures=false: neither plate nor dash (panel note says it once)
//   Phone row: --surface · 1px solid --border · radius 8px · min-height 44px · 0 12px · gap 9px
//              dot 7px · name 13.5px --fg ellipsed · figure mono 11.5px --fg right-aligned tabular
//   Desktop disclosure: dashed --border-strong chip · mono 11px --fg-faint (+N more) → --brass
//   Phone disclosure:   full-width 44px dashed row · mono 12px --brass (Show all N)

import type { RoleCard } from "../../lib/recs/score";
import { CardDetailTrigger } from "../decks/card-detail-provider";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { JSX } from "react";

export const COVERAGE_CAP = { desktop: 12, phone: 6 } as const;
export const COVERAGE_EXPANDED_CAP = 40;

// ── Chip ─────────────────────────────────────────────────────────────────────

export function CoverageChip({
  card,
  siblings,
  showFigures,
}: {
  card: RoleCard;
  siblings: string[];
  showFigures: boolean;
}): JSX.Element {
  // null is "no figure" — distinct from 0, which is a real EDHREC figure.
  const hasFigure = showFigures && Number.isFinite(card.inclusionPct);
  const pct = String(card.inclusionPct);

  const ariaLabel = hasFigure
    ? recommendationsCopy.coverage.chipAria(card.name, pct)
    : showFigures
      ? recommendationsCopy.coverage.chipAriaNoFigure(card.name)
      : undefined; // falls back to cardDetailCopy.triggerAria(name)

  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      siblings={siblings}
      ariaLabel={ariaLabel}
      className="group inline-flex items-center rounded-full h-[28px] border border-[#33402F] bg-[#221D16] hover:border-brass"
      style={{ gap: 8, padding: showFigures ? "0 4px 0 10px" : "0 10px" }}
    >
      {/* Dot — 6px green, aria-hidden */}
      <span
        aria-hidden
        className="block shrink-0 rounded-full w-[6px] h-[6px] bg-success"
      />
      {/* Name */}
      <span className="font-mono text-[11.5px] text-fg-body group-hover:text-fg">
        {card.name}
      </span>
      {/* Figure plate / absent dash / nothing */}
      {hasFigure ? (
        <span
          aria-hidden
          className="font-mono text-[10.5px] text-fg rounded-full bg-elevated"
          style={{ padding: "3px 7px", fontVariantNumeric: "tabular-nums" }}
        >
          {recommendationsCopy.coverage.chipFigure(pct)}
        </span>
      ) : showFigures ? (
        // inclusionPct is null and EDHREC is reachable — absent figure, not degraded.
        <span
          aria-hidden
          className="font-mono text-[10.5px] text-fg-locked"
        >
          {recommendationsCopy.coverage.chipNoFigure}
        </span>
      ) : null}
    </CardDetailTrigger>
  );
}

// ── Phone Row ─────────────────────────────────────────────────────────────────
// A 44px one-column row for phones. The same chip at 44px would be a
// button-shaped paragraph — a distinct element is cleaner.

export function CoverageRow({
  card,
  siblings,
  showFigures,
}: {
  card: RoleCard;
  siblings: string[];
  showFigures: boolean;
}): JSX.Element {
  const hasFigure = showFigures && Number.isFinite(card.inclusionPct);
  const pct = String(card.inclusionPct);

  const ariaLabel = hasFigure
    ? recommendationsCopy.coverage.chipAria(card.name, pct)
    : showFigures
      ? recommendationsCopy.coverage.chipAriaNoFigure(card.name)
      : undefined;

  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      siblings={siblings}
      ariaLabel={ariaLabel}
      className="flex w-full items-center rounded-[8px] border border-border bg-surface"
      style={{ minHeight: "44px", padding: "0 12px", gap: 9 }}
    >
      {/* Dot — 7px green, aria-hidden */}
      <span
        aria-hidden
        className="block shrink-0 rounded-full w-[7px] h-[7px] bg-success"
      />
      {/* Name — ellipsed */}
      <span className="flex-1 truncate text-[13.5px] text-fg text-left">
        {card.name}
      </span>
      {/* Figure / absent dash / nothing */}
      {hasFigure ? (
        <span
          aria-hidden
          className="font-mono text-[11.5px] text-fg text-right shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {recommendationsCopy.coverage.chipFigure(pct)}
        </span>
      ) : showFigures ? (
        <span
          aria-hidden
          className="font-mono text-[10.5px] text-fg-locked text-right shrink-0"
        >
          {recommendationsCopy.coverage.chipNoFigure}
        </span>
      ) : null}
    </CardDetailTrigger>
  );
}

// ── Disclosure ────────────────────────────────────────────────────────────────
// Desktop: a dashed chip reading "+N more" (→ "Show fewer" when expanded).
// Phone: a full-width 44px dashed row reading "Show all N" (→ "Show fewer").

export function CoverageDisclosure({
  width,
  total,
  role,
  expanded,
  controls,
  onToggle,
}: {
  width: "desktop" | "phone";
  total: number;
  role: string;
  expanded: boolean;
  controls: string;
  onToggle: () => void;
}): JSX.Element {
  const n = String(total);

  if (width === "phone") {
    // Full-width 44px dashed row. Text is "Show all N" or "Show fewer".
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={controls}
        aria-label={
          expanded
            ? recommendationsCopy.coverage.showFewer
            : recommendationsCopy.coverage.showAllAria(n, role)
        }
        className="flex w-full items-center justify-center rounded-[8px] border border-dashed border-border-strong"
        style={{ minHeight: "44px" }}
      >
        <span className="font-mono text-[12px] text-brass">
          {expanded
            ? recommendationsCopy.coverage.showFewer
            : recommendationsCopy.coverage.showAll(n)}
        </span>
      </button>
    );
  }

  // Desktop: dashed chip.
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={
        expanded
          ? recommendationsCopy.coverage.showFewer
          : recommendationsCopy.coverage.moreChips(n)
      }
      className="inline-flex items-center rounded-full border border-dashed border-border-strong"
      style={{ padding: "0 10px", height: 28 }}
    >
      <span className={`font-mono text-[11px] ${expanded ? "text-brass" : "text-fg-faint"}`}>
        {expanded
          ? recommendationsCopy.coverage.showFewer
          : recommendationsCopy.coverage.moreChips(n)}
      </span>
    </button>
  );
}
