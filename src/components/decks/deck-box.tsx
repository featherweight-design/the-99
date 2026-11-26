// The deck tabs' one box (design handoff `design_handoff_the99_deck_details_refresh`, PR 1; the Games tabs drew it first).
// A SectionPanel PANEL whose band carries Home's heading type (a diamond, the display face, a mono count) on the rail
// ground, a hairline under it, and, at its end, whatever the box says about itself. A foot band closes it where a box
// has keys or a link. Every deck-tab box draws its band here, so the head is one size everywhere.

import type { ElementType, ReactNode } from "react";
import { PANEL } from "../social/section-panel";

/** The band's own ground and type, shared by the flex band and by the grid cells a Consider shelf spreads it over. */
export const BAND_GROUND =
  "bg-[color:var(--surface-rail)] font-display text-[15px] font-semibold leading-[1.3] text-[color:var(--fg)] md:text-[17px]";
/** The hairline under the band, and the band's height. */
export const BAND_RULE = "[border-bottom:1px_solid_var(--border)]";
export const BAND_HEIGHT = "min-h-[48px] md:min-h-[44px]";

/** A box. `className` adds to the panel (a margin, a test hook's own spacing). */
export function DeckBox({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...rest} className={`${PANEL} ${className}`}>
      {children}
    </section>
  );
}

/** The diamond, the title, and the mono count when the box has one. */
export function BandTitle({ title, count }: { title: ReactNode; count?: ReactNode }) {
  return (
    <span className="min-w-0">
      <span aria-hidden className="mr-[8px] text-[color:var(--accent-text)]">◆</span>
      {title}
      {count != null ? (
        <span className="ml-[10px] font-mono text-[11px] font-medium tracking-[.08em] text-[color:var(--accent-text)]">{count}</span>
      ) : null}
    </span>
  );
}

/** The band as one flex row: the heading at the start, `aside` at the end. */
export function DeckBoxBand({ as: Tag = "h2", id, title, count, aside, bare = false }: {
  as?: ElementType;
  id?: string;
  title: ReactNode;
  count?: ReactNode;
  aside?: ReactNode;
  /** No hairline under it: a band that is the whole box (a folded shelf). */
  bare?: boolean;
}) {
  return (
    <Tag
      id={id}
      className={`m-0 flex ${BAND_HEIGHT} items-center justify-between gap-[12px] py-[8px] pl-[14px] pr-[10px] md:pl-[16px] md:pr-[14px] ${BAND_GROUND} ${bare ? "" : BAND_RULE}`}
    >
      <BandTitle title={title} count={count} />
      {aside}
    </Tag>
  );
}

/** The foot band: keys, a cross-link, a footnote. Same padding as the band, the hairline above it. */
export function DeckBoxFoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-[7px] px-[14px] py-[12px] md:px-[16px] [border-top:1px_solid_var(--border)] ${className}`}>{children}</div>
  );
}
