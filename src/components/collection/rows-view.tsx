"use client";
// Dense rows view per property table §Collection Row (State 1a).
// Grid columns:
//   mobile:  38px 1fr 76px auto              (qty · pips · name+type · set)
//   desktop: 52px 1fr 90px 150px 92px 18px   (qty · pips · name · type · set/rarity · chevron)
// Rarity dot colors per §Rarity Dot Colors.

import type { BrowseListCard } from "../../lib/collection/browse";
import { printedFaceName, printedNameOf, WUBRG_COLOR } from "../../lib/collection/browse";
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
  pendingOracleId = null,
}: {
  cards: BrowseListCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
  /** The row whose card is being fetched, which shows the click landed. */
  pendingOracleId?: string | null;
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
        const pending = pendingOracleId === c.oracleId;
        return (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // Never `disabled`, for the reason CardDetailTrigger states: disabling
          // the focused row blurs it, and the modal's focus-return would then
          // have nothing to hand focus back to on close.
          aria-busy={pending}
          style={pending ? { opacity: 0.55 } : undefined}
          // The FULL printed name, both faces of a two-faced card included — the
          // visible caption below is the front face and may clip, and this is a
          // real button, so the whole string is spoken here.
          aria-label={availabilityCopy.collection.rowAria(
            printedNameOf(c),
            c.typeLine,
            c.quantity,
            // §1b put a mana value on the row; without it here a screen-reader user gets
            // the identity pips' information and not the cost beside them. Lands carry no
            // clause at all, matching the empty disc they draw.
            `${c.primarySetCode}, ${c.rarity}${
              c.typeLine.toLowerCase().includes("land") ? "" : `, mana value ${c.cmc}`
            }`,
            // Clause lands LAST, and only when there is one — a free card
            // produces today's exact string, unchanged.
            (c.availability ? markerAria(c.availability, { nameless: true }) : null) ?? undefined,
          )}
          // §Row Container: grid template columns, gap 10/16px, padding 10px 12px / 12px 18px, radius 7px, bg --surface, border 1px --border
          // Background and border are utilities, not inline style: inline values
          // outrank the hover: variants and neither hover state ever lands.
          className={`${ROW_SHELL_GRID} text-left gap-[10px] md:gap-[16px] py-[10px] md:py-[12px] px-[12px] md:px-[18px] md:cursor-pointer bg-[color:var(--surface)] hover:bg-[color:var(--surface-raised)] [--row-bg:var(--surface)] hover:[--row-bg:var(--surface-raised)] ${border} ${overRing} [grid-template-columns:38px_1fr_76px_auto] md:[grid-template-columns:52px_1fr_90px_150px_92px_18px]`}
        >
          {/* Quantity — §Row: Quantity Column: mono 13px mobile / 14px desktop, --accent, font-weight 500 */}
          <span className="font-mono text-[13px] md:text-[14px] font-medium" style={{ color: "var(--accent)" }}>
            ×{c.quantity}
          </span>

          {/* Name column — §Row: Name Column Container: min-width 0 */}
          <span className="min-w-0">
            {/* Name + availability marker share the line; Addendum 2 §1 puts the
                marker inline after the name, inside the existing 1fr cell, so
                neither grid template changes. */}
            <span className="flex items-center gap-[7px] md:gap-[9px] min-w-0">
              {/* §Row: Card Name — 14/15px 600, --fg, ellipsis. The name printed
                  on the copy the player owns, front face only, single line.
                  The `title` that used to carry the full string is gone: it is
                  pointer-only recovery on a phone-first surface, and it would
                  hover a stale oracle name over a printed one. The whole string
                  rides the row button's own `aria-label` above — a real control
                  — and the modal is the recovery path for the clip. */}
              <span
                className="truncate min-w-0 text-[14px] md:text-[15px] font-semibold"
                style={{ color: "var(--fg)" }}
              >
                {printedFaceName(c)}
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

          {/* §1b — the cost track. Every other card row in the app states mana cost; the
              collection row stated colour identity alone.

              ONE element with a responsive width, never a desktop copy beside a phone
              copy: a duplicated subtree doubles the pips in the accessibility tree and
              reads as correct to a verifier looking at either width alone. */}
          <CostTrack card={c} className="flex w-[76px] md:w-[90px]" />

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

/**
 * §1b — mana value and colour identity in one right-aligned track.
 *
 * A parity fix: every other card row in the app states mana cost, and this one stated
 * colour identity alone. The identity pips leave the leading slot and join a fixed 90px
 * track (76px on the phone's meta line), which is deck-versioning's un-shingled track at
 * the size it already ships. The name column gains the width the pips vacated.
 *
 * A LAND KEEPS AN EMPTY DISC RATHER THAN PRINTING `0`. Thirty-seven land rows printing a
 * figure where there is an absence would be a claim about cost that lands do not make,
 * and dropping the disc entirely would ragged-edge the track.
 */
function CostTrack({ card, className }: { card: BrowseListCard; className: string }) {
  const isLand = card.typeLine.toLowerCase().includes("land");
  return (
    <span className={`${className} items-center justify-end gap-[8px]`}>
      <span
        aria-hidden={isLand}
        className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center
                   rounded-full font-mono text-[11px]"
        style={{
          background: "var(--surface-sunken)",
          color: isLand ? "transparent" : "var(--fg-muted)",
        }}
      >
        {isLand ? "" : card.cmc}
      </span>
      <ColorPips colorIdentity={card.colorIdentity} />
    </span>
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
