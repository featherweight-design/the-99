"use client";
// The discovery row (§7.1–§7.5). `RecCard` delegates its discovery arm here.
//
// A separate FILE, not a separate component per sort: the README forbids
// forking the row into `FitCard` / `NoveltyCard`, which would duplicate the
// grid, the link, the chips and the receipt line. Everything below is one
// component with one branching slot. What is split off from `rec-card.tsx` is
// the SCOPE — the owned row prints a score, fit segments and a synergy state
// that `DiscoveryItem` does not carry, so the two share their pieces
// (`ReceiptLine`, `CommanderThumb`, `CommanderTile`, `RoleChips`) by import
// rather than by an ever-widening prop union.

import Link from "next/link";
import { useState } from "react";
import { formatCents } from "../../lib/decks/price";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { planeCopy } from "../../lib/copy/commanders-plane";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is
// unset and pulls the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import { FLOOR_PCT } from "../../lib/discovery/floor";
import type { DiscoveryItem } from "../../lib/discovery/list";
import type { PriceSlot } from "../../lib/discovery/price";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import { CommanderThumb, CommanderTile } from "./commander-art";
import { Emphasised, localised } from "./emphasis";
import { ReceiptLine, type ReceiptClause } from "./receipt-line";
import { RoleChips } from "./role-chips";
import { commanderDetailHref } from "./list-nav";

const { justify, ownership, price: priceCopy, untagged } = discoveryCopy;
const overflowCopy = planeCopy.overflow;

/** The ownership pip. Decorative in both places it is drawn — the clause on the
    receipt line says the same fact in words, and the row's accessible name
    leads with it. */
function Pip({ owned }: { owned: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0"
      style={{
        width: 6,
        height: 6,
        transform: "rotate(45deg)",
        ...(owned
          ? { background: "var(--accent)" }
          : { border: "1.5px solid var(--fg-locked)" }),
      }}
    />
  );
}

/** The overlap track. Also the fit figure's full-width track — same element,
    two widths, so the two bars in a row can never disagree about the fill. */
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
  avail,
  counts,
}: {
  item: DiscoveryItem;
  rank: number;
  sort: "fit" | "new";
  avail: "all" | "free";
  counts: ReceiptCounts | null;
}) {
  // `edhrec_total` is the denominator, and a row with N and no M prints neither
  // figure and falls back to the receipt line alone. Nothing is substituted for
  // it — not 99, not the pool size.
  const total = item.edhrecTotal;
  const hasFigure = total !== null && total > 0;
  const overlapPct = hasFigure ? Math.round((item.ownedSupport / total) * 100) : 0;

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

  const lead = (mobile: boolean): ReceiptClause => ({
    text: item.owned
      ? mobile
        ? ownership.ownedShort
        : ownership.owned
      : mobile
        ? ownership.unownedShort
        : ownership.unowned,
    color: item.owned ? "var(--avail-hard-fg)" : "var(--fg-faint)",
    glyph: item.owned
      ? { background: "var(--accent)" }
      : { border: "1.5px solid var(--fg-locked)" },
  });

  // Ownership leads, before any figure, and the figures follow in the order the
  // eye reads them. The visible prose is `aria-hidden` where it would repeat
  // this, so nothing is announced twice. Controls inside that prose are not:
  // see `TagSentence`.
  const rowLabel = [
    item.name,
    item.owned ? ownership.ownedAria : ownership.unownedAria,
    justifyAria,
  ]
    .filter(Boolean)
    .join(" · ");

  const showUntagged = fit && item.tagTotal === 0;

  return (
    <div className="relative group">
      {/* Stretched link keeps the whole row clickable. Brand focus-visible
          outline inherited from globals.css. */}
      <Link
        href={commanderDetailHref(item.slug, avail)}
        aria-label={`${rowLabel} — view commander details`}
        className="absolute inset-0 z-[1] rounded-[11px] sm:rounded-[12px]"
      />

      {/* ── Mobile layout: stacked tile ── */}
      <div
        className="sm:hidden rounded-[11px] p-[12px_13px] flex flex-col gap-[9px] transition-colors group-hover:border-[color:var(--border-strong)] group-hover:bg-[color:var(--elevated-hover)]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex gap-[10px] items-start">
          <CommanderThumb imageUri={item.imageUri} colorIdentity={item.colorIdentity} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[6px]">
              <span
                className="font-display font-[800] shrink-0"
                // minWidth, not width: 16px was measured against Cinzel, and a
                // two-digit rank in a wider display face overflows a fixed box
                // into the name beside it.
                style={{
                  fontSize: 17,
                  color: "var(--fg-faint)",
                  minWidth: 16,
                  textAlign: "center",
                  lineHeight: 1,
                }}
              >
                {rank}
              </span>
              <Pip owned={item.owned} />
              <span
                className="font-display font-[600] truncate"
                style={{ fontSize: 14.5, color: "var(--fg)" }}
              >
                {item.name}
              </span>
            </div>
          </div>

          {/* The ranking figure, pinned top-right where the owned row pins its
              score. No `/100`, no FIT stack: discovery does not blend. */}
          {hasFigure && (
            <div aria-hidden="true" className="flex flex-col items-center shrink-0">
              <span
                className="font-mono font-[600]"
                style={{ fontSize: 20, color: "var(--fg)", lineHeight: 1 }}
              >
                {fit ? item.ownedSupport : item.unplayedCount}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--fg-faint)",
                }}
              >
                {fit ? justify.figureUnitFit(total) : justify.figureUnitNew(item.tagTotal)}
              </span>
            </div>
          )}
        </div>

        {/* One track on the tile, not two: the header figure and the
            justification are the same proportion, and drawing it twice at
            390px would say it twice. Under novelty there is no bar at all — a
            count of unplayed tags is not a proportion. */}
        {fit && hasFigure && <OverlapTrack pct={overlapPct} width="100%" />}

        <RoleChips roleCounts={item.roleCounts} />

        {hasFigure &&
          (fit ? (
            <p
              aria-hidden="true"
              className="m-0 font-mono"
              style={{ fontSize: 10.5, lineHeight: 1.55, color: "var(--fg-body)" }}
            >
              <Emphasised
                text={justify.overlapShort(item.ownedSupport, total)}
                values={[localised(item.ownedSupport), localised(total)]}
                color="var(--fg)"
              />
            </p>
          ) : (
            tags && (
              <p
                className="m-0"
                style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-body)" }}
              >
                <TagSentence
                  tags={tags}
                  name={item.name}
                  open={openTags}
                  onToggle={() => setOpenTags((v) => !v)}
                />
              </p>
            )
          ))}

        <ReceiptLine
          fits={item.colorPoolSize}
          counts={counts}
          avail={avail}
          fontSize={10.5}
          gap={5}
          lineHeight={1.55}
          lead={lead(true)}
        />

        {/* The floor explains presence, never position, so it is never added to
            the figure above it. */}
        {!fit && item.supportPct !== null && (
          <p className="m-0 font-mono" style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>
            {justify.floorNoteShort(FLOOR_PCT, item.supportPct)}
          </p>
        )}

        {showUntagged && <UntaggedNote />}

        <PriceSlot price={item.price} mobile />
      </div>

      {/* ── Desktop layout: grid 40px 100px 1fr 236px ── */}
      <div
        className="hidden sm:grid rounded-[12px] p-[24px_26px] transition-colors group-hover:border-[color:var(--border-strong)] group-hover:bg-[color:var(--elevated-hover)]"
        style={{
          gridTemplateColumns: "40px 100px 1fr 236px",
          gap: 20,
          alignItems: "stretch",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Rank column. The ownership pip replaces the decorative diamond the
            owned row draws here rather than sitting beside it. */}
        <div className="flex flex-col items-center justify-center gap-[7px]">
          <span
            className="font-display font-[800]"
            style={{ fontSize: 26, color: "var(--fg-faint)", lineHeight: 1 }}
          >
            {rank}
          </span>
          <Pip owned={item.owned} />
        </div>

        <CommanderTile imageUri={item.imageUri} colorIdentity={item.colorIdentity} />

        {/* Evidence column */}
        <div className="flex flex-col gap-[13px]" style={{ minWidth: 0 }}>
          <h3
            className="font-display font-[600] m-0"
            style={{ fontSize: 20, color: "var(--fg)", lineHeight: 1.1 }}
          >
            {item.name}
          </h3>

          <RoleChips roleCounts={item.roleCounts} />

          {/* The justification slot — one slot, contents chosen by the sort
              key, on the same y and the same 13px leading as the owned row's
              Synergy line. */}
          {hasFigure &&
            (fit ? (
              <div aria-hidden="true" className="flex items-center gap-[10px]">
                <span
                  className="font-mono shrink-0"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--fg-faint)",
                  }}
                >
                  {justify.overlapLabel}
                </span>
                <OverlapTrack pct={overlapPct} width={120} />
                <span className="font-mono" style={{ fontSize: 12, color: "var(--fg-body)" }}>
                  <Emphasised
                    text={justify.overlap(item.ownedSupport, total)}
                    values={[localised(item.ownedSupport), localised(total)]}
                    color="var(--fg)"
                  />
                </span>
              </div>
            ) : (
              tags && (
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
              )
            ))}

          <ReceiptLine
            fits={item.colorPoolSize}
            counts={counts}
            avail={avail}
            fontSize={12.5}
            lead={lead(false)}
          />

          {showUntagged && <UntaggedNote />}
        </div>

        {/* Fit column */}
        <div
          className="flex flex-col justify-center gap-[10px]"
          style={{ borderLeft: "1px solid var(--border)", paddingLeft: 20 }}
        >
          {hasFigure && (
            <>
              <div aria-hidden="true" className="flex items-baseline gap-[6px]">
                <span
                  className="font-mono font-[600]"
                  style={{ fontSize: 34, color: "var(--fg)", lineHeight: 1 }}
                >
                  {fit ? item.ownedSupport : item.unplayedCount}
                </span>
                <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>
                  {fit ? justify.figureUnitFit(total) : justify.figureUnitNew(item.tagTotal)}
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  {fit ? justify.figureLabelFit : justify.figureLabelNew}
                </span>
              </div>

              {fit && <OverlapTrack pct={overlapPct} width="100%" />}

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
            </>
          )}

          <PriceSlot price={item.price} mobile={false} />
        </div>
      </div>
    </div>
  );
}
