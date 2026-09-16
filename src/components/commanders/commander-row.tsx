// The commander row, shared by `/commanders` and `/discover`.
//
// ONE COMPONENT, TWO POPULATIONS. `rec-card.tsx` and `discovery-row.tsx`
// collapse into this: nothing here may be read off ownership (handoff D1), which
// is what cut `not in your collection` — once both lanes draw the same row,
// every `/discover` row is unowned and every `/commanders` row is owned, so the
// line never distinguished anything. A lane-specific line reopens that ruling.
//
// NO `"use client"`. The disclosure trigger retired with the tag list, so the
// row holds no state and announces nothing.
//
// Two sentences and three figures. The first sentence is what the commander
// does, the second is what the reader's collection has never done, and
// everything else waits for Commander Details.

import Link from "next/link";
import { formatCents } from "../../lib/decks/price";
import { commanderRowCopy } from "../../lib/copy/commander-row";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { explainedCopy } from "../../lib/copy/commander-explained";
import type { GapSlot } from "../../lib/edhrec/gap-slot";
import { POOL_WEIGHT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "../../lib/recs/score";
// Type-only, and required rather than stylistic: the price module reaches
// `src/db`, whose body throws when DATABASE_URL is unset. A type-only clause is
// erased at compile time, so none of that reaches the client bundle.
import type { PriceSlot as PriceSlotValue } from "../../lib/discovery/price";
import { ArtWash, INK_SHADOW } from "../ui/art-wash";
import { IdentityPips } from "./commander-art";

const { price: priceCopy, untagged } = discoveryCopy;

/** What a fully measured Fit is out of. A `measurableTotal` below it means the
    synergy component was absent — see `measurableTotalFor`. */
const FULL_FIT = POOL_WEIGHT + ROLES_WEIGHT + SYNERGY_WEIGHT;

/**
 * The band's height, and the portrait's aspect derived from it (208 × 1.37).
 * Unchanged from both retired rows — the handoff keeps the band exactly.
 */
const BAND_HEIGHT = 208;
const PORTRAIT = 285;

/**
 * Where the wash's ramp tops out, in pixels from the foot of the band.
 *
 * ONE VALUE FOR ONE BAND, which is the whole of the handoff's change here: the
 * two retired rows carried 56 and 63 because their blocks differed — one keyed
 * to a rank column, the other to an identity column carrying a type line — and
 * there is now one block under one wash.
 *
 * MEASURED, not derived. The handoff states "one value" and gives no number,
 * and the two old figures were arrived at by adding up padding, glyph and gap
 * heights, which is exactly the arithmetic that put the top of a rank on a
 * rising ramp last time. `probe:commander-row` reads it back.
 */
const LABEL_AT_PX = 56;

/**
 * What the row draws, for either lane.
 *
 * A VIEW TYPE rather than a union of the two payload shapes. The lanes carry
 * different things — the owned lane has fit components and a synergy state, the
 * discover lane has a novelty rank — and a prop union would let this component
 * branch on which lane it was in, which is the ruling it exists to hold.
 */
export type CommanderRowView = {
  slug: string;
  name: string;
  colorIdentity: string[];
  artCropUri: string | null;
  /** Position in the active ordering. Printed, never interpreted. */
  rank: number;
  /** The stored play-style sentence, or null — which unmounts the slot. */
  prose: string | null;
  gapSlot: GapSlot;
  score: number;
  /** What `score` is out of: 100, or 40 where synergy could not be measured.
      Printed as given — never rescaled, and never asserted as a bound. */
  measurableTotal: number;
  deckCount: number | null;
  /**
   * The price slot, which is `absent` for every commander the reader OWNS.
   *
   * §7.4 row 5: the wrapper and its hairline unmount together when absent or
   * owned. `/commanders` lists commanders the reader owns, so its rows always
   * pass `absent` and the lane reads no prices at all — a query deleted rather
   * than a branch added. `/discover` lists what they do not own, which is the
   * only lane with a figure to draw.
   */
  price: PriceSlotValue;
  /** False when the price read FAILED. The figure is omitted rather than drawn
      as `absent`, which would claim the feed has never carried the printing. */
  priceOk: boolean;
  href: string;
};

/**
 * The gap line — never empty, one of three occupants (handoff D2).
 *
 * The union is decided on the server by `gapSlotFor`, so this switch is
 * exhaustive over states rather than re-deriving them from `labels.length`.
 * That is the ruling: a commander with no mechanic tags draws the `No tag data`
 * note and never `allPlayed`, which would assert something about a commander
 * with nothing on file.
 */
function GapLine({ slot }: { slot: GapSlot }) {
  if (slot.kind === "noMechanics") {
    return (
      <p className="font-sans" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-faint)" }}>
        <span style={{ color: "var(--fg-muted)" }}>{untagged.heading}</span> {untagged.body}
      </p>
    );
  }
  const text =
    slot.kind === "allPlayed"
      ? commanderRowCopy.gap.allPlayed
      : commanderRowCopy.gap.unplayed(slot.labels);
  return (
    <p className="font-sans" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)" }}>
      {text}
    </p>
  );
}

/**
 * The price figure. Omitted on an absent slot AND on a failed read — see
 * `priceOk`. A missing figure is omitted, never zeroed (D3).
 */
function PriceFigure({ price, priceOk }: { price: PriceSlotValue; priceOk: boolean }) {
  if (!priceOk || price.kind === "absent") return null;
  const priced = price.kind === "priced";
  const formatted = priced ? formatCents(price.cents) : priceCopy.notStocked;
  return (
    <span className="flex items-center gap-[6px]">
      <span
        aria-hidden="true"
        className="block shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          ...(priced ? { background: "var(--success)" } : { border: "1.5px solid var(--fg-locked)" }),
        }}
      />
      <span
        aria-hidden="true"
        className="font-mono"
        style={{
          fontSize: 12.5,
          // The only magnitude-driven change on the row: one step of emphasis at
          // three figures, same hue family, no semantics.
          color: !priced
            ? "var(--fg-faint)"
            : price.cents >= 10000
              ? "var(--fg)"
              : "var(--fg-body)",
        }}
      >
        {formatted}
      </span>
      <span className="sr-only">
        {priced ? priceCopy.aria(formatted) : priceCopy.notStockedAria}
      </span>
    </span>
  );
}

export function CommanderRow({ item }: { item: CommanderRowView }) {
  // An unmeasured commander keeps its own denominator: `/100` under a score out
  // of 40 would be a reading nobody took.
  //
  // DERIVED FROM `measurableTotal`, never passed alongside it. `measurableTotalFor`
  // returns `POOL + ROLES` when `fitSynergy` is null and the full weight
  // otherwise, so the denominator already carries the fact — and a second field
  // saying the same thing is a field that can disagree with it.
  const fitUnit =
    item.measurableTotal === FULL_FIT
      ? commandersCopy.row.fitDenominator
      : commandersCopy.row.fitDenominatorMeasurable(item.measurableTotal);

  return (
    <div
      className="relative group transition-colors hover:bg-[color:var(--elevated-hover)]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Stretched link keeps the whole row clickable. The row has no other
          control on it, so nothing has to sit above this. */}
      {/* THE NAME COMES FIRST, and the figure after it. This link is an empty
          stretched box, so its `aria-label` IS its whole accessible name — a
          label of `scoreAria` alone gave a screen reader twenty-five links
          called "58 out of 100 points" with no commander anywhere in the list.
          The retired row used `home.cardAria(name)`; the table specifies
          `{name} · Fit {score} of {measurableTotal}`, and that is what this
          composes. */}
      <Link
        href={item.href}
        aria-label={`${item.name} · ${explainedCopy.score.scoreAria(item.score, item.measurableTotal)}`}
        className="absolute inset-0 z-[1]"
      />

      <div className="relative overflow-hidden" style={{ height: BAND_HEIGHT }}>
        <ArtWash
          strategy="left-portrait"
          height={BAND_HEIGHT}
          portrait={PORTRAIT}
          labelAtPx={LABEL_AT_PX}
          artCropUri={item.artCropUri}
          colorIdentity={item.colorIdentity}
        />

        <div className="relative flex h-full items-end gap-[10px] p-[12px_13px] sm:p-[20px_24px]">
          <span
            // `data-wash-label` marks the INK the ramp clears, at both widths:
            // the rank is unplated ink on this wash either way, and marking only
            // one column left the other measurement short.
            data-wash-label
            className="font-mono font-[600] shrink-0"
            style={{
              fontSize: 17,
              color: item.rank === 1 ? "var(--accent)" : "var(--fg-faint)",
              // minWidth, not width: a two-digit rank in a fixed box crowds the
              // name beside it. The floor still aligns single digits.
              minWidth: 16,
              textAlign: "center",
              lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums",
              textShadow: INK_SHADOW,
            }}
          >
            {item.rank}
          </span>

          <div data-wash-label className="flex-1 min-w-0 flex items-center gap-[6px]">
            <span
              className="font-display font-[600] truncate"
              style={{ fontSize: 14.5, lineHeight: 1.2, color: "var(--fg)", textShadow: INK_SHADOW }}
            >
              {item.name}
            </span>
            <IdentityPips colorIdentity={item.colorIdentity} />
          </div>
        </div>
      </div>

      {/* The two sentences and the foot line. Height varies with the sentence
          and with nothing else (D9) — not with the sort, not with the lane, not
          with which occupant the gap slot drew. */}
      <div className="flex flex-col gap-[8px] p-[13px] sm:p-[16px_24px_18px]">
        {/* The sentence UNMOUNTS on null: no placeholder, no reserved height,
            nothing synthesised and nothing truncated into the gap. */}
        {item.prose !== null && (
          <p
            className="font-sans"
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--fg-body)",
              // `-webkit-line-clamp` forces an ATOMIC box, so nothing may be
              // placed after this text inside the same element. The clamp stays
              // regardless of the measure: a sentence overflowing silently is
              // worse than one visibly cut.
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 4,
              overflow: "hidden",
            }}
          >
            {item.prose}
          </p>
        )}

        <GapLine slot={item.gapSlot} />

        <div
          className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]"
          style={{ marginTop: 2 }}
        >
          <span className="flex items-baseline gap-[4px]">
            <span
              aria-hidden="true"
              className="font-mono font-[600]"
              style={{ fontSize: 15, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}
            >
              {item.score}
            </span>
            <span
              aria-hidden="true"
              className="font-mono"
              style={{ fontSize: 10.5, color: "var(--fg-faint)", letterSpacing: "0.04em" }}
            >
              {fitUnit}
            </span>
          </span>

          {/* A figure with no reading is omitted, never zeroed (D3). Nobody has
              built it is a claim an absent deck count cannot make. */}
          {item.deckCount !== null && (
            <>
              <span aria-hidden="true" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
                {commanderRowCopy.figures.separator}
              </span>
              <span className="font-mono" style={{ fontSize: 11.5, color: "var(--fg-faint)" }}>
                {discoverCopy.row.popularity(item.deckCount)}
              </span>
            </>
          )}

          {(item.priceOk && item.price.kind !== "absent") && (
            <span aria-hidden="true" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
              {commanderRowCopy.figures.separator}
            </span>
          )}
          <PriceFigure price={item.price} priceOk={item.priceOk} />
        </div>
      </div>
    </div>
  );
}
