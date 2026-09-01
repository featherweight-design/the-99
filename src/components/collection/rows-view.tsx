"use client";
// Dense rows view per property table §Collection Row (State 1a).
// Grid columns:
//   mobile:  38px 40px 1fr auto              (qty · pips · name+type · set)
//   desktop: 52px 54px 1fr 150px 92px 18px   (qty · pips · name · type · set/rarity · chevron)
// Rarity dot colors per §Rarity Dot Colors.

import type { BrowseCard } from "../../lib/collection/browse";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
import { GhostButton } from "../ui/button";

const RARITY_DOT: Record<BrowseCard["rarity"], string> = {
  common: "#A89B84", uncommon: "#B7C4CE", rare: "#C9A24B", mythic: "#E0913C",
};

export function RowsView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
}: {
  cards: BrowseCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
}) {
  return (
    // §Rows Scroll Container: flex-1, padding 2px 12px 12px mobile / 12px 34px 34px desktop, flex column, gap 6/7px
    <div className="flex-1 flex flex-col gap-[6px] md:gap-[7px] px-[12px] md:px-[34px] pt-[2px] md:pt-[12px] pb-[12px] md:pb-[34px]">
      {cards.map((c) => {
        const state = c.availability ? availabilityState(c.availability) : "free";
        // Addendum 2 §1: over-committed "keeps its border tint and nothing
        // else". `--avail-over-border` is the same #6B3226 the R1 canvas
        // already draws, so it is not a new hue on this surface.
        const border =
          state === "over"
            ? "[border:1px_solid_var(--avail-over-border)] hover:[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--border-strong)]";
        return (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          aria-label={availabilityCopy.collection.rowAria(
            c.name,
            c.typeLine,
            c.quantity,
            `${c.primarySetCode}, ${c.rarity}`,
            // Clause lands LAST, and only when there is one — a free card
            // produces today's exact string, unchanged.
            (c.availability ? markerAria(c.availability, { nameless: true }) : null) ?? undefined,
          )}
          // §Row Container: grid template columns, gap 10/16px, padding 10px 12px / 12px 18px, radius 8px, bg #1E1A15 (--surface), border 1px #2A241D (--border)
          // Background and border are utilities, not inline style: inline values
          // outrank the hover: variants and neither hover state ever lands.
          className={`grid items-center text-left rounded-lg gap-[10px] md:gap-[16px] py-[10px] md:py-[12px] px-[12px] md:px-[18px] md:cursor-pointer bg-[color:var(--surface)] hover:bg-[color:var(--surface-raised)] [--row-bg:var(--surface)] hover:[--row-bg:var(--surface-raised)] ${border} [grid-template-columns:38px_40px_1fr_auto] md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]`}
        >
          {/* Quantity — §Row: Quantity Column: mono 13px mobile / 14px desktop, #C9A24B (--brass), font-weight 500 */}
          <span className="font-mono text-[13px] md:text-[14px] font-medium" style={{ color: "var(--brass)" }}>
            ×{c.quantity}
          </span>

          {/* Color pips — §Row: Color Pip Container: gap 3/4px; pips 11×11 mobile / 13×13 desktop */}
          <span className="flex gap-[3px] md:gap-[4px]">
            {c.colorIdentity.length === 0 ? (
              <span
                aria-hidden
                className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full"
                style={{ background: "#8E8269", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
              />
            ) : c.colorIdentity.map((col) => (
              <span
                key={col}
                aria-hidden
                className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full"
                style={{ background: WUBRG_HEX[col] ?? "#8E8269", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
              />
            ))}
          </span>

          {/* Name column — §Row: Name Column Container: min-width 0 */}
          <span className="min-w-0">
            {/* Name + availability marker share the line; Addendum 2 §1 puts the
                marker inline after the name, inside the existing 1fr cell, so
                neither grid template changes. */}
            <span className="flex items-center gap-[7px] md:gap-[9px] min-w-0">
              {/* §Row: Card Name — 14/15px 600, #EDE6D8 (--fg), ellipsis */}
              {/* Row 13.2 wants the full name in the title as well as the
                  accessible name. It matters more now than it did: the marker
                  shares this cell, so the name truncates sooner. */}
              <span
                title={c.name}
                className="truncate min-w-0 text-[14px] md:text-[15px] font-semibold"
                style={{ color: "var(--fg)" }}
              >
                {c.name}
              </span>
              {c.availability && (
                // `nameless` — /collection is the count-only vantage. No
                // `selfExcluded`: there is no deck to stand in here.
                //
                // Row density deliberately sets no family or size, because on a
                // decklist it rides a mono meta line (row 3.4). This cell is not
                // that: it is the sans name cell, so row 13.3's own typography
                // has to be supplied here or the label paints as body-size sans.
                //
                // Seam per row 13.4 — the over glyph's hairline has to be the
                // colour actually behind it, and that is the row surface, not
                // the page canvas the marker defaults to. --row-bg rather than a
                // fixed colour so it tracks the hover swap, as the decklist row
                // already does; pinned, it paints a hairline on hover.
                <AvailabilityMarker
                  availability={c.availability}
                  density="row"
                  nameless
                  seam="var(--row-bg)"
                  className="shrink-0 font-mono text-[8.5px] font-semibold tracking-[0.02em]"
                />
              )}
            </span>
            {/* Mobile type line — §Row: Type Line (mobile): 11.5px, #8E8269 (--fg-faint), truncate */}
            <span className="block md:hidden truncate text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
              {c.typeLine}
            </span>
          </span>

          {/* SetRarityColumn: mobile set code + desktop type/set/rarity/chevron columns */}
          <SetRarityColumn card={c} />
        </button>
        );
      })}

      {cards.length < totalCards && (
        <GhostButton
          type="button"
          onClick={onShowMore}
          className="mt-[6px] mx-auto text-[13px] px-[16px] py-[9px]"
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </GhostButton>
      )}
    </div>
  );
}

function SetRarityColumn({ card }: { card: BrowseCard }) {
  return (
    <>
      {/* Mobile: single trailing set code — §Row: Set Code (mobile): mono 10.5px, #8E8269 (--fg-faint), letter-spacing 0.04em */}
      <span
        className="md:hidden font-mono text-[10.5px] tracking-[0.04em] text-right"
        style={{ color: "var(--fg-faint)" }}
      >
        {card.primarySetCode}
      </span>

      {/* Desktop-only trailing spans — displayed only ≥md */}
      <span
        className="hidden md:block truncate font-sans text-[12.5px]"
        style={{ color: "var(--fg-muted)" }}
      >
        {card.typeLine}
      </span>
      <span className="hidden md:flex items-center gap-[8px]">
        <span
          aria-hidden
          className="w-[7px] h-[7px] rounded-full block"
          style={{ background: RARITY_DOT[card.rarity] }}
        />
        <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {card.primarySetCode}
        </span>
      </span>
      <span className="hidden md:block text-[14px]" style={{ color: "var(--fg-faint)" }}>
        ›
      </span>
    </>
  );
}
