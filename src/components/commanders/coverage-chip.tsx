"use client";
// CoverageChip, CoverageRow, CoverageDisclosure — presentational atoms for
// the Role Coverage panel (#131). Task 7 composes these into the four role
// panels.
//
// Design bindings (all from the handoff's component table, exact):
//   Chip:  --surface-raised bg · 1px solid success-at-40% · radius 999px · h-[28px]
//          padding 0 4px 0 10px (with figure) / 0 10px (absent or showFigures=false)
//          gap 8px · dot 6px --success · name mono 11.5px --fg-body
//          hover: border --accent, name --fg
//   Figure plate: bg --elevated · radius 999px · 3px 7px · mono 10.5px --fg · tabular-nums
//   Absent (showFigures=true, inclusionPct=null): plate removed, dash mono 10.5px --fg-locked
//   showFigures=false: neither plate nor dash (panel note says it once)
//   Phone row: --surface · 1px solid --border · radius 8px · min-height 44px · 0 12px · gap 9px
//              dot 7px · name 13.5px --fg ellipsed · figure mono 11.5px --fg right-aligned tabular
//   Desktop disclosure: dashed --border-strong chip · mono 11px --fg-faint (+N more) → --accent
//   Phone disclosure:   full-width 44px dashed row · mono 12px --accent (Show all N)

import type { RoleCard } from "../../lib/recs/score";
import { CardDetailTrigger, cardDetailCopy } from "../cards/card-detail-provider";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { explainedCopy } from "../../lib/copy/commander-explained";
import type { JSX } from "react";

export const COVERAGE_CAP = { desktop: 12, phone: 6 } as const;
export const COVERAGE_EXPANDED_CAP = 40;

// ── The committed mark ───────────────────────────────────────────────────────
// A card already in one of the player's decks. The mark is the ownership dot's
// fill, swapped rather than joined by anything new, so a marked chip is exactly
// as wide as an unmarked one.

/** The chip and the row draw the same border, in the same two states. */
function chipBorder(committedTo: string | null): string {
  return committedTo === null
    ? "border-[color-mix(in_srgb,var(--success)_40%,var(--bg))]"
    : "border-[color-mix(in_srgb,var(--avail-hard)_40%,var(--bg))]";
}

function dotFill(committedTo: string | null): string {
  return committedTo === null ? "bg-success" : "bg-avail-hard-fg";
}

/**
 * The accessible name, with the deck clause appended to whichever of the three
 * shipped branches applies.
 *
 * A suffix rather than a replacement: the third branch's fallback is the only
 * thing telling a screen-reader user the chip opens something, and the first two
 * carry the figure. Undefined still means "use the trigger's own name" — it is
 * only spelled out here when there is a clause to hang off it.
 */
function chipAria(card: RoleCard, hasFigure: boolean, showFigures: boolean): string | undefined {
  const shipped = hasFigure
    ? recommendationsCopy.coverage.chipAria(card.name, String(card.inclusionPct))
    : showFigures
      ? recommendationsCopy.coverage.chipAriaNoFigure(card.name)
      : undefined;
  if (card.committedTo === null) return shipped;
  const base = shipped ?? `${cardDetailCopy.triggerAria(card.name)}.`;
  return `${base}${explainedCopy.committed.ariaSuffix({ name: card.committedTo })}`;
}

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

  // undefined falls back to cardDetailCopy.triggerAria(name).
  const ariaLabel = chipAria(card, hasFigure, showFigures);

  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      siblings={siblings}
      ariaLabel={ariaLabel}
      className={`group inline-flex items-center rounded-full h-[28px] border ${chipBorder(card.committedTo)} bg-surface-raised hover:border-accent`}
      style={{ gap: 8, padding: hasFigure ? "0 4px 0 10px" : "0 10px" }}
    >
      {/* Dot — 6px, green when free, amber when the card is already in a deck. */}
      <span
        aria-hidden
        className={`block shrink-0 rounded-full w-[6px] h-[6px] ${dotFill(card.committedTo)}`}
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

  const ariaLabel = chipAria(card, hasFigure, showFigures);

  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      siblings={siblings}
      ariaLabel={ariaLabel}
      className="flex w-full items-center rounded-[8px] border border-border bg-surface"
      style={{ minHeight: "44px", padding: "0 12px", gap: 9 }}
    >
      {/* Dot — 7px, green when free, amber when the card is already in a deck. */}
      <span
        aria-hidden
        className={`block shrink-0 rounded-full w-[7px] h-[7px] ${dotFill(card.committedTo)}`}
      />
      {/* Name — ellipsed. `min-w-0` is load-bearing beside `flex-1`: a flex item's
          default min-width is its content, so without it the span refuses to
          shrink and a long name overflows the row instead of ellipsing. */}
      <span className="flex-1 min-w-0 truncate text-[13.5px] text-fg text-left">
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
          className="font-mono text-[11.5px] text-fg-locked text-right shrink-0"
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
  /** The role's whole card count — not the overflow. Both widths announce the
      same number, so it has to be the role's total; only the desktop chip's
      visible label counts the remainder. */
  total: number;
  role: string;
  expanded: boolean;
  controls: string;
  onToggle: () => void;
}): JSX.Element {
  const n = String(total);

  // Expanding reveals at most COVERAGE_EXPANDED_CAP cards; the rest print as an
  // inert count. "Show all N" would be a promise the control cannot keep, so
  // past the cap the accessible name says what will actually appear.
  const collapsedAria =
    total > COVERAGE_EXPANDED_CAP
      ? recommendationsCopy.coverage.showCappedAria(String(COVERAGE_EXPANDED_CAP), n, role)
      : recommendationsCopy.coverage.showAllAria(n, role);

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
            ? recommendationsCopy.coverage.showFewerAria(role)
            : collapsedAria
        }
        className="flex w-full items-center justify-center rounded-[8px] border border-dashed border-border-strong"
        style={{ minHeight: "44px" }}
      >
        <span className="font-mono text-[12px] text-accent">
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
          ? recommendationsCopy.coverage.showFewerAria(role)
          : collapsedAria
      }
      className="inline-flex items-center rounded-full border border-dashed border-border-strong"
      style={{ padding: "0 12px", height: 28 }}
    >
      <span className={`font-mono text-[11px] ${expanded ? "text-fg-faint" : "text-accent"}`}>
        {expanded
          ? recommendationsCopy.coverage.showFewer
          : recommendationsCopy.coverage.moreChips(String(total - COVERAGE_CAP.desktop))}
      </span>
    </button>
  );
}
