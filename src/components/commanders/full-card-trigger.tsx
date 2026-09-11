"use client";
// Client wrapper: the art header's tap band + the "Card details" chip. Both
// open the shared card modal through CardDetailProvider, which detail.tsx
// already mounts for the role chips further down the page.

import { useCardDetail } from "../cards/card-detail-provider";
import { PENDING_OPACITY } from "./pending";

/** The corners the pill sits in. `hero` is the commander page's mobile art
    header and `commander-desktop` its desktop card frame; the two `deck-*`
    values are the deck header at its two widths, where the pill moves out of the
    way of the title and the rename pencil. */
const PLACEMENT = {
  hero: { top: 56, right: 16 },
  // Inside the 63/88 frame's own bottom-left. The frame has no ink of its own —
  // the name and type line sit below it — so the pill only has the art to clear.
  "commander-desktop": { left: 12, bottom: 12 },
  "deck-desktop": { left: 16, bottom: 14 },
  "deck-mobile": { top: 13, right: 16 },
} as const;

export function FullCardTrigger({
  oracleId,
  placement = "hero",
  bandTapTarget = true,
}: {
  oracleId: string;
  placement?: keyof typeof PLACEMENT;
  /** The deck header withholds this: that band also carries the title button and
      the rename pencil, and a full-band click layer above them eats both. */
  bandTapTarget?: boolean;
}) {
  const { open, pendingOracleId } = useCardDetail();
  const pending = pendingOracleId === oracleId;

  return (
    <>
      {/* Full-band tap target — per state table, tapping the art header opens
          the card. Presentational (not a button, never focusable); the labeled
          chip below is the accessible control. */}
      {bandTapTarget ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 cursor-pointer"
          onClick={() => open(oracleId)}
        />
      ) : null}

      {/* ⛶ affordance chip. The handoff heading is still §"⛶ Full card"
          affordance chip — that is the design doc's own title, kept here so the
          section is still findable, not this control's label. The label reads
          "Card details" rather than "Full card": the modal leads with
          printings and rulings and draws the art at 180px, so the old label
          would be promising a picture this surface no longer opens. */}
      <button
        type="button"
        // brand focus-visible outline treatment inherited from globals.css
        // The chip carries its own legibility. Every band it sits on leaves the
        // crop clear where it lands, so the plate is what `--fg` needs over the
        // brightest pixel the art can put behind it rather than a value that
        // assumed a scrim underneath. The percentage is written out because
        // Tailwind cannot compile an interpolated class; `OVER_ART_PLATE` is
        // what the contrast suite measures, and the test below asserts the two
        // still agree.
        className="absolute inline-flex items-center rounded-full bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] border border-[color:color-mix(in_oklab,var(--fg)_18%,transparent)]"
        style={{
          ...PLACEMENT[placement],
          gap: 6,
          backdropFilter: "blur(4px)",
          padding: "6px 11px",
          cursor: "pointer",
          opacity: pending ? PENDING_OPACITY : undefined,
        }}
        aria-label="View card details"
        // Never `disabled` while the fetch runs, for the same reason
        // CardDetailTrigger is not: disabling the focused element blurs it, and
        // the modal's focus-return would have nothing to hand focus back to.
        aria-busy={pending}
        onClick={() => open(oracleId)}
      >
        <span style={{ color: "var(--fg)", fontSize: 12 }}>⛶</span>
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--fg)" }}
        >
          Card details
        </span>
      </button>
    </>
  );
}
