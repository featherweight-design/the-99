"use client";
// SynergyRow — one row in the commander's synergy card list.
//
// Desktop geometry: ownership dot 7px · name (flex:auto) · type 150px · synergy 64px · inclusion 46px · toggle 34×34
// Phone geometry: ownership dot · name · toggle 44×44; meta line under the name (synergy pts + edhrec %)
//
// Single responsive tree — no md:hidden / hidden md:block pairs that duplicate the DOM.
// The phone meta line (genuinely absent on desktop) is the one exception, marked md:hidden.

import type { CardFacet } from "../../lib/cards/facet";
import { FACET_TYPE_LABEL } from "../../lib/cards/facet";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import type { PriceFact } from "../../lib/decks/price";
import { synergyCopy, synergySignedDisplay } from "../../lib/copy/synergy-discovery";
import { CardDetailTrigger, type Sibling } from "../cards/card-detail-provider";
import { OwnershipDot } from "../ui/ownership-dot";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
import { availabilityState, drawsMarker } from "../../lib/decks/availability";
import { BuyTag } from "../decks/buy-tag";
import { formatPriceFigure, priceState } from "../../lib/decks/price";
import { ROW_GAP_PX, ROW_RADIUS_PX } from "../ui/row-shell";

// ── Figure formatters ────────────────────────────────────────────────────────

function formatSynergyAria(pts: number): string {
  if (pts < 0) return synergyCopy.figure.ariaSynergyMinus(String(Math.abs(pts)));
  return synergyCopy.figure.ariaSynergyPlus(String(pts));
}

/**
 * The slot's clause for an UNOWNED row, spoken.
 *
 * Reads `priceState` rather than the figure, so the four feed readings the tag
 * draws are the four this speaks — and one function decides them, not two.
 */
function priceClauseAria(price: PriceFact | null, newestAsOf: Date | null): string {
  const state = priceState(price, newestAsOf);
  if (state === "soldOut") return synergyCopy.figure.ariaSoldOut;
  if (price === null || state === "absent") return synergyCopy.figure.ariaBuyNoPrice;
  const figure = formatPriceFigure(price, state);
  return figure ? synergyCopy.figure.ariaBuy(figure) : synergyCopy.figure.ariaBuyNoPrice;
}

/**
 * The availability slot, before the toggle.
 *
 * ONE slot, three occupants, sized to the widest rather than to its content: a
 * column that resized per row would walk the toggle up and down the list as the
 * reader scans it.
 *
 * The fixed width is THIS surface's, not a borrowed one. `update-diff-row`'s
 * slot sets no width and returns `null` outright, which it can afford because it
 * sits before a column that holds its own shape; here the slot is the last thing
 * before the toggle, so nothing downstream would hold the line for it.
 *
 * The gate is `owned`, NOT "has a free copy". The two shipped surfaces disagree
 * here — the diff row buys whenever nothing is free, the deck tile draws the
 * marker whenever the card is owned — and the handoff chose the tile's reading
 * for this surface. It is right for a page being browsed: the useful fact about
 * an owned card with no free copy is that you have one and where it went, not
 * what a second copy would cost.
 */
function AvailabilitySlot({
  card,
  newestAsOf,
  selected,
}: {
  card: SynergyCard;
  newestAsOf: Date | null;
  selected: boolean;
}) {
  return (
    <span
      style={{ width: 88, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}
    >
      {!card.owned ? (
        <BuyTag variant="row" price={card.price} newestAsOf={newestAsOf} reserveSlot />
      ) : drawsMarker(card) ? (
        <AvailabilityMarker
          availability={card.availability}
          nameless
          spoken={false}
          // A TOKEN, never a resolved hex: the seam joins the over glyph's two
          // diamonds, and a literal cracks in five of six themes. A selected row
          // sits on a different ground, so it names a different token.
          seam={selected ? "var(--elevated-hover)" : "var(--surface)"}
          className="flex-none font-mono text-[11px]"
        />
      ) : null}
    </span>
  );
}

// ── The row ──────────────────────────────────────────────────────────────────

export function SynergyRow({
  card,
  selected,
  onToggle,
  siblings,
  width,
  facet,
  newestAsOf,
}: {
  card: SynergyCard;
  selected: boolean;
  onToggle: () => void;
  siblings: readonly Sibling[];
  width: "desktop" | "phone";
  facet: CardFacet | "all";
  /**
   * The price table's newest `as_of`. One per panel — see `SynergyPanel`.
   *
   * REQUIRED, completing the chain: `detail.tsx` → `SelectableSynergyPanel` →
   * `SynergyPanel` → here. A default at any link turns a missed integration into
   * a wrong price rather than a type error, which is exactly what shipped — the
   * page passed it to one of two panels and every desktop row read `absent`.
   *
   * The `decks/` components still take it optional. Those are pre-existing and
   * this feature does not touch them; sweeping them is a separate change with
   * its own blast radius, not a line to slip into this one.
   */
  newestAsOf: Date | null;
}) {
  const isPhone = width === "phone";
  const isOver =
    card.owned && card.availability !== null && availabilityState(card.availability) === "over";

  // Type column content: under a single facet, print the real type line.
  // Under "all", print the bucket label only.
  const typeColContent =
    facet === "all" ? FACET_TYPE_LABEL[card.facet] : card.typeLine;

  // Display figures
  const synergyDisplay =
    card.synergyPts !== null
      ? synergySignedDisplay(card.synergyPts)
      : synergyCopy.figure.synergyNone;

  const inclusionDisplay =
    card.inclusionPct !== null
      ? synergyCopy.figure.inclusion(String(card.inclusionPct))
      : synergyCopy.figure.inclusionNone;

  const inclusionMobileDisplay =
    card.inclusionPct !== null
      ? synergyCopy.figure.inclusionMobile(String(card.inclusionPct))
      : synergyCopy.figure.inclusionNone;

  // Aria
  const ownedAria = card.owned ? synergyCopy.figure.ariaOwned : synergyCopy.figure.ariaUnowned;
  const synergyAria =
    card.synergyPts !== null
      ? formatSynergyAria(card.synergyPts)
      : synergyCopy.figure.ariaSynergyNone;
  const inclusionAria =
    card.inclusionPct !== null
      ? synergyCopy.figure.inclusion(String(card.inclusionPct))
      : synergyCopy.figure.ariaInclusionNone;

  // Appended, not substituted: the shipped name carries the ownership word and
  // both figures, and the deck is a further fact about the card rather than a
  // different one.
  // §4.7 — what the SLOT contributes to the row's own label.
  //
  // The <li>'s aria-label replaces everything beneath it, so neither the marker
  // nor the buy tag is spoken on its own. `markerAria` covers the three owned
  // readings and returns null at free; the unowned reading draws a price and
  // `markerAria` has nothing to say about it, which is the gap the readiness
  // audit reopened.
  const slotAria = !card.owned
    ? priceClauseAria(card.price, newestAsOf)
    : card.availability
      ? (markerAria(card.availability) ?? "")
      : "";

  const rowAria = synergyCopy.figure.rowAria(
    card.name,
    ownedAria,
    synergyAria,
    inclusionAria,
    slotAria,
  );

  const toggleAria = selected
    ? synergyCopy.select.removeAria(card.name)
    : synergyCopy.select.addAria(card.name);

  const toggleSize = isPhone ? 44 : 34;

  return (
    <li
      aria-label={rowAria}
      style={{
        display: "flex",
        alignItems: "center",
        gap: isPhone ? ROW_GAP_PX.phone : ROW_GAP_PX.desktop,
        padding: "0 6px 0 12px",
        minHeight: isPhone ? 52 : 44,
        borderRadius: ROW_RADIUS_PX,
        background: selected ? "var(--elevated-hover)" : "var(--surface)",
        // `over` tints the container, on this row as on Role Coverage's — STATES
        // gives it to all four geometries, and it is the one severity loud enough
        // to touch a container. Selection still wins: a row the reader has picked
        // says so first, and its marker is still carrying the shortfall.
        //
        // A token expression rather than the literal the handoff quotes: that
        // value predates the six-theme system and ships nowhere in `src/`.
        border: selected
          ? "1px solid var(--accent-shadow)"
          : isOver
            ? "1px solid color-mix(in srgb, var(--danger) 40%, var(--bg))"
            : "1px solid var(--border)",
        listStyle: "none",
      }}
    >
      {/* Slot 1: ownership dot. TWO states — severity moved to the marker. */}
      <OwnershipDot owned={card.owned} size={7} className="block" />

      {/* Slot 2: name + phone meta line — flex column gap 2px on phone */}
      <div
        style={{
          flex: "auto",
          minWidth: 0,
          ...(isPhone ? { display: "flex", flexDirection: "column", gap: 2 } : {}),
        }}
      >
        <CardDetailTrigger
          oracleId={card.oracleId}
          name={card.name}
          siblings={siblings}
          imageUri={card.imageUri}
          preview
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 13.5,
            color: "var(--fg)",
            textAlign: "left",
            width: "100%",
          }}
        >
          {card.name}
        </CardDetailTrigger>

        {/* Phone meta line: synergy pts · edhrec N% — only shown on phone, hidden on desktop */}
        {isPhone && (
          // No `md:hidden` here: an inline `display` outranks a utility class,
          // so the class never hid anything and only read as if it did. The
          // `isPhone` gate above is the whole of the responsive rule.
          <div
            style={{
              display: "flex",
              gap: 6,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {card.synergyPts !== null ? (
              <span
                aria-hidden="true"
                style={{
                  color:
                    card.synergyPts >= 0 ? "var(--accent)" : "var(--fg-locked)",
                }}
              >
                {synergyDisplay}
              </span>
            ) : (
              <span aria-hidden="true" style={{ color: "var(--fg-locked)" }}>
                {synergyCopy.figure.synergyNone}
              </span>
            )}
            <span aria-hidden="true" style={{ color: "var(--fg-locked)" }}>·</span>
            {/* Inclusion: --fg-faint when present, --fg-locked when absent (em dash) */}
            <span
              aria-hidden="true"
              style={{ color: card.inclusionPct !== null ? "var(--fg-faint)" : "var(--fg-locked)" }}
            >
              {inclusionMobileDisplay}
            </span>
            {/* The slot's third home. No second line and no new row: 52px stays
                52px, and the clause joins the figures it belongs beside. */}
            {!card.owned ? (
              <>
                <span aria-hidden="true" style={{ color: "var(--fg-locked)" }}>·</span>
                {/* FULL density, not `collapsed`. Collapsed draws a bare `$`
                    and moves the figure to `sr-only` — which is right on a list
                    being scanned, and wrong here: the whole point of this slot on
                    the phone is that a card you would have to buy says what it
                    costs before you plan around it. Hiding the amount from the
                    reader who can see would leave the About entry's own key line
                    false at the width most people read on. */}
                <BuyTag variant="row" price={card.price} newestAsOf={newestAsOf} />
              </>
            ) : drawsMarker(card) ? (
              <>
                <span aria-hidden="true" style={{ color: "var(--fg-locked)" }}>·</span>
                <AvailabilityMarker
                  availability={card.availability}
                  nameless
                  spoken={false}
                  seam={selected ? "var(--elevated-hover)" : "var(--surface)"}
                  // The meta line's own 10px. It inherited before, which happened
                  // to be right and was not stated — and the probe could not
                  // measure a size nothing declared.
                  className="flex-none font-mono text-[10px]"
                />
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Slot 3: type column — desktop only (absent on phone) */}
      {!isPhone && (
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            color: "var(--fg-locked)",
            width: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {typeColContent}
        </span>
      )}

      {/* Slot 4: synergy figure — desktop only */}
      {!isPhone && (
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11.5,
            width: 64,
            flexShrink: 0,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            color:
              card.synergyPts === null
                ? "var(--fg-locked)"
                : card.synergyPts >= 0
                  ? "var(--accent)"
                  : "var(--fg-locked)",
          }}
          aria-hidden="true"
        >
          {synergyDisplay}
        </span>
      )}

      {/* Slot 5: inclusion figure — desktop only; absent em dash uses --fg-locked */}
      {!isPhone && (
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            width: 46,
            flexShrink: 0,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            color: card.inclusionPct !== null ? "var(--fg-faint)" : "var(--fg-locked)",
          }}
          aria-hidden="true"
        >
          {inclusionDisplay}
        </span>
      )}

      {/* Slot 5b: availability — desktop only. On the phone it rides the meta
          line under the name, where a 52px row has no second column to give. */}
      {!isPhone && (
        <AvailabilitySlot card={card} newestAsOf={newestAsOf} selected={selected} />
      )}

      {/* Slot 6: toggle button */}
      {/* Toggle: background/border/color are state-driven — genuinely dynamic,
          no static Tailwind class can express the accent vs neutral distinction.
          eslint-disable-next-line comments are below per the rule's own escape hatch. */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={toggleAria}
        onClick={onToggle}
        className="flex shrink-0 cursor-pointer items-center justify-center font-mono"
        style={{
          width: toggleSize,
          height: toggleSize,
          borderRadius: 7,
          // phone: rest 17px / selected 15px; desktop: rest 15px / selected 13px
          fontSize: isPhone ? (selected ? 15 : 17) : (selected ? 13 : 15),
          // eslint-disable-next-line no-restricted-syntax -- border changes with selected state; genuinely dynamic
          border: selected ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
          // eslint-disable-next-line no-restricted-syntax -- background changes with selected state; genuinely dynamic
          background: selected
            ? "color-mix(in oklab, var(--accent) 10%, transparent)"
            : "transparent",
          // eslint-disable-next-line no-restricted-syntax -- color changes with selected state; genuinely dynamic
          color: selected ? "var(--accent)" : "var(--fg-faint)",
        }}
      >
        {selected ? "✓" : "+"}
      </button>
    </li>
  );
}
