"use client";
// Dense rows view per property table §Collection Row (State 1a).
// Grid columns:
//   mobile:  38px 40px 1fr auto              (qty · pips · name+type · set)
//   desktop: 52px 54px 1fr 150px 92px 18px   (qty · pips · name · type · set/rarity · chevron)
// Rarity dot colors per §Rarity Dot Colors.

import type { BrowseListCard } from "../../lib/collection/browse";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
import { GhostButton } from "../ui/button";
import { ROW_SHELL_GRID } from "../ui/row-shell";

const RARITY_DOT: Record<BrowseListCard["rarity"], string> = {
  common: "var(--fg-muted)", uncommon: "var(--fg-body)", rare: "var(--accent)", mythic: "var(--warning)",
};

export function RowsView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
}: {
  cards: BrowseListCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
}) {
  return (
    // §Rows Scroll Container: flex-1, padding 2px 12px 12px mobile / 12px 34px 34px desktop, flex column, gap 6/7px
    <div className="flex-1 flex flex-col gap-[6px] md:gap-[7px] px-[12px] md:px-[34px] pt-[2px] md:pt-[12px] pb-[12px] md:pb-[34px]">
      {cards.map((c) => {
        const state = c.availability ? availabilityState(c.availability) : "free";
        // Addendum 2 §1 gave over-committed a border tint. Card-rows call 4
        // moved it to an inset ring: a tinted border froze the row's hover
        // border, so an over-committed row was the one row on the surface that
        // did not answer the pointer. The ring states the same fact and leaves
        // the border free to do its own job.
        const border = "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--border-strong)]";
        const overRing =
          state === "over" ? "[box-shadow:inset_0_0_0_1px_var(--avail-over-border)]" : "";
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
          // §Row Container: grid template columns, gap 10/16px, padding 10px 12px / 12px 18px, radius 7px, bg --surface, border 1px --border
          // Background and border are utilities, not inline style: inline values
          // outrank the hover: variants and neither hover state ever lands.
          className={`${ROW_SHELL_GRID} text-left gap-[10px] md:gap-[16px] py-[10px] md:py-[12px] px-[12px] md:px-[18px] md:cursor-pointer bg-[color:var(--surface)] hover:bg-[color:var(--surface-raised)] [--row-bg:var(--surface)] hover:[--row-bg:var(--surface-raised)] ${border} ${overRing} [grid-template-columns:38px_40px_1fr_auto] md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]`}
        >
          {/* Quantity — §Row: Quantity Column: mono 13px mobile / 14px desktop, --accent, font-weight 500 */}
          <span className="font-mono text-[13px] md:text-[14px] font-medium" style={{ color: "var(--accent)" }}>
            ×{c.quantity}
          </span>

          {/* Color pips — §Row: Color Pip Container: gap 3/4px; pips 11×11 mobile / 13×13 desktop */}
          <ColorPips colorIdentity={c.colorIdentity} />

          {/* Name column — §Row: Name Column Container: min-width 0 */}
          <span className="min-w-0">
            {/* Name + availability marker share the line; Addendum 2 §1 puts the
                marker inline after the name, inside the existing 1fr cell, so
                neither grid template changes. */}
            <span className="flex items-center gap-[7px] md:gap-[9px] min-w-0">
              {/* §Row: Card Name — 14/15px 600, --fg, ellipsis */}
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
            {/* Mobile type line — §Row: Type Line (mobile): 11.5px, --fg-faint, truncate */}
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

// R4 item 11 / R5 §1. Five pips measure 67px phone and 81px desktop against a
// track of 40px and 54px, so from four up they shingle like a fanned hand
// instead of the track widening: colour identity cannot exceed WUBRG, so five
// is a hard ceiling and this is solved exactly once. One to three pips are
// pixel-identical to what shipped.
//
// Both shadows are unconditional and neither substitutes for the other. The
// inset rim defines a pip against the ROW — `--w` is near-white and needs it at
// every count. The outset ring defines a pip against the pip UNDER it, and it
// gates itself: painted in the row's own background it is invisible with
// nothing beneath it, so there is no pip count to branch on.
//
// The ring rides `--row-bg`, which the row already swaps on hover for the
// marker's seam. A pinned `--surface` would look right at rest and show a
// hairline on hover at four-plus pips.
const SHINGLE_FROM = 4;

function ColorPips({ colorIdentity }: { colorIdentity: BrowseListCard["colorIdentity"] }) {
  const shingled = colorIdentity.length >= SHINGLE_FROM;
  // Colourless draws one grey pip, so it can never shingle.
  const pips: (string | null)[] = colorIdentity.length === 0 ? [null] : [...colorIdentity];

  return (
    <span className={shingled ? "flex" : "flex gap-[3px] md:gap-[4px]"}>
      {pips.map((col, i) => (
        <span
          key={col ?? "colorless"}
          aria-hidden
          className={`w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full ${shingled ? "relative" : ""}`}
          style={{
            background: (col && WUBRG_COLOR[col]) || "var(--fg-faint)",
            boxShadow: "0 0 0 1px var(--row-bg), inset 0 0 0 1px rgba(0,0,0,0.35)",
            // WUBRG left to right with z descending, so each pip's left edge
            // sits above its neighbour and the fan reads in order.
            ...(shingled && { zIndex: pips.length - i }),
            ...(shingled && i > 0 && { marginLeft: -5 }),
          }}
        />
      ))}
    </span>
  );
}

function SetRarityColumn({ card }: { card: BrowseListCard }) {
  return (
    <>
      {/* Mobile: single trailing set code — §Row: Set Code (mobile): mono 10.5px, --fg-faint, letter-spacing 0.04em */}
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
