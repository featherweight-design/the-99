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

import { type ReactNode } from "react";
import Link from "next/link";
import { formatCents } from "../../lib/decks/price";
import { commanderRowCopy, type GapPart } from "../../lib/copy/commander-row";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { explainedCopy } from "../../lib/copy/commander-explained";
import type { GapSlot } from "../../lib/edhrec/gap-slot";
import { POOL_WEIGHT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "../../lib/recs/score";
// Type-only, and required rather than stylistic: the price module reaches
// `src/db`, whose body throws when DATABASE_URL is unset. A type-only clause is
// erased at compile time, so none of that reaches the client bundle.
import type { PriceSlot as PriceSlotValue } from "../../lib/discovery/price";
import { fitSegments } from "../../lib/recs/format";
import { ArtWash, INK_SHADOW } from "../ui/art-wash";
import { FitBar } from "./fit-bar";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { IdentityPips } from "./commander-art";
import { PendingTrack } from "../shell/pending-track";

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
  /**
   * The name printed on the copy the player owns, where it differs from the oracle
   * card's. Set by the OWNED lane only: `/discover` lists commanders the player does
   * not own, so there is no copy of theirs to read a name off, and it leaves this
   * absent. Absent and null both draw `name`.
   */
  printedName?: string | null;
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
  /**
   * Fit's three components, for the segmented bar.
   *
   * Hugh's ruling, 2026-09-17, and it overrides the spec rather than
   * implementing it: the ratio bar was CUT, and `FitBar` was recorded as losing
   * its last caller on these rows, because one number was meant to replace the
   * segments. Read on the shipped row the trade went the other way — better
   * information, a less interesting row, and the band's right side empty where
   * the retired four-column grid had been.
   *
   * `fitSynergy` null draws TWO segments, not a zero-width third: the component
   * is absent, not empty, which is the same distinction `measurableTotal`
   * carries at 40.
   */
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
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
 * The Fit chip's plate. `rec-card.tsx` drew exactly this and the handoff reuses
 * the chip UNCHANGED (INDEX: "The Fit chip, `ArtWash`, `IdentityPips` and
 * `PriceSlot` are reused unchanged"), so the values are the retired card's and
 * the R1 canvas draws them back. Its literals resolve to `--bg` for the ground
 * and `--border-strong` for the edge; the hex itself is not repeated here,
 * because `no-hex.test.ts` reads this file and a quoted colour is
 * indistinguishable from a used one.
 */
const FIT_CHIP_STYLE = {
  background: "var(--bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 9,
} as const;

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
      <p
        data-testid="row-gap"
        className="font-sans"
        style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-faint)" }}
      >
        <span style={{ color: "var(--fg-muted)" }}>{untagged.heading}</span> {untagged.body}
      </p>
    );
  }
  // THE MECHANIC NAMES ARE EMPHASISED INSIDE THE SENTENCE, per the canvas —
  // `--fg` at 600 against the sentence's `--fg-muted`. They are what the reader
  // scans this line for, and the sentence around them is the same eleven words
  // on every row.
  //
  // Rendered from the parts builders, which are each sentence's one definition;
  // the string forms are derived from them, so the spoken string and the drawn
  // runs cannot disagree.
  // BOTH NAMED STATES NAME MECHANICS, and both mark them. `allPlayed` used to
  // be the one occupant with nothing in it — a sentence about the reader with no
  // mechanic in sight, and the majority voice of both lanes. It now prints the
  // commander's own top themes and claims nothing about the reader's decks.
  const parts: GapPart[] =
    slot.kind === "allPlayed"
      ? commanderRowCopy.gap.topStylesParts(slot.labels, slot.capped)
      : commanderRowCopy.gap.unplayedParts(slot.labels);
  return (
    // `data-testid`: the gap line is a bare `<p>` with no clamp, and
    // `probe:commander-row` was selecting it as "any unclamped `main p`" —
    // which also catches the page header, the rack, banners and empty states,
    // so its count could be positive with no row gap line on screen at all.
    // Named by review. A marker is the only thing that says which `<p>` this is.
    <p
      data-testid="row-gap"
      className="font-sans"
      style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)" }}
    >
      {parts.map((part, i) =>
        typeof part === "string" ? (
          part
        ) : (
          <b key={i} className="font-[600]" style={{ color: "var(--fg)", fontWeight: 600 }}>
            {part.label}
          </b>
        ),
      )}
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

  // THE FOOT LINE IS THE COUNT AND THE PRICE. Fit is not in it — it is the
  // plated chip up in the band, per the canvas. Both remaining figures drop out
  // when they have no reading (D3): omitted, never zeroed, and their separators
  // fall out with them.
  const priceDrawn = item.priceOk && item.price.kind !== "absent";
  const figures: { key: string; node: ReactNode }[] = [
    ...(item.deckCount !== null
      ? [
          {
            key: "decks",
            node: (
              <span className="font-mono" style={{ fontSize: 11.5, color: "var(--fg-faint)" }}>
                {discoverCopy.row.popularity(item.deckCount)}
              </span>
            ),
          },
        ]
      : []),
    ...(priceDrawn
      ? [{ key: "price", node: <PriceFigure price={item.price} priceOk={item.priceOk} /> }]
      : []),
  ];

  return (
    <div
      // The row holds its hover fill while its link is pending (navigation-pending handoff, P2).
      className="relative group transition-colors hover:bg-[color:var(--elevated-hover)] has-[[data-pending]]:bg-[color:var(--elevated-hover)]"
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
        aria-label={`${commanderDisplayName(item)} · ${explainedCopy.score.scoreAria(item.score, item.measurableTotal)}`}
        className="absolute inset-0 z-[1] overflow-hidden"
      >
        {/* The row's own pending track, along its bottom edge. */}
        <PendingTrack href={item.href} />
      </Link>

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
              {commanderDisplayName(item)}
            </span>
            <IdentityPips colorIdentity={item.colorIdentity} />
          </div>

          {/* THE FIT CHIP, IN THE BAND — plated, opposite the name, which is
              where the R1 canvas draws it and where `rec-card.tsx` drew it
              before. An earlier build of this row put the bare figure in the
              foot line instead: that is the defect behind the reported "empty
              space on the right", because the band's whole right side was the
              chip's and nothing replaced it.

              `items-end` on the row above puts the chip on the name's baseline,
              as the retired card did. `sr-only` carries the reading because the
              band has no room for the long denominator beside a 27px figure —
              and the stretched link's own name carries it too. */}
          <div
            className="flex flex-col items-center shrink-0 px-[9px] py-[6px] sm:px-[11px] sm:py-[7px]"
            style={FIT_CHIP_STYLE}
          >
            <span className="sr-only">
              {explainedCopy.score.scoreAria(item.score, item.measurableTotal)}
            </span>
            <span
              aria-hidden="true"
              className="font-mono font-[600]"
              style={{
                fontSize: 22,
                color: "var(--fg)",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {item.score}
            </span>
            <span
              aria-hidden="true"
              className="font-mono"
              style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--fg-faint)" }}
            >
              {fitUnit}
            </span>
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
            // FOUR LINES ON THE PHONE, TWO FROM `sm` UP — the two budgets the
            // handoff drew (2 at a 760px measure, 4 at 330px), not one value for
            // both. A flat 4 let a long sentence take three or four lines on
            // desktop where the drawing allows two, and the handoff's own
            // remedy for a clip there is to WIDEN THE MEASURE rather than add a
            // third line. Named by review.
            //
            // `line-clamp` forces an ATOMIC box, so nothing may be placed after
            // this text inside the same element. The clamp stays at both widths
            // regardless: a sentence overflowing silently is worse than one
            // visibly cut.
            className="font-sans line-clamp-4 sm:line-clamp-2"
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--fg-body)",
            }}
          >
            {item.prose}
          </p>
        )}

        <GapLine slot={item.gapSlot} />

        {/* ONE LIST, JOINED — never a separator whose condition is spelled
            beside the figure's. The previous form rendered the price's separator
            under its own copy of `priceOk && kind !== "absent"`, which is the
            same predicate `PriceFigure` applies: two spellings of one rule, free
            to drift the moment either moves. Review asked for the list, having
            read the duplication as an orphaned separator — the orphan was not
            reachable, because the Fit chip is unconditional and always precedes,
            but the duplication was real.

            A figure with no reading is omitted, never zeroed (D3): an absent
            deck count and a lost price read both drop out of the list, and the
            separators fall out with them rather than being suppressed. */}
        <div
          data-testid="row-figures"
          className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]"
          style={{ marginTop: 2 }}
        >
          {figures.map((figure, i) => (
            // THE SEPARATOR TRAVELS WITH THE FIGURE IT PRECEDES, in one flex
            // item. As two siblings in a wrapping row they split at the break:
            // the contact sheet showed `1,179 decks tracked ·` ending a line with
            // the price on the next, which is the dangling separator round 1
            // reported — reachable by WRAPPING rather than by a null field, which
            // is why the null-field reading of it was wrong and the fix is still
            // owed. Found by looking at the sheet.
            <span key={figure.key} className="flex items-center gap-x-[10px]">
              {i > 0 && (
                <span aria-hidden="true" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
                  {commanderRowCopy.figures.separator}
                </span>
              )}
              {figure.node}
            </span>
          ))}

          {/* THE SOURCE STAMP SITS AT THE LINE'S END — `ml-auto`, which is what
              the R1 canvas draws (`margin-left:auto`, 10px, `--fg-locked`) and
              what `rec-card.tsx` did before it.

              It is drawn HERE rather than inside `PriceFigure`, and that is the
              whole reason this is a separate node: an `auto` margin resolves
              against the nearest flex container, and inside the figure it
              resolved against the separator wrapper — a 6px nudge that reads as
              the rule not working at all. Found by looking at the sheet.

              Still the price's own label in every other sense: it draws on
              exactly `priceDrawn`, so it unmounts with the figure and never
              stands alone. And it keeps the shipped `manapool` string — the
              canvas letters it `Mana Pool`, but §C names `PriceSlot` unchanged
              ("its dot, its source label, its absent rule"), so the lettering
              is a drawing of the slot and not a new string. Erratum, recorded
              in the property table.

              Decorative: `PriceFigure`'s sr-only sentence carries the reading. */}
          {priceDrawn && (
            <span
              aria-hidden="true"
              className="font-mono ml-auto"
              style={{ fontSize: 10, color: "var(--fg-locked)" }}
            >
              {priceCopy.source}
            </span>
          )}
        </div>

        {/* THE FIT BAR, BELOW THE FIGURES AT BOTH WIDTHS — the figure above,
            its parts beneath it, which is the order the retired card drew and
            the order Hugh named on 2026-09-17. `rec-card.tsx` put the Fit
            figure in a plated chip at the band's top right and the bar in a
            206px column below the divider; a bar mounted in the band beside
            the art was tried first and is wrong on both counts.

            Full measure rather than 206px: there is no data-zone grid in this
            composition to give it a column, so it takes the block's own width
            and stops at 520px — past that the three segments read as a
            progress meter for the row rather than a breakdown of one figure.

            `aria-hidden`: the link's own name already carries Fit. The legend
            is drawn from `sm` up by `FitBar` itself, so passing `legend`
            unconditionally still hides the labels on a 390px foot line. */}
        <div
          aria-hidden="true"
          className="w-full"
          style={{ marginTop: 2, maxWidth: 520 }}
        >
          <FitBar fit={fitSegments(item)} legend />
        </div>
      </div>
    </div>
  );
}
