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

/** The diamond, the title, and the mono count when the box has one. `truncate` keeps it to one line that ends the
 *  title in an ellipsis, with the diamond and the count always whole: a band whose title shares its row with an aside
 *  (a long deck name beside "Open deck", #3440). */
export function BandTitle({ title, count, truncate = false }: { title: ReactNode; count?: ReactNode; truncate?: boolean }) {
  if (truncate) {
    return (
      <span data-band-title="truncate" className="flex min-w-0 items-baseline">
        <span aria-hidden className="mr-[8px] flex-none text-[color:var(--accent-text)]">◆</span>
        <span className="min-w-0 truncate">{title}</span>
        {count != null ? (
          <span className="flex-none whitespace-pre">
            {" "}
            <span className="ml-[6px] font-mono text-[11px] font-medium tracking-[.08em] text-[color:var(--accent-text)]">{count}</span>
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className="min-w-0">
      <span aria-hidden className="mr-[8px] text-[color:var(--accent-text)]">◆</span>
      {title}
      {count != null ? " " : null}
      {count != null ? (
        <span className="ml-[6px] font-mono text-[11px] font-medium tracking-[.08em] text-[color:var(--accent-text)]">{count}</span>
      ) : null}
    </span>
  );
}

/** A band's "Title · N" copy split on its last " · ": the title, and the count when there is one. */
export function splitBand(text: string): { title: string; count?: string } {
  const cut = text.lastIndexOf(" · ");
  return cut < 0 ? { title: text } : { title: text.slice(0, cut), count: text.slice(cut + 3) };
}

/** The accessible name `BandText` gives a heading: the title, a space, the count. */
export function bandName(text: string): string {
  const { title, count } = splitBand(text);
  return count === undefined ? title : `${title} ${count}`;
}

/** A band's "Title · N" copy drawn as the deck boxes' head: the diamond, the title, the mono count. A string with no
 *  " · " is the title alone. The split is on the last " · ", so a title may not hold one itself. */
export function BandText({ text }: { text: string }) {
  const { title, count } = splitBand(text);
  return <BandTitle title={title} count={count} />;
}

/** The band as one flex row: the heading at the start, `aside` beside it at the end. The aside is a sibling of the
 *  heading, never inside it, so a screen reader's heading list reads the title alone. `truncate` ends a title too long
 *  for its row in an ellipsis rather than run under the count or the aside (a deck's name, #3440); the full title stays
 *  in the heading's text. Off, the title wraps: a band that carries a sentence keeps all of it. */
export function DeckBoxBand({ as: Tag = "h2", id, title, count, aside, bare = false, truncate = false }: {
  as?: ElementType;
  id?: string;
  title: ReactNode;
  count?: ReactNode;
  aside?: ReactNode;
  /** No hairline under it: a band that is the whole box (a folded shelf). */
  bare?: boolean;
  truncate?: boolean;
}) {
  return (
    <div
      className={`flex ${BAND_HEIGHT} items-center justify-between gap-[12px] py-[8px] pl-[14px] pr-[10px] md:pl-[16px] md:pr-[14px] ${BAND_GROUND} ${bare ? "" : BAND_RULE}`}
    >
      <Tag id={id} className="m-0 min-w-0 text-[length:inherit] font-[inherit] leading-[inherit]">
        <BandTitle title={title} count={count} truncate={truncate} />
      </Tag>
      {aside}
    </div>
  );
}

/** The foot band: keys, a cross-link, a footnote. Same padding as the band, the hairline above it. */
export function DeckBoxFoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-[7px] px-[14px] py-[12px] md:px-[16px] [border-top:1px_solid_var(--border)] ${className}`}>{children}</div>
  );
}
