"use client";
// Client wrapper: the art header's tap band + the "Card details" chip. Both
// open the shared card modal through CardDetailProvider, which detail.tsx
// already mounts for the role chips further down the page.

import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { PENDING_OPACITY } from "./pending";
import { deckHeaderCopy } from "../../lib/copy/decks-builder";

/** The corners the control sits in. One rule decides all four: **bottom, on
    whichever side the label block does not reach.** `hero` is the commander
    page's mobile art header and `commander-desktop` its desktop card frame; the
    two `deck-*` values are the deck header at its two widths.

    `hero` moved to the bottom corner in this slice, now that the identity pips
    it used to stack under sit beside the name inside the label block — and that
    block reserves this corner with its own right padding, so the plate lands on
    the band rather than on the type line. `deck-mobile` is the one placement
    that once stayed at a top edge; it takes the bottom-right corner too now,
    which its centred title leaves free. No placement is at a top edge any
    more. */
const PLACEMENT = {
  // Bottom-right. `top: 56` existed only to stack this control below the identity
  // pips, and those now sit beside the name inside the label block — which also
  // reserves this corner with its own right padding, so the plate lands on the
  // band rather than on the type line.
  hero: { right: 16, bottom: 15 },
  // Inside the 63/88 frame's own bottom-left. The frame has no ink of its own —
  // the name and type line sit below it — so the control only has the art to
  // clear.
  //
  // That frame is `rounded-[14px] overflow-hidden`, so the corner of a 44px
  // target inset to 3px falls inside the curve and is clipped. The plate itself
  // is unclipped and the rest of the target is live — and this is the one
  // placement whose whole frame is ALSO a tap layer (`bandTapTarget`), so the
  // clipped corner is the one part of this control a reader cannot miss with.
  // Recorded rather than redrawn: moving the plate to clear the radius would move
  // a drawn inset for a corner that already answers.
  "commander-desktop": { left: 12, bottom: 12 },
  "deck-desktop": { left: 16, bottom: 14 },
  // Bottom-right, like every other placement. This band's block is centred and
  // its title carries the rename pencil beside it, so the right corner is the
  // one the block does not reach — the top edge it used to take is now empty on
  // every band in the app.
  "deck-mobile": { right: 16, bottom: 14 },
} as const;

/** THE PLATE. Every control that sits over art draws this box and nothing else:
    opaque `--bg` under one `--border-strong` hairline, at radius 7, 26px drawn
    and centred in a 44px target.

    **Opaque takes the control out of the contrast problem entirely.** The plate
    it replaces mixed 72% of `--bg` over transparency, measured per theme against
    the brightest pixel a crop could put behind it — a measurement that held while
    a top scrim was also veiling that region. With the scrim gone the top edge is
    the brightest, least controlled part of the crop, and 72% still passes 28% of
    a white pixel. Ink on `var(--bg)` is the page's own body contrast, which every
    theme already guarantees: measured, `--fg` clears 12.06:1 in the worst of the
    six. So no plate on any surface needs a per-theme figure, and none needs a
    scrim underneath — which is what makes deleting the top scrim safe rather than
    merely cheap.

    The 26px box is the deck tile overflow's, adopted rather than redrawn: that
    control already ships this exact treatment on desktop, so the two converge on
    one of them instead of on a third thing. */
const PLATE =
  "flex items-center justify-center rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--bg)]";

/** The drawn box is 26px and the target is 44, so the target is inset by half the
    difference and the plate lands exactly where `PLACEMENT` says.

    Pulled inward rather than overhung with a negative margin: every band this
    control sits on is `overflow-hidden`, and an overhanging target has the 9px
    past the band's edge clipped out of its own hit area — a 44px target that only
    answers on 35 of them. Every placement's smallest inset is 12, so no target
    reaches an edge. */
/** The one placement that keeps its words: the desktop deck header, where the
    control sits in a wide empty corner of the band with nothing to compete with.
    Every other render is icon-only — on a phone the words flanked a centred
    title, which is what the round cut them for. */
const LABELLED = new Set(["deck-desktop"]);

const TARGET_OFFSET = (44 - 26) / 2;
/** The 44px target is pulled inward by half the difference so the 26px plate
    lands exactly where `PLACEMENT` says.

    On a LABELLED control only the vertical axis moves. That button is
    shrink-to-fit, so it carries no spare width for the plate to be centred
    within — subtracting 9 from its `left` or `right` moves the plate itself, and
    a control declared at a 16px inset drew at 7. */
const targetInset = (at: Record<string, number>, labelled: boolean) =>
  Object.fromEntries(
    Object.entries(at).map(([side, v]) => [
      side,
      labelled && (side === "left" || side === "right") ? v : v - TARGET_OFFSET,
    ]),
  );

/** Full-band tap target — per state table, tapping the art header opens the card.
    Presentational (not a button, never focusable); the labeled chip beside it is the
    accessible control. It draws under whatever follows it in the band, so a band that
    also carries a title or a pencil mounts it before them and they keep their presses. */
export function BandTapTarget({ oracleId }: { oracleId: string }) {
  const { open } = useCardDetail();
  const intent = useCardIntent(oracleId);
  return (
    <div
      aria-hidden="true"
      data-band-tap-target
      className="absolute inset-0 cursor-pointer"
      onClick={(e) => open(oracleId, undefined, undefined, { opener: e.currentTarget })}
      {...intent}
    />
  );
}

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
  const intent = useCardIntent(oracleId);
  const pending = pendingOracleId === oracleId;
  const labelled = LABELLED.has(placement);

  return (
    <>
      {bandTapTarget ? <BandTapTarget oracleId={oracleId} /> : null}

      {/* ⛶ affordance control. Icon only on every render but ONE — the desktop
          deck header keeps its words, where the control sits in a wide empty
          corner with nothing to compete with (see `LABELLED`).

          Everywhere else the words were doing two jobs — naming the action and
          being visible against art — and THE PLATE now does the second, which
          leaves the words as the redundant part. At 26px drawn inside a 44px
          target the icon clears a centred title instead of competing with it,
          which is what lets the mobile deck header take a BOTTOM corner like
          every other placement and every band end with an empty top edge.

          Dropping the text makes `aria-label` **required rather than nice**: it
          is now the only name a screen reader has. It reads "View card details"
          rather than "Card details" — verb-led, and the shipped string, which the
          handoff's copy file proposed replacing without having read it. */}
      <button
        type="button"
        // brand focus-visible outline treatment inherited from globals.css
        // `z-[2]`, and it is what makes the control CLICKABLE rather than merely
        // visible. Every band this sits on paints its own content in a
        // positioned sibling that comes later in the DOM — the deck header's
        // `relative flex h-full` row is the case that caught this — and two
        // positioned elements at auto z-index are ordered by document position,
        // so that row won the hit test across the control's whole corner.
        // Painting was never the problem; the pill was on screen and dead to the
        // touch.
        // The 44px box is the target and the plate inside it is the drawing, so
        // the touch floor and the drawn size stop being one number arguing with
        // itself. `bg-transparent` on the target: a 44px plate would be a panel.
        className="absolute z-[2] flex items-center justify-center bg-transparent p-0"
        style={{
          ...targetInset(PLACEMENT[placement], labelled),
          // A labelled control sizes to its words; the icon-only one is the 44px
          // square the touch floor asks for. Height is 44 either way, so the
          // floor holds on the axis a thumb is least forgiving about.
          width: labelled ? "auto" : 44,
          height: 44,
          cursor: "pointer",
        }}
        aria-label="View card details"
        // Never `disabled` while the fetch runs, for the same reason
        // CardDetailTrigger is not: disabling the focused element blurs it, and
        // the modal's focus-return would have nothing to hand focus back to.
        aria-busy={pending}
        onClick={(e) => open(oracleId, undefined, undefined, { opener: e.currentTarget })}
        {...intent}
      >
        {/* The pending dim lands on the GLYPH, never on the plate. Dimming the
            plate composites `--bg` at 55% over the crop, which puts the icon back
            on uncontrolled art for the length of a fetch — and with no top scrim
            there is nothing underneath to catch it. The plate being opaque is the
            argument that lets the scrim go, so it cannot be opaque only when
            nothing is happening. */}
        <span
          className={PLATE}
          style={
            labelled
              ? { height: 26, padding: "0 9px", gap: 6 }
              : { width: 26, height: 26 }
          }
        >
          <span
            style={{
              color: "var(--fg)",
              fontSize: 14,
              lineHeight: 1,
              opacity: pending ? PENDING_OPACITY : undefined,
            }}
          >
            ⛶
          </span>
          {labelled ? (
            <span
              className="font-mono whitespace-nowrap"
              style={{
                color: "var(--fg)",
                fontSize: 11,
                lineHeight: 1,
                opacity: pending ? PENDING_OPACITY : undefined,
              }}
            >
              {deckHeaderCopy.cardDetails}
            </span>
          ) : null}
        </span>
      </button>
    </>
  );
}
