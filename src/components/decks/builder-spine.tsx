// Builder Spine — §Builder Spine (header, /decks/[id]).
// Client component. The header itself is the two art-wash bands; what is left
// here is the availability rollup that sits between them and the decklist.
"use client";

import type { DeckDetail } from "../../lib/decks/read";
import { AvailabilityGlyph } from "@/components/ui/availability-marker";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { availabilityCopy } from "../../lib/copy/availability";
import type { TileBracket } from "../../lib/decks/read";
import { SpineDesktop } from "./spine-desktop";
import { SpineMobile } from "./spine-mobile";
import type { StatusPill } from "../../lib/decks/status";
import type { HeaderNotice } from "./notice-tag";

interface BuilderSpineProps {
  deck: DeckDetail;
  /**
   * From the builder's optimistic list, not `deck` — the spine holds the
   * progress bar, which is the largest thing on the page and the one the user
   * is watching when they click. Leaving it on server counts would make the
   * headline number the last thing to move.
   */
  counts: {
    built: number; ownedCount: number; toBuyCount: number; proxiedCount?: number;
  };
  onExport: () => void;
  /** Cards in this deck the player is short of. Design table §12. */
  overCommitted: number;
  /**
   * Cards in this deck that some draft also wants. Disjoint from
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
  /**
   * Opens the Shopping list from the over-committed band (amendment 5, #281).
   * Absent when the filter is already Shopping — a link to the screen you are
   * on is furniture — and absent entirely outside the builder.
   */
  onShowShopping?: () => void;
  /**
   * The server status, computed once in builder-shell. A prop rather than a
   * second `statusPill()` call here: the shell's is keyed off the server counts
   * deliberately, and a spine that recomputed it from its own optimistic
   * `counts` would name a different status than the page it sits on.
   */
  status: StatusPill;
  /** Passed straight through to both widths — see `SpineBandProps`. */
  offerFirstCommit?: boolean;
  /** The header's bracket chip, or null when the deck is unread. See `SpineBandProps`. */
  bracket?: TileBracket | null;
  onOpenBracket?: () => void;
  /** The header's notice and its press. See `SpineBandProps`. */
  notice?: HeaderNotice | null;
  onOpenNotices?: () => void;
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
  onShowShopping,
}: Pick<
  BuilderSpineProps,
  "overCommitted" | "softClaimed" | "overCommittedCard" | "onShowShopping"
>) {
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

  // The band is the index: it is the only thing that names WHICH card and why,
  // and it is read by players who never open the Shopping tab. The link is what
  // gets the tab opened. It flips the decklist's filter and does not scroll —
  // the list is directly below, and the `Shopping N` pill going active is the
  // receipt. No callback means no link, which is what leaves the deck card's
  // copy of this band untouched.
  const shoppingLink = onShowShopping ? (
    <button
      type="button"
      onClick={onShowShopping}
      aria-label={recommendationsCopy.shopping.summaryLinkAria(String(overCommitted))}
      className="font-mono text-[11.5px] bg-transparent border-0 p-0 text-left cursor-pointer
        text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
    >
      {recommendationsCopy.shopping.summaryLink}
    </button>
  ) : null;

  return (
    // The gap above is the band's own: it reads as a claim about the deck
    // rather than as the next row of the head it sits under, and without it the
    // red edge butts straight against the Update / Export controls.
    <section
      aria-label={rollup.regionAria}
      className="mt-[14px] md:mt-[18px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
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
              {/* Its own line under the body at 390px. */}
              {shoppingLink && <div className="mt-[4px]">{shoppingLink}</div>}
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
            {/* Trailing the body on desktop. */}
            {shoppingLink}
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
  onShowShopping,
  status,
  offerFirstCommit,
  bracket = null,
  onOpenBracket,
  notice = null,
  onOpenNotices,
}: BuilderSpineProps) {
  return (
    <>
    <SpineDesktop
      deck={deck}
      counts={counts}
      status={status}
      onExport={onExport}
      offerFirstCommit={offerFirstCommit}
      bracket={bracket}
      onOpenBracket={onOpenBracket}
      notice={notice}
      onOpenNotices={onOpenNotices}
    />
    <SpineMobile
      deck={deck}
      counts={counts}
      status={status}
      onExport={onExport}
      offerFirstCommit={offerFirstCommit}
      bracket={bracket}
      onOpenBracket={onOpenBracket}
      notice={notice}
      onOpenNotices={onOpenNotices}
    />

    {/* Below the spine and above the decklist, per the canvas: it is a claim
        about the whole deck, and every group heading under it is a claim about
        one type. A deck with neither count renders NO region, not an empty one. */}
    {(overCommitted > 0 || softClaimed > 0) && (
      <RollupBands
        overCommitted={overCommitted}
        softClaimed={softClaimed}
        overCommittedCard={overCommittedCard}
        onShowShopping={onShowShopping}
      />
    )}
    </>
  );
}
