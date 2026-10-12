import type { CSSProperties } from "react";

/**
 * The app's dropdown and disclosure chevron size (bug batch 2026-10-12, Hugh: "make them
 * consistent with the prevailing standard"). 13px is the size most chevrons a reader meets were
 * already drawn at: the wide filter chassis triggers and the deck list's sort inherit it from
 * their 13px labels (measured on `/collection`, `/commanders`, `/discover`, `/decks` and a deck
 * page). The rest were set one by one, from 9px to 14px, and the compact (phone) chassis trigger
 * inherited 12.5px. At the small end the glyph reads as punctuation rather than as a control
 * (the cost strip's H15 note says the same of 11px).
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
