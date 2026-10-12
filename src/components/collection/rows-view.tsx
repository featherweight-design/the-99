"use client";
// Dense rows view per property table §Collection Row (State 1a).
// Grid columns:
//   mobile:  38px 1fr 76px auto              (qty · name+type · cost · set)
//   desktop: 52px 1fr 90px 150px 92px 18px   (qty · name · cost · type · set/rarity · chevron)
// Rarity dot colors per §Rarity Dot Colors.

import { hasFrontFaceCost } from "../../lib/cards/faces";
import type { BrowseListCard } from "../../lib/collection/browse";
import { printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { CostPips, COST_PIP_CAP, COST_PIP_SIZE } from "../ui/cost-pips";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { availabilityState } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
import { CardFactMark } from "../cards/card-fact-mark";
import { comboClauseSpoken } from "../cards/combo-clause";
import { ComboMark } from "../cards/combo-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { CollectionMarkKey } from "./collection-mark-key";
import { cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { GhostButton } from "../ui/button";
import { ROW_SHELL_GRID } from "../ui/row-shell";
import { PriceFigure, priceSpoken } from "./price-figure";
import { PreviewButton } from "../ui/preview-button";

const RARITY_DOT: Record<BrowseListCard["rarity"], string> = {
  common: "var(--fg-muted)", uncommon: "var(--fg-body)", rare: "var(--accent)", mythic: "var(--warning)",
};

export function RowsView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
  pendingOracleId = null,
  busy = false,
  showPrice = false,
}: {
  cards: BrowseListCard[];
  /** Sorted by price: the figure leads the type line and is spoken last. Off, the row is as shipped. */
  showPrice?: boolean;
  totalCards: number;
  onShowMore: () => void;
  /**
   * The rows a filter or `Show more` asked for are still arriving (list payload plan, PR 4): the
   * list keeps the rows it drew and says so with `aria-busy`, and `Show more` ignores a press
   * while it waits. No drawn waiting state: the rows land in about one round trip.
   */
  busy?: boolean;
  onOpen: (oracleId: string) => void;
  /** The row whose card is being fetched, which shows the click landed. */
  pendingOracleId?: string | null;
}) {
  return (
    // §Rows Scroll Container: flex-1, padding 2px 12px 12px mobile / 12px 34px 34px desktop, flex column, gap 6/7px
    <div aria-busy={busy || undefined} className="flex-1 flex flex-col gap-[6px] md:gap-[7px] px-[12px] md:px-[34px] pt-[2px] md:pt-[12px] pb-[12px] md:pb-[34px]">
      {/* The gloss travels WITH the view: a surface drawing a wordless mark carries the
          thing that decodes it, rather than trusting a caller to mount one above. */}
      <CollectionMarkKey />
      {cards.map((c) => {
        const state = c.availability ? availabilityState(c.availability) : "free";
        // Addendum 2 §1 gave over-committed a border tint. Card-rows call 4
        // moved it to an inset ring: a tinted border froze the row's hover
        // border, so an over-committed row was the one row on the surface that
        // did not answer the pointer. The ring states the same fact and leaves
        // the border free to do its own job.
        // Border color only: this row also swaps `--row-bg` on hover, which cannot ease, and the
        // availability seam reads it, so the fill must change in the same frame as the seam.
        const border = "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--border-strong)] transition-[border-color]";
        const overRing =
          state === "over" ? "[box-shadow:inset_0_0_0_1px_var(--avail-over-border)]" : "";
        const pending = pendingOracleId === c.oracleId;
        const spokenPrice = showPrice ? priceSpoken(c.price) : null;
        return (
        <PreviewButton
          key={c.oracleId}
          imageUri={c.imageUri}
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
            // The pips are `aria-hidden`, so without this clause a screen-reader user
            // gets no cost at all. `spokenManaCost` speaks every symbol of the front
            // face, never capped, and answers `no mana cost` for a land — which is the
            // honest reading of the empty cell, where the old land branch said nothing
            // and left silence indistinguishable from a missing label.
            `${c.primarySetCode}, ${c.rarity}, ${spokenManaCost(c.manaCost)}`,
            // Clause lands LAST, and only when there is one — a free card
            // produces today's exact string, unchanged.
            (c.availability ? markerAria(c.availability, { nameless: true }) : null) ?? undefined,
            // The facts, spoken once, in the place the reading order wants them. The
            // glyphs beside the name are aria-hidden so this is the only voicing.
            c.facts?.length ? cardMarkCopy.rowAria(c.facts.map(cardFactName)) : null,
            // THE COMBO CLAUSE IS SPOKEN HERE and nowhere else: the glyph is aria-hidden and
            // the visible sentence replaces the type line, which a screen reader would
            // otherwise simply lose. Spoken in FULL — `you own both` rather than the phone's
            // `both yours` — because the shortening is about pixels and nothing here has any.
            c.comboPartner ? comboClauseSpoken(c.comboPartner.name, "ownBoth") : null,
          // The price, last and only while sorted by it: it explains the order, and the figure
          // drawn beside the type line is aria-hidden.
          ) + (spokenPrice ? `, ${spokenPrice}` : "")}
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
              {/* The standing bracket facts, AFTER the name and BEFORE the availability
                  marker. Both already live inline in this same `min-w-0` cell, so the
                  order is the reading order: what the card is, then what this player's
                  copies are doing. `shrink-0` on the mark and `truncate` on the name
                  above means the name gives way and the glyph never does.

                  aria-hidden here, unlike the decklist row, because THIS row composes
                  its own accessible name on the button above — the fact clause is
                  placed there explicitly, after the card's name, rather than being
                  spoken twice out of order. */}
              {(c.facts ?? []).map((fact) => (
                <FactTooltip key={fact} fact={fact}>
                  <CardFactMark fact={fact} silent />
                </FactTooltip>
              ))}
              {/* THE COMBO MARK JOINS THE CLUSTER, last, after Round 1's fixed order. One more
                  16px glyph in a row built for them — the row's height, grid and every column
                  are unchanged, and nothing yields for it. */}
              {c.comboPartner && (
                <ComboMark
                  partnerName={c.comboPartner.name}
                  otherPartners={c.comboOtherPartners ?? 0}
                />
              )}
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
            {/* Mobile type line — §Row: Type Line (mobile): 11.5px, --fg-faint, truncate.
                UNTOUCHED by combo awareness: `/collection` draws a 16px marker in the cluster
                rather than a sentence, so nothing yields and this line stays as it was. */}
            {showPrice ? (
              // Sorted by price, the figure leads the line and never truncates; the type gives way.
              <span className="flex md:hidden min-w-0 items-baseline gap-[6px]">
                <PriceFigure code={c.price} className="font-mono text-[11px] font-medium" />
                <span className="min-w-0 truncate text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
                  {c.typeLine}
                </span>
              </span>
            ) : (
              <span className="block md:hidden truncate text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
                {c.typeLine}
              </span>
            )}
          </span>

          {/* §1b's cost track, now drawn by the app's ONE cost component.
              §1b said "every other card row in the app states mana cost" and then
              stated a mana value beside COLOUR IDENTITY instead — and identity
              folds in every hybrid symbol a card's abilities cost, so `Abzan
              Monument`, whose cost is `{2}` and whose ability costs `{1}{W}{B}{G}`,
              drew a 2 followed by three coloured pips and read as a four-colour
              two-drop. `CostPips` draws the card's own cost and nothing else.

              ONE element with a responsive width, never a desktop copy beside a
              phone copy: a duplicated subtree doubles the pips in the accessibility
              tree and reads as correct to a verifier looking at either width alone.
              A land carries no cost, so the cell is empty — the grid template fixes
              its width, so nothing ragged-edges and there is no disc to keep. */}
          <span className="flex w-[76px] md:w-[90px] items-center justify-end">
            {hasFrontFaceCost(c.manaCost) ? (
              <CostPips cost={c.manaCost} size={COST_PIP_SIZE} cap={COST_PIP_CAP} />
            ) : null}
          </span>

          {/* SetRarityColumn: mobile set code + desktop type/set/rarity/chevron columns */}
          <SetRarityColumn card={c} showPrice={showPrice} />
        </PreviewButton>
        );
      })}

      {cards.length < totalCards && (
        <GhostButton
          type="button"
          onClick={busy ? undefined : onShowMore}
          aria-busy={busy || undefined}
          className="mt-[6px] mx-auto text-[13px] px-[16px] py-[9px]"
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </GhostButton>
      )}
    </div>
  );
}

function SetRarityColumn({ card, showPrice }: { card: BrowseListCard; showPrice: boolean }) {
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
      {showPrice ? (
        <span className="hidden md:flex min-w-0 items-baseline gap-[8px]">
          <PriceFigure code={card.price} className="font-mono text-[11.5px] font-medium" />
          <span className="min-w-0 truncate font-sans text-[12.5px]" style={{ color: "var(--fg-muted)" }}>
            {card.typeLine}
          </span>
        </span>
      ) : (
        <span
          className="hidden md:block truncate font-sans text-[12.5px]"
          style={{ color: "var(--fg-muted)" }}
        >
          {card.typeLine}
        </span>
      )}
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
