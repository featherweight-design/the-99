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
import { CardDetailTrigger, cardDetailCopy, type Sibling } from "../cards/card-detail-provider";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { OwnershipDot } from "../ui/ownership-dot";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
import { availabilityState, drawsMarker } from "../../lib/decks/availability";
import type { JSX } from "react";

export const COVERAGE_CAP = { desktop: 12, phone: 6 } as const;
export const COVERAGE_EXPANDED_CAP = 40;

// ── The availability mark ────────────────────────────────────────────────────
// What a card's claim picture is worth saying. The dot no longer carries it: it
// is ownership and nothing else, and the marker beside the name says the rest.
//
// A marked chip is therefore WIDER than an unmarked one, by a measured 69-89px
// depending on the reading — a change from the swapped-fill mark this replaced,
// and the reason the name had to stop wrapping. A free chip is untouched and
// stays exactly the width it shipped at.

/**
 * Whether this card draws a marker at all — i.e. whether anything about it is
 * worth saying. Free renders nothing, which is the feature and not an
 * optimisation: a player whose collection covers their decks sees nothing new.
 *
 * A null `availability` is NO ROW, never "unowned" — see `RoleCard.availability`.
 * It reads as free here, which is right: Role Coverage is built from the owned
 * pool, so a card with no claim row has no claim to report.
 */
function markerState(card: RoleCard) {
  // `drawsMarker` decides WHETHER, this decides WHICH. Routed through the shared
  // predicate rather than repeating its conditions, so the chip and the dot key
  // above it cannot disagree about whether anything is being said.
  if (!drawsMarker(card)) return null;
  return availabilityState(card.availability);
}

/**
 * The chip's border.
 *
 * The committed branch is gone with `committedTo` (ruling 4): the marker is the
 * channel now, and a tinted border beside it said one thing twice. What replaces
 * it is narrower — `over` alone tints, because it is the one severity loud enough
 * to touch a container.
 *
 * Written as a `color-mix` over a token rather than the literal the handoff
 * quotes (readiness erratum 3). That value is the ratified one in
 * `card-availability.md` rows 4.5 and 4.10, but it predates the six-theme system
 * and ships nowhere in `src/`: a frozen literal is correct in one palette and
 * wrong in five. This is the free branch's own form with `--danger` in place of
 * `--success`.
 */
function chipBorder(card: RoleCard): string {
  return markerState(card) === "over"
    ? "border-[color-mix(in_srgb,var(--danger)_40%,var(--bg))]"
    : "border-[color-mix(in_srgb,var(--success)_40%,var(--bg))]";
}

/**
 * The row's border, which tints on one state only.
 *
 * A free row keeps the neutral border it ships with. The row is a full-width
 * surface rather than a pill, so tinting it green would make ordinary ownership
 * the loudest thing on the panel; the over tint is worth the exception for the
 * same reason the chip's is.
 */
function rowBorder(card: RoleCard): string {
  return markerState(card) === "over"
    ? "border-[color-mix(in_srgb,var(--danger)_40%,var(--bg))]"
    : "border-border";
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
  // NAME-BEARING here while the drawn marker is `nameless`. Two calls with two
  // explicit argument sets, which is not what `card-availability.md` forbids:
  // what the coupling rules out is ONE call drawing a count and speaking a name,
  // because then an edit to the drawn form silently reshapes the spoken one.
  // The deck name has always ridden this label rather than the marker, and it
  // still does.
  const claim = card.availability ? markerAria(card.availability) : null;
  // `markerAria` returns null at free, so a free card takes the shipped name
  // with no clause on it.
  //
  // ONE CASE IS NOT BYTE-IDENTICAL, and it is deliberate rather than an
  // oversight: a card with spare copies that ALSO sits in a committed deck used
  // to end `Already in Atraxa.`, because the retired suffix read `committedTo`,
  // which is deck membership and not a claim. That card is free — a copy is
  // there to use — and the suffix was the same false certainty this round was
  // filed about, spoken instead of drawn. It goes with `ariaSuffix` (ledger 6).
  //
  // Every card with no committed deck at all keeps its shipped name exactly.
  if (claim === null) return shipped;
  const base = shipped ?? `${cardDetailCopy.triggerAria(card.name)}.`;
  return `${base} ${claim}.`;
}

// ── Chip ─────────────────────────────────────────────────────────────────────

export function CoverageChip({
  card,
  siblings,
  showFigures,
}: {
  card: RoleCard;
  siblings: readonly Sibling[];
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
      className={`group inline-flex items-center rounded-full h-[28px] border ${chipBorder(card)} bg-surface-raised hover:border-accent`}
      style={{ gap: 8, padding: hasFigure ? "0 4px 0 10px" : "0 10px" }}
    >
      {/* Dot — 6px. TWO states now: the marker carries severity, so the dot is
          ownership and nothing else (ruling 2). */}
      <OwnershipDot owned size={6} className="block" />
      {/* Name and marker are ONE group, joined at 6px inside the chip's own 8px.
          The marker is a fact about this card, not a sibling of the figure plate. */}
      <span className="inline-flex items-center" style={{ gap: 6, minWidth: 0 }}>
        {/* `whitespace-nowrap` is load-bearing and was the round's one drawn
            defect. This span shipped bare, and the chip declares `h-[28px]` with
            no floor — so once the marker added its measured 69-89px, a long name
            wrapped and broke the pill. The marker is already `flex-none
            whitespace-pre` and stays whole; the name is what had to stop
            wrapping. No `max-w` floor: the worst case measures ~350px, which fits
            the narrowest desktop this chip renders at, and the phone draws
            `CoverageRow` instead, which truncates. */}
        <span className="font-mono text-[11.5px] text-fg-body group-hover:text-fg whitespace-nowrap">
          {card.name}
        </span>
        {card.availability && markerState(card) && (
          <AvailabilityMarker
            availability={card.availability}
            nameless
            spoken={false}
            // A TOKEN, never the handoff's resolved hex (readiness erratum 2):
            // the seam is the join between the over glyph's doubled diamonds, and
            // a frozen literal paints a hairline crack in five of six themes.
            seam="var(--surface-raised)"
            // The marker sets no size of its own — §3.4 rules that density rides
            // the meta line, and a chip has no meta line. It has a FIGURE, and the
            // marker is the same class of thing, so it takes the figure's size a
            // step up in weight: the plate has a filled ground for presence and
            // the marker has none.
            className="flex-none font-mono text-[10.5px] font-[600] tracking-[0.02em]"
          />
        )}
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
  siblings: readonly Sibling[];
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
      className={`flex w-full items-center rounded-[8px] border ${rowBorder(card)} bg-surface`}
      style={{ minHeight: "44px", padding: "0 12px", gap: 9 }}
    >
      {/* Dot — 7px, two states. See the chip. */}
      <OwnershipDot owned size={7} className="block" />
      {/* Name — ellipsed. `min-w-0` is load-bearing beside `flex-1`: a flex item's
          default min-width is its content, so without it the span refuses to
          shrink and a long name overflows the row instead of ellipsing. */}
      <span className="flex-1 min-w-0 truncate text-[13.5px] text-fg text-left">
        {card.name}
      </span>
      {card.availability && markerState(card) && (
        <AvailabilityMarker
          availability={card.availability}
          nameless
          spoken={false}
          seam="var(--surface)"
          className="flex-none font-mono text-[11.5px] font-[600] tracking-[0.02em]"
        />
      )}
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
