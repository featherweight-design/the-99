"use client";
// The discovery row (§7.1–§7.5). `RecCard` delegates its discovery arm here.
//
// A separate FILE, not a separate component per sort: the README forbids
// forking the row into `FitCard` / `NoveltyCard`, which would duplicate the
// grid, the link, the chips and the count stack. Everything below is one
// component with one branching slot. What is split off from `rec-card.tsx` is
// the SCOPE — the owned row prints a score, fit segments and a synergy state
// that `DiscoveryItem` does not carry, so the two share their pieces
// (`ArtWash`, `IdentityPips`, `RoleChips`) by import rather than by an
// ever-widening prop union.
//
// The right column is counts, never a score: discovery does not blend, so there
// is no 0–100 figure to print and no previous reading to delta against. What it
// carries is the support count over the EDHREC total with a single-fill ratio
// bar, the deck count, and the novelty count — three figures the app can
// produce. Gone with the score: the availability receipt and the named
// receipts, both of which are claims about a pool this lane does not score.

import Link from "next/link";
import { useState } from "react";
import { formatCents } from "../../lib/decks/price";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { discoverCopy } from "../../lib/copy/lanes";
import { planeCopy } from "../../lib/copy/commanders-plane";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is
// unset and pulls the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import { FLOOR_PCT } from "../../lib/discovery/floor";
import type { DiscoveryItem } from "../../lib/discovery/list";
import type { PriceSlot } from "../../lib/discovery/price";
import { ArtWash, INK_SHADOW } from "../ui/art-wash";
import { IdentityPips } from "./commander-art";
import { Emphasised, localised } from "./emphasis";
import { RoleChips } from "./role-chips";
import { commanderDetailHref } from "./list-nav";

const { justify, ownership, price: priceCopy, untagged } = discoveryCopy;
const overflowCopy = planeCopy.overflow;

/** §4 — a chip over art takes an opaque plate and a hairline, as the deck tile's
    status pill does. The support figure and its unit ride in it together. */
const SUPPORT_CHIP_STYLE = {
  background: "var(--bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 9,
} as const;

/** The overlap track — the support count as a proportion of the EDHREC total.
    A single fill, not the owned lane's three-segment ramp: this is two real
    counts divided, and there is nothing here to split into contributions. */
function OverlapTrack({ pct, width }: { pct: number; width: number | string }) {
  return (
    <span
      className="block overflow-hidden rounded-full shrink-0"
      style={{ width, height: 6, background: "var(--elevated)" }}
    >
      <span className="block h-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
    </span>
  );
}

/** The three tag names the design draws, plus whatever the copy module appends
    for the rest. The bold run is the names and their separators only, so the
    accent keeps marking the sort key and nothing else.
    Open, the bold run grows to every name and the count clause becomes `show
    fewer`; the row's composition is otherwise untouched, so it grows only by the
    lines the names need. */
function tagSentence(item: DiscoveryItem, open: boolean) {
  const first = item.unplayedLabels.slice(0, 3);
  const extra = Math.max(0, item.unplayedCount - first.length);
  const names = open ? item.unplayedLabels : first;
  const bold = names.join(" · ");
  // What `tagList` puts BETWEEN the names and the count, taken from the shipped
  // sentence rather than restated here: a closed row with nothing to disclose
  // prints no separator, and one with something to disclose is byte-identical to
  // what shipped until the trigger is used.
  const closed = justify.tagList(first, extra);
  const separator =
    extra > 0
      ? closed.slice(first.join(" · ").length, closed.length - overflowCopy.more(extra).length)
      : "";
  const tail = item.nearestDeck
    ? justify.distanceNear(
        item.nearestDeck.deckName,
        justify.sharedList(item.nearestDeck.sharedLabels, item.nearestDeck.extraShared),
      )
    : justify.distanceNone;
  return { bold, separator, extra, total: item.unplayedCount, tail };
}

/**
 * The names, then the nearest-deck clause. A commander every one of whose
 * archetypes the player has already built has no names to lead with, so the
 * separator belongs to them — printed unconditionally it opens the sentence on
 * a stray period. Shared by both widths so the two cannot diverge on it.
 *
 * The count clause is the trigger (#343): it is already the only text standing
 * for hidden content, so no glyph, chevron or second control is introduced. It
 * is not brass even inside the accented run — brass marks the sort key, and a
 * disclosure is not evidence.
 *
 * The sentence's prose is `aria-hidden` and the trigger is not: the row's link
 * already announces how many archetypes are new, and the button carries its own
 * name. A trigger inside an `aria-hidden` subtree would be a control no screen
 * reader could find, which is the one part of this sentence that is not prose.
 */
function TagSentence({
  tags,
  name,
  open,
  onToggle,
}: {
  tags: ReturnType<typeof tagSentence>;
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {tags.bold ? (
        <>
          <span aria-hidden="true">
            <b style={{ color: "var(--accent)", fontWeight: 600 }}>{tags.bold}</b>
            {tags.separator}
          </span>
          {tags.extra > 0 ? (
            // `z-[2]`, above the row's stretched link: without it the trigger is
            // drawn but every click opens the commander instead. The padding
            // grows the touch target and the equal negative margin takes that
            // growth back out of the sentence, so the words around it sit where
            // they did before the trigger existed.
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-label={
                open ? overflowCopy.fewerAria(name) : overflowCopy.moreAria(tags.total, name)
              }
              className="relative z-[2] cursor-pointer -mx-[2px] -my-[6px] px-[2px] py-[6px] text-[color:var(--fg-body)] [border-bottom:1px_dotted_var(--fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
            >
              {open ? overflowCopy.fewer : overflowCopy.more(tags.extra)}
            </button>
          ) : null}
          {/* The disclosure has to disclose something to a screen reader too. The
              prose it expands is `aria-hidden`, so opened, the names are spoken
              here instead — the one part of that sentence the trigger exists to
              reveal, and nothing the row's link already said. */}
          {tags.extra > 0 && open ? <span className="sr-only">{tags.bold}</span> : null}
          <span aria-hidden="true">. </span>
        </>
      ) : null}
      <span aria-hidden="true">{tags.tail}</span>
    </>
  );
}

function UntaggedNote() {
  return (
    <div
      className="flex items-center gap-[9px] rounded-[7px]"
      style={{
        background: "var(--elevated-hover)",
        border: "1px solid var(--border-strong)",
        borderLeft: "2px solid var(--fg-faint)",
        padding: "9px 13px",
      }}
    >
      <span aria-hidden="true" style={{ color: "var(--fg-faint)", fontSize: 13 }}>
        ⚠
      </span>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
        <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>
          {untagged.heading}
        </strong>{" "}
        — {untagged.body}
      </div>
    </div>
  );
}

/**
 * The hairline belongs to the slot, not to the column: an absent price leaves
 * no orphaned divider, no dash and no reserved height. `absent` covers three
 * different reasons — never priced, live but priceless, and owned — and says
 * nothing about any of them, because a missing figure is omitted, never zeroed.
 */
function PriceSlot({ price, mobile }: { price: PriceSlot; mobile: boolean }) {
  if (price.kind === "absent") return null;
  const priced = price.kind === "priced";
  const formatted = priced ? formatCents(price.cents) : priceCopy.notStocked;
  return (
    <div
      className="flex items-center gap-[7px]"
      style={{
        marginTop: mobile ? undefined : 4,
        paddingTop: mobile ? 9 : 10,
        borderTop: "1px solid var(--border)",
      }}
    >
      <span
        aria-hidden="true"
        className="block shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          ...(priced
            ? { background: "var(--success)" }
            : { border: "1.5px solid var(--fg-locked)" }),
        }}
      />
      <span
        aria-hidden="true"
        className="font-mono"
        style={{
          fontSize: mobile ? 11.5 : 12.5,
          // The only magnitude-driven change on the row: one step of emphasis
          // at three figures, same hue family, no semantics.
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
      <span
        aria-hidden="true"
        className="font-mono"
        style={{
          fontSize: mobile ? 9.5 : 10,
          color: "var(--fg-locked)",
          marginLeft: "auto",
        }}
      >
        {priceCopy.source}
      </span>
    </div>
  );
}

export function DiscoveryRow({
  item,
  rank,
  sort,
}: {
  item: DiscoveryItem;
  rank: number;
  sort: "fit" | "new";
}) {
  // `edhrec_total` is the denominator, and a row with N and no M prints neither
  // figure and falls back to the rest of the stack. Nothing is substituted for
  // it — not 99, not the pool size.
  const total = item.edhrecTotal;
  const hasFigure = total !== null && total > 0;
  const overlapPct = hasFigure ? Math.round((item.ownedSupport / total) * 100) : 0;
  const [support, supportUnit] = discoverCopy.row.supportOwned(item.ownedSupport, total ?? 0);

  const fit = sort === "fit";
  // One state for both widths, so the phone and the desktop rendering of the
  // same row can never disagree about how many archetypes it is showing.
  const [openTags, setOpenTags] = useState(false);
  const tags = fit ? null : tagSentence(item, openTags);

  const justifyAria = !hasFigure
    ? null
    : fit
      ? // "this commander" rather than the name: `rowLabel` already opens on
        // `item.name`, and naming it again here would say it twice in one label.
        justify.overlap(item.ownedSupport, total)
      : justify.distanceAria(item.unplayedCount, item.tagTotal);

  // Ownership leads, before any figure, and the figures follow in the order the
  // eye reads them. The visible prose is `aria-hidden` where it would repeat
  // this, so nothing is announced twice. Controls inside that prose are not:
  // see `TagSentence`.
  const rowLabel = [item.name, ownership.unownedAria, justifyAria]
    .filter(Boolean)
    .join(" · ");

  const showUntagged = fit && item.tagTotal === 0;

  // The discover lane has no availability control, so every row here is scored
  // and linked against the whole collection. A constant rather than a prop: a
  // caller cannot pass anything else, and this is where that fact is stated.
  const avail = "all" as const;
  const href = commanderDetailHref(item.slug, avail);

  /** The two counts that sit under the ratio bar at both widths. Shared so the
      phone's folded line and the desktop stack cannot disagree about which
      figures are present — an absent deck count prints no line rather than a
      zero, because nobody has counted is not nobody has built. */
  const counts = (fontSize: number) => (
    <>
      {item.deckCount !== null && (
        <p
          aria-hidden="true"
          className="m-0 font-mono"
          style={{ fontSize, lineHeight: 1.5, color: "var(--fg-body)" }}
        >
          <Emphasised
            text={discoverCopy.row.popularity(item.deckCount)}
            values={[localised(item.deckCount)]}
            color="var(--fg)"
          />
        </p>
      )}
      <p
        aria-hidden="true"
        className="m-0 font-mono"
        style={{ fontSize, lineHeight: 1.5, color: "var(--fg-body)" }}
      >
        <Emphasised
          text={discoverCopy.row.novelty(item.unplayedCount)}
          values={[localised(item.unplayedCount)]}
          color="var(--fg)"
        />
      </p>
    </>
  );

  return (
    // The row separator, which is not §4's divider: one tells this row from the
    // next, the other tells the band from the data.
    <div
      className="relative group transition-colors hover:bg-[color:var(--elevated-hover)]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Stretched link keeps the whole row clickable. Brand focus-visible
          outline inherited from globals.css. */}
      <Link
        href={href}
        aria-label={`${rowLabel} — view commander details`}
        className="absolute inset-0 z-[1]"
      />

      {/* §4 — the wash owns one band, and the band states its height in px:
          decision 8 derives the portrait's geometry from that figure, so a row
          grown by a long tag sentence used to over-scale the crop. */}
      <div className="discovery-band relative overflow-hidden" style={{ height: 208 }}>
        <ArtWash
          strategy="left-portrait"
          height={208}
          // 285 is `208 × 1.37`, the crop's own aspect: the height is chosen for
          // what the box is for — a full-width result row you scan down — and the
          // portrait follows from it.
          portrait={285}
          // The block's measured height in pixels from the foot, keyed to the
          // TALLEST UNPLATED INK this one wash sits under — which is the rank
          // column, not the name. Desktop stacks 24px of padding under a 19px
          // rank at 1, a 7px gap and a 6px diamond: 56. The identity column
          // beside it is 43, and keying to that left the top of the rank on a
          // rising ramp, because a rank is ink on this band exactly as the name
          // is. The support chip plates itself and stands outside the
          // measurement.
          //
          // The owned lane's row is 63 for the same reason read the other way:
          // its identity column carries a type line the rank column's height does
          // not beat. Two rows of one class differ here because their blocks
          // differ, not because their bands do.
          labelAtPx={56}
          artCropUri={item.artCropUri}
          colorIdentity={item.colorIdentity}
        />

        {/* ── Mobile band: rank, name and pips, support pinned to the trailing
            edge — the slot the owned lane gives its fit figure, because the
            support count is what this lane's default rank is on. ── */}
        <div className="relative flex h-full items-end gap-[10px] p-[12px_13px] sm:hidden">
          <span
            // `data-wash-label` here too: the rank is unplated ink on this wash
            // at BOTH widths, and marking only the identity column left the phone
            // measurement short of the ink it has to clear. Desktop's rank is what
            // the figure is keyed to; the phone's is shorter, and the probe takes
            // the taller of whatever is marked.
            data-wash-label
            className="font-mono font-[600] shrink-0"
            // minWidth, not width: a two-digit rank in a fixed box crowds the
            // name beside it. The floor still aligns the single digits, which
            // is what the fixed width was for.
            style={{
              fontSize: 17,
              color: rank === 1 ? "var(--accent)" : "var(--fg-faint)",
              minWidth: 16,
              textAlign: "center",
              lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums",
              textShadow: INK_SHADOW,
            }}
          >
            {rank}
          </span>

          {/* `data-wash-label` marks the INK the ramp exists for, not the
              breakpoint wrapper around it: that wrapper is `h-full` and spans the
              whole band. The support chip beside this column plates itself and
              stands outside the measurement by design. */}
          <div data-wash-label className="flex-1 min-w-0 flex items-center gap-[6px]">
            <span
              className="font-display font-[600] truncate"
              style={{ fontSize: 14.5, lineHeight: 1.2, color: "var(--fg)", textShadow: INK_SHADOW }}
            >
              {item.name}
            </span>
            <IdentityPips colorIdentity={item.colorIdentity} />
          </div>

          {hasFigure && (
            <div
              aria-hidden="true"
              className="flex shrink-0 flex-col items-center px-[8px] py-[5px]"
              style={SUPPORT_CHIP_STYLE}
            >
              <span
                className="font-mono font-[600]"
                style={{
                  fontSize: 20,
                  color: "var(--fg)",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {support}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--fg-faint)" }}
              >
                {supportUnit}
              </span>
            </div>
          )}
        </div>

        {/* ── Desktop band: grid 24px 1fr auto ── */}
        <div
          className="relative hidden h-full sm:grid p-[24px_26px]"
          style={{
            gridTemplateColumns: "24px 1fr auto",
            gap: 20,
            alignItems: "end",
          }}
        >
          {/* Rank column. Brass at rank 1, and the diamond below it.

              `data-wash-label` because this is the TALLEST unplated ink on the
              band — 24px of padding under a 19px numeral, a 7px gap and a 6px
              diamond — and it is what `labelAtPx` is keyed to. Marking only the
              identity column left the probe measuring 43 while the figure was 56,
              so the one thing that figure exists for went unchecked. */}
          <div data-wash-label className="flex flex-col items-center gap-[7px]">
            <span
              className="font-mono font-[600]"
              style={{
                fontSize: 19,
                color: rank === 1 ? "var(--accent)" : "var(--fg-faint)",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                textShadow: INK_SHADOW,
              }}
            >
              {rank}
            </span>
            <span
              aria-hidden="true"
              className="block shrink-0"
              style={{
                width: 6,
                height: 6,
                transform: "rotate(45deg)",
                background: rank === 1 ? "var(--accent)" : "var(--border-strong)",
              }}
            />
          </div>

          <div data-wash-label className="flex items-center gap-[8px]" style={{ minWidth: 0 }}>
            <h3
              className="font-display font-[600] m-0 truncate"
              style={{
                fontSize: 17,
                color: "var(--fg)",
                lineHeight: 1.1,
                textShadow: INK_SHADOW,
              }}
            >
              {item.name}
            </h3>
            <IdentityPips colorIdentity={item.colorIdentity} />
          </div>

          {hasFigure ? (
            <div
              aria-hidden="true"
              className="flex flex-col items-center px-[11px] py-[7px]"
              style={SUPPORT_CHIP_STYLE}
            >
              <span
                className="font-mono font-[600]"
                style={{
                  fontSize: 27,
                  color: "var(--fg)",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {support}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--fg-faint)" }}
              >
                {supportUnit}
              </span>
            </div>
          ) : (
            <span />
          )}
        </div>
      </div>

      {/* §4 — below the divider, on flat ground: every figure the row reports. */}
      <div
        className="discovery-data-zone relative"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface-inset)" }}
      >
        {/* ── Mobile data ── */}
        <div className="flex flex-col gap-[9px] p-[12px_13px] sm:hidden">
          {hasFigure && <OverlapTrack pct={overlapPct} width="100%" />}

        {/* The two counts share a line and neither is dropped: below
            360 they drop a half point rather than one of them going. */}
        <div className="flex flex-wrap gap-x-[12px] gap-y-[2px] text-[10px] min-[360px]:text-[10.5px]">
          {counts(10.5)}
        </div>

        <RoleChips roleCounts={item.roleCounts} />

        {tags && (
          <p className="m-0" style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-body)" }}>
            <TagSentence
              tags={tags}
              name={item.name}
              open={openTags}
              onToggle={() => setOpenTags((v) => !v)}
            />
          </p>
        )}

        {/* The floor explains presence, never position, so it is never added to
            the figure above it. */}
        {!fit && item.supportPct !== null && (
          <p className="m-0 font-mono" style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>
            {justify.floorNoteShort(FLOOR_PCT, item.supportPct)}
          </p>
        )}

        {showUntagged && <UntaggedNote />}

        <p
          aria-hidden="true"
          className="m-0 font-mono"
          style={{ fontSize: 10.5, color: "var(--fg-faint)" }}
        >
          {discoverCopy.row.notOwned}
        </p>

        <PriceSlot price={item.price} mobile />
        </div>

        {/* ── Desktop data. The band's column template again, so the evidence
            starts under the name rather than under the rank. ── */}
        <div
          className="relative hidden sm:grid p-[24px_26px]"
          style={{
            gridTemplateColumns: "24px 1fr 246px",
            gap: 20,
            alignItems: "start",
          }}
        >
        {/* Evidence column */}
        <div className="flex flex-col gap-[13px]" style={{ gridColumn: 2, minWidth: 0 }}>
          <RoleChips roleCounts={item.roleCounts} />

          {/* The justification slot. Under fit the stack beside it already
              carries the whole argument, so nothing is restated here; under
              novelty the archetype names are evidence the stack's count cannot
              give, and they sit on the owned row's Synergy y. */}
          {tags && (
            <div className="flex items-baseline gap-[10px]">
              <span
                aria-hidden="true"
                className="font-mono shrink-0"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--fg-faint)",
                }}
              >
                {justify.distanceLabel}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-body)" }}>
                <TagSentence
                  tags={tags}
                  name={item.name}
                  open={openTags}
                  onToggle={() => setOpenTags((v) => !v)}
                />
              </span>
            </div>
          )}

          {!fit && item.supportPct !== null && (
            <p
              className="m-0 font-mono"
              style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--fg-faint)" }}
            >
              <Emphasised
                text={justify.floorNote(FLOOR_PCT, item.supportPct)}
                // Both figures, in sentence order. `Emphasised` takes the first
                // occurrence of each in turn, so naming only the row's own would
                // mark the threshold instead whenever the two are equal — and a
                // row sitting exactly on the floor is the commonest way to clear it.
                values={[`${FLOOR_PCT}%`, `${item.supportPct}%`]}
                color="var(--fg-body)"
              />
            </p>
          )}

          {showUntagged && <UntaggedNote />}

          {/* The column ends on ownership, which is what this lane is: no
              availability receipt and no named receipts, both being claims
              about a pool discover does not score. */}
          <p
            aria-hidden="true"
            className="m-0 font-mono"
            style={{ fontSize: 12.5, color: "var(--fg-faint)" }}
          >
            {discoverCopy.row.notOwned}
          </p>
        </div>

        {/* Count stack. No fit block, no delta, no split bar. The figure itself
            is up in the band, in its chip; no column rule, because the chip's
            own plate already separates it from the evidence. */}
        <div className="flex flex-col gap-[10px]" style={{ gridColumn: 3 }}>
          {hasFigure && <OverlapTrack pct={overlapPct} width="100%" />}

          {counts(10.5)}

          <PriceSlot price={item.price} mobile={false} />
        </div>
        </div>
      </div>
    </div>
  );
}
