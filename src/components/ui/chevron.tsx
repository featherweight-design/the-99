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

/**
 * The app's one chevron (Hugh, 2026-10-15). Two kinds, both turning on the shared quick motion:
 *
 *  - `menu` (a menu or select: it opens a list): ▾ closed, turned 180° to ▴ when open.
 *  - `disclosure` (content that unfolds in place): ▸ closed, turned 90° to ▾ when open.
 *
 * One drawn glyph per kind, turned by `transform` rather than swapped for another character, so the change
 * animates (`transition-transform` takes `--motion-quick` and `--motion-ease` from the theme, and
 * `motion-reduce` snaps it). Decorative: the trigger carries `aria-expanded`, never the icon. `open` is the
 * trigger's own `aria-expanded`.
 */
export type ChevronKind = "menu" | "disclosure";

export function Chevron({
  kind = "menu",
  open = false,
  className,
  style,
}: {
  kind?: ChevronKind;
  open?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const turned = open ? (kind === "menu" ? "rotate-180" : "rotate-90") : "";
  const base = `${CHEVRON_CLASS} inline-block flex-none transition-transform motion-reduce:transition-none ${turned}`;
  return (
    <span aria-hidden="true" data-chevron={kind} data-open={open ? "true" : "false"} className={className ? `${base} ${className}` : base} style={style}>
      {kind === "menu" ? "▾" : "▸"}
    </span>
  );
}
