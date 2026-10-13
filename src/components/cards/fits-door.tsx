"use client";

// FITS YOUR DECKS' DOOR (swap tools PR 5b, R2): `Find a deck for it →` in the card modal's footer,
// under the Mana Pool link. The modal draws it only for a Commander-legal card and a reader with a
// deck (both off the card payload, F3), and never on a card stacked from the stand-ins sheet, whose
// footer is Take (addendum §3). Nothing loads until it is pressed.
import { useEffect, useRef } from "react";

import { swapToolsCopy } from "../../lib/copy/swap-tools";

const copy = swapToolsCopy.fits;

/** The door's two-diamond glyph, drawn rather than typed so it takes the accent's outline. */
function Glyph() {
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {[0, 1].map((i) => (
        <span key={i} className="w-[6px] h-[6px] rotate-45 border-[1.5px] border-[color:var(--accent)]" />
      ))}
    </span>
  );
}

export function FitsDoor({
  cardName,
  onPress,
  pickerOpen,
  layout,
  reading = false,
}: {
  cardName: string;
  onPress: () => void;
  /** Whether the picker this door opened is up: when it closes, focus comes back here. */
  pickerOpen: boolean;
  layout: "row" | "column";
  /** A Find a deck read for this card is running (handoff R2, P2b): the door says so under it. */
  reading?: boolean;
}) {
  const button = useRef<HTMLButtonElement>(null);

  // Back from the picker, focus lands on the door. The picker's own focus return cannot do it: at its
  // unmount this card is still inert under it, so the door waits out the `inert` a frame at a time,
  // as the stand-ins door does.
  const wasOpen = useRef(false);
  useEffect(() => {
    const closed = wasOpen.current && !pickerOpen;
    wasOpen.current = pickerOpen;
    if (!closed) return;
    let frame = 0;
    let tries = 0;
    const land = () => {
      const el = button.current;
      // The phone and desktop doors are both mounted and CSS shows one: only the one with layout.
      if (el && el.closest("[inert]") === null && el.offsetParent !== null) el.focus();
      else if (tries++ < 10) frame = requestAnimationFrame(land);
    };
    frame = requestAnimationFrame(land);
    return () => cancelAnimationFrame(frame);
  }, [pickerOpen]);

  const door = (
    <button
      ref={button}
      type="button"
      data-testid="fits-door"
      onClick={onPress}
      aria-label={copy.calloutAria(cardName)}
      className={
        "inline-flex items-center gap-[8px] self-start whitespace-nowrap bg-transparent border-0 p-0 cursor-pointer "
        + "font-medium text-[color:var(--accent)] "
        + (layout === "column" ? "min-h-[44px] text-[14px]" : "text-[13.5px]")
      }
    >
      <Glyph />
      <span className="[border-bottom:1px_solid_var(--accent-shadow)]">{copy.callout} →</span>
    </button>
  );
  // One root whether or not a read is running: swapping the root when the note comes or goes would
  // remount the button, and a reader focused on it would lose focus as the read settles.
  return (
    <span className="inline-flex flex-col items-start gap-[2px] self-start">
      {door}
      {reading ? <span data-testid="fits-door-reading" className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{swapToolsCopy.fits.read.doorReading}</span> : null}
    </span>
  );
}
