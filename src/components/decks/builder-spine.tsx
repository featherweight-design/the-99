// Builder Spine — §Builder Spine (header, /decks/[id]).
// Client component. Commander thumb + inline rename + progress + export trigger.
"use client";

import { useState } from "react";
import { RenameForm } from "./rename-form";
import type { DeckDetail } from "../../lib/decks/read";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { colorLabel } from "../../lib/decks/format";
import { PrimaryButton } from "@/components/ui/button";
import { AvailabilityGlyph } from "@/components/ui/availability-marker";
import { availabilityCopy } from "../../lib/copy/availability";
import { CardDetailTrigger } from "./card-detail-provider";

interface BuilderSpineProps {
  deck: DeckDetail;
  /**
   * From the builder's optimistic list, not `deck` — the spine holds the
   * progress bar, which is the largest thing on the page and the one the user
   * is watching when they click. Leaving it on server counts would make the
   * headline number the last thing to move.
   */
  counts: { built: number; ownedCount: number; toBuyCount: number };
  onExport: () => void;
  /** Cards in this deck the player is short of. Design table §12. */
  overCommitted: number;
  /**
   * Cards in this deck that some unfinished list also wants. Disjoint from
   * `overCommitted` — the states are a partition — which is what lets the soft
   * line say "N more" and have the two figures sum.
   */
  softClaimed: number;
  /**
   * The over-committed card, when there is exactly one. Design row 12.9 names
   * it in the body, and that sentence is only truthful in the singular; past
   * one the copy has its own plural form rather than a lead name and a "+2".
   */
  overCommittedCard?: { name: string; deckCount: number; ownedQty: number } | null;
}

// The seam in the doubled glyph is the colour of whatever sits behind it, and
// both widths put the red line on the same band.
const RED_BAND = "var(--elevated-hover)";
const OVER_FG = "var(--avail-over-fg)";
const SOFT_FG = "var(--fg-body)";
const BODY_FG = "var(--fg-muted)";

/**
 * The two widths are separate trees rather than one responsive one, because the
 * difference is not only skin: the phone stacks heading over body inside a
 * full-bleed band, the desktop sets them side by side inside a rounded card,
 * and the soft line's body is a different string on each (rows 12.7/12.8).
 */
function RollupBands({
  overCommitted,
  softClaimed,
  overCommittedCard,
}: Pick<BuilderSpineProps, "overCommitted" | "softClaimed" | "overCommittedCard">) {
  const rollup = availabilityCopy.deckRollup;
  const { deckSummary } = availabilityCopy;

  // `bodyMany` reads "N of these are…", which is why the singular gets the named
  // sentence instead of it. A single card whose claimants came back unnamed
  // therefore has no body it can truthfully use, and the heading carries the
  // line alone rather than the plural agreeing with 1.
  const overBody =
    overCommitted === 1
      ? overCommittedCard &&
        deckSummary.body(
          overCommittedCard.name,
          overCommittedCard.deckCount,
          overCommittedCard.ownedQty,
        )
      : deckSummary.bodyMany(overCommitted);

  // "more" is load-bearing: the counts are disjoint, so the word does the
  // arithmetic for the player instead of making them add 1 and 12.
  const softHeading =
    overCommitted > 0
      ? rollup.softHeadingAfterOver(softClaimed)
      : rollup.softHeading(softClaimed);

  // The short body is a phone-under-pressure form, not a phone form. Table rows
  // 12.7/12.8 read as a straight width split, but that generalises from the
  // one mock where both lines fire: the soft-only phone mock (A2CV:454) runs the
  // LONG body, and the desktop both-lines mock (A2CV:558) runs it too. Only the
  // phone stacking two lines drops the trailing clause.
  const softPhoneBody = overCommitted > 0 ? rollup.softBodyShort : rollup.softBody;

  return (
    <section aria-label={rollup.regionAria} style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Phone — full-bleed bands, heading over body */}
      <div className="md:hidden">
        {overCommitted > 0 && (
          <div
            className="flex items-start gap-[9px] px-[16px] py-[10px]"
            style={{ background: RED_BAND, borderLeft: "3px solid var(--danger)" }}
          >
            <span className="mt-[4px] flex-none">
              <AvailabilityGlyph state="over" seam={RED_BAND} />
            </span>
            <div className="flex-1">
              {/* Row 17.10. The drawn heading trades on the page around it —
                  "here" means this deck — which a screen reader arriving at the
                  region cold does not have. Same swap the marker makes. */}
              <div
                aria-hidden="true"
                className="text-[12.5px] font-semibold"
                style={{ color: OVER_FG }}
              >
                {rollup.overHeading(overCommitted)}
              </div>
              <span className="sr-only">{deckSummary.ariaLabel(overCommitted)}</span>
              {overBody && (
                <div
                  className="text-[12px] mt-[3px]"
                  style={{ color: BODY_FG, lineHeight: 1.55 }}
                >
                  {overBody}
                </div>
              )}
            </div>
          </div>
        )}
        {softClaimed > 0 && (
          <div
            className="flex items-start gap-[9px] px-[16px] py-[10px]"
            style={{
              background: "var(--surface)",
              borderLeft: "3px solid var(--border-dashed)",
              borderTop: overCommitted > 0 ? "1px solid var(--border)" : undefined,
            }}
          >
            <span className="mt-[4px] flex-none">
              <AvailabilityGlyph state="soft" seam={RED_BAND} />
            </span>
            <div className="flex-1">
              <div className="text-[12.5px] font-semibold" style={{ color: SOFT_FG }}>
                {softHeading}
              </div>
              <div
                className="text-[12px] mt-[3px]"
                style={{ color: BODY_FG, lineHeight: 1.55 }}
              >
                {softPhoneBody}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop — rounded cards, heading beside body */}
      <div className="hidden md:flex flex-col gap-[8px] px-[30px] py-[14px]">
        {overCommitted > 0 && (
          <div
            className="flex items-center gap-[11px] rounded-[10px] px-[16px] py-[12px]"
            style={{
              background: RED_BAND,
              border: "1px solid var(--border-strong)",
              borderLeft: "3px solid var(--danger)",
            }}
          >
            <AvailabilityGlyph state="over" seam={RED_BAND} />
            <div
              aria-hidden="true"
              className="text-[13px] font-semibold flex-none"
              style={{ color: OVER_FG }}
            >
              {rollup.overHeading(overCommitted)}
            </div>
            <span className="sr-only">{deckSummary.ariaLabel(overCommitted)}</span>
            {overBody && (
              <div className="text-[13px]" style={{ color: BODY_FG }}>
                {overBody}
              </div>
            )}
          </div>
        )}
        {softClaimed > 0 && (
          <div
            className="flex items-center gap-[11px] rounded-[10px] px-[16px] py-[12px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--border-dashed)",
            }}
          >
            <AvailabilityGlyph state="soft" seam={RED_BAND} />
            <div className="text-[13px] font-semibold flex-none" style={{ color: SOFT_FG }}>
              {softHeading}
            </div>
            <div className="text-[13px]" style={{ color: BODY_FG }}>
              {rollup.softBody}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function BuilderSpine({
  deck,
  counts,
  onExport,
  overCommitted,
  softClaimed,
  overCommittedCard,
}: BuilderSpineProps) {
  const [renaming, setRenaming] = useState(false);

  const { commander } = deck;
  const { built, ownedCount, toBuyCount } = counts;
  const pct = Math.min(100, Math.round((built / 99) * 100));
  const exportDisabled = built === 0;

  // Commander thumb gradient (fallback when no art)
  const thumbGradient = commanderGradient(commander.colorIdentity);

  // Meta caption: color identity label
  const identityLabel = colorLabel(commander.colorIdentity);

  /*
    §Spine container
    mobile:  p 40px 16px 12px, border-bottom 1px var(--border), flex col, items-center
    desktop: p 20px 30px,      border-bottom 1px var(--border), flex row, items-center, gap 18px
  */
  return (
    <>
    <header
      className="flex flex-col items-center md:flex-row md:items-center md:gap-[18px] px-[16px] pt-[40px] pb-[12px] md:px-[30px] md:py-[20px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* §Spine — commander art thumb (mobile). The thumb is the commander's only
          representation on this page, so it is also the way into its details (#91). */}
      <CardDetailTrigger
        oracleId={commander.oracleId}
        name={commander.name}
        className="block flex-none rounded-[5px] overflow-hidden md:hidden"
        style={{
          width: built === 0 ? 34 : 30,
          height: built === 0 ? 48 : 42,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          background: commander.imageUri ? undefined : thumbGradient,
          border: "none",
          padding: 0,
        }}
      >
        {commander.imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={commander.imageUri}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span className="block w-full h-full" style={{ background: thumbGradient }} />
        )}
      </CardDetailTrigger>

      {/* Commander thumb — desktop (different size) */}
      <CardDetailTrigger
        oracleId={commander.oracleId}
        name={commander.name}
        className="hidden md:block flex-none rounded-[6px] overflow-hidden flex-shrink-0"
        style={{
          width: 44,
          height: 62,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          background: thumbGradient,
          border: "none",
          padding: 0,
        }}
      >
        {commander.imageUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={commander.imageUri}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        )}
      </CardDetailTrigger>

      {/* Center column: name + meta + progress */}
      <div className="flex-1 min-w-0 flex flex-col items-center md:items-start mt-[8px] md:mt-0">
        {/* §Spine — deck name (inline rename via RenameForm) */}
        {renaming ? (
          <div className="w-full max-w-[320px] md:max-w-none">
            <RenameForm
              deckId={deck.id}
              currentName={deck.name}
              onDone={() => setRenaming(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setRenaming(true);
              }
            }}
            aria-label={`Rename deck: ${deck.name}`}
            className="max-w-full truncate text-left font-display font-bold text-[16px] md:text-[21px] leading-[1.2] rounded-[3px]"
            style={{ color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {deck.name}
          </button>
        )}

        {/* §Spine — deck meta caption */}
        <p
          className="font-mono text-[10px] md:text-[11px] mt-[1px] md:mt-[2px]"
          style={{ color: "var(--fg-faint)" }}
        >
          {commander.name} · {identityLabel}
        </p>

        {/* §Spine — pip chips (desktop only) */}
        {commander.colorIdentity.length > 0 && (
          <div className="hidden md:flex items-center gap-[8px] mt-[3px] ml-[2px]">
            {commander.colorIdentity.map((pip) => (
              <span
                key={pip}
                className="rounded-full flex-none"
                style={{
                  width: 10,
                  height: 10,
                  background: WUBRG_COLOR[pip] ?? "var(--fg-faint)",
                }}
                aria-hidden
              />
            ))}
          </div>
        )}

        {/* §Spine — progress figure + "/99" + bar */}
        <div className="flex items-baseline gap-[4px] mt-[6px] md:mt-[4px]">
          <span
            className="font-mono font-semibold text-[14px] md:text-[20px]"
            style={{ color: "var(--fg)" }}
          >
            {built}
          </span>
          <span
            className="font-mono font-normal text-[14px] md:text-[13px]"
            style={{ color: "var(--fg-faint)" }}
          >
            / 99
          </span>
        </div>

        {/* §Spine — progress bar track: mobile h 5, desktop h 6 */}
        <div
          className="w-full md:w-[170px] rounded-full overflow-hidden mt-[4px] md:mt-[6px] h-[5px] md:h-[6px]"
          style={{
            background: "var(--elevated)",
          }}
        >
          {/* §Spine — progress bar fill: built ≥99 var(--success) / ≥55 var(--warning) / <55 var(--danger) */}
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: built >= 99 ? "var(--success)" : built >= 55 ? "var(--warning)" : "var(--danger)",
            }}
          />
        </div>

        {/* §Spine — "54 owned · 8 to buy" caption (desktop only). It splits the
            progress figure, so before the first card there is nothing to split:
            `0 owned · 0 to buy` only restates the `0 / 99` directly above it.
            Hidden at zero, and back as soon as the split means something. */}
        {built > 0 && (
          <p
            className="hidden md:block font-mono text-[10px] mt-[5px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {ownedCount} owned · {toBuyCount} to buy
          </p>
        )}
      </div>

      {/* Export button */}
      <div className="mt-[10px] md:mt-0 md:ml-auto flex-none">
        {exportDisabled ? (
          /* §Spine — Export button (disabled, empty deck) — desktop */
          <button
            type="button"
            disabled
            className="hidden md:flex items-center gap-[6px] rounded-[8px] font-sans font-semibold text-[13px] px-[18px] py-[11px]"
            style={{
              color: "var(--fg-faint)",
              background: "transparent",
              border: "1px solid var(--border)",
              cursor: "not-allowed",
            }}
          >
            Export
          </button>
        ) : (
          /* §Spine — Export button (active) */
          <>
            {/* Mobile: text link with icon */}
            <button
              type="button"
              onClick={onExport}
              className="md:hidden flex items-center gap-[5px] rounded-[7px] font-mono text-[11px] px-[9px] py-[6px]"
              style={{
                color: "var(--accent)",
                background: "transparent",
                border: "1px solid var(--border-strong)",
              }}
            >
              {/* §Spine — export link icon (mobile): 16px var(--fg-faint) */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--fg-faint)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            {/* Desktop: filled accent button */}
            <PrimaryButton
              onClick={onExport}
              className="hidden md:flex items-center gap-[6px] text-[13px] px-[18px] py-[11px]"
            >
              Export
            </PrimaryButton>
          </>
        )}
      </div>
    </header>

    {/* Below the spine and above the decklist, per the canvas: it is a claim
        about the whole deck, and every group heading under it is a claim about
        one type. A deck with neither count renders NO region, not an empty one. */}
    {(overCommitted > 0 || softClaimed > 0) && (
      <RollupBands
        overCommitted={overCommitted}
        softClaimed={softClaimed}
        overCommittedCard={overCommittedCard}
      />
    )}
    </>
  );
}
