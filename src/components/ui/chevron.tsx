import type { CSSProperties } from "react";

/**
 * The app's dropdown and disclosure chevron size (bug batch 2026-10-12, Hugh: "make them
 * consistent with the prevailing standard"). 13px is what the filter chassis triggers, the sort
 * menus and the deck list's own sort draw it at, by inheriting their 13px label. Measured across
 * `/collection`, `/commanders`, `/discover`, `/decks` and a deck page, those are most of the
 * chevrons a reader meets. The rest were set one by one at 9 to 12px, and at those sizes the
 * glyph reads as punctuation rather than as a control (the cost strip's H15 note says the same).
 *
 * `leading-none`, so a 13px glyph beside an 11px label does not stretch the line box it sits in.
 */
export const CHEVRON_CLASS = "text-[13px] leading-none";

/** The gap a text label keeps from its trailing chevron: the filter chassis trigger's. */
export const CHEVRON_GAP_CLASS = "gap-[8px]";

/** `▾` closed, `▴` open. Decorative: the control carrying it states its own expanded state. */
export function Chevron({ open = false, className, style }: { open?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={className ? `${CHEVRON_CLASS} ${className}` : CHEVRON_CLASS} style={style}>
      {open ? "▴" : "▾"}
    </span>
  );
}
