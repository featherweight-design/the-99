// The /about index (About visual build, plan `2026-10-27-about-visual.md`, PR 6a; handoff
// `design/design_handoff_the99_about_visual/`, call 3, board Ways-In "Index" `.ap-head`, `.ix`, `.it`).
//
// About's head ("Take the tour →" where the head has always had it), then six tiles in page order, each its page's
// first capture at the reader's width with the page's name and count line; desktop tiles add the page's line. Both
// widths are in the document and one is hidden at `md`, as the pages draw their captures (call 0): a lazy image that is
// `display: none` is never fetched. Phone: two across; desktop: three. A tile is a link to its page.

import Link from "next/link";
import type { AboutArea } from "../../../lib/copy/about-pages";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
import { aboutMenuCopy } from "../../../lib/copy/about";
import { TOUR_HREF, tourAgainCopy } from "../../../lib/copy/discovery";
import { PendingReporter } from "../../shell/pending-reporter";
import { TOUCH_HIT } from "../../ui/touch-hit";

/** A tile's picture: a capture and its pixel size. */
export type IndexShot = { src: string; w: number; h: number };

export type IndexTile = {
  area: AboutArea;
  name: string;
  line: string;
  /** "N screens · N good to know", counted from what the reader is drawn. */
  count: string;
  phone: IndexShot | null;
  desktop: IndexShot | null;
};

function Picture({ shot, top, className }: { shot: IndexShot | null; top: string; className: string }) {
  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden border-b border-b-[color:var(--border)] bg-[color:var(--bg)] ${className}`}
    >
      {shot && (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed-size capture served as-is from public/
        <img
          src={shot.src}
          width={shot.w}
          height={shot.h}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute left-0 block h-auto w-full"
          style={{ top }}
        />
      )}
    </div>
  );
}

export function AboutIndex({ tiles }: { tiles: readonly IndexTile[] }) {
  return (
    <div className="flex flex-col md:px-[30px]">
      <div className="w-full max-w-[1180px]">
        <header className="flex flex-col gap-[6px] px-[16px] pt-[18px] md:px-0 md:pt-[30px]">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">
            {aboutMenuCopy.label}
          </span>
          <h1 className="m-0 font-display text-[27px] font-semibold text-[color:var(--fg)] md:text-[34px] md:tracking-[0.01em]">
            {aboutMenuCopy.label}
          </h1>
          <p className="m-0 text-[14.5px] leading-[1.5] text-[color:var(--fg-body)]">
            {ABOUT_PAGE_STRINGS.index}
            {" "}
            <Link
              data-tour-again
              href={TOUR_HREF}
              className={`${TOUCH_HIT} whitespace-nowrap py-[10px] text-[14.5px] font-semibold text-[color:var(--accent-text)] hover:underline`}
            >
              {tourAgainCopy.aboutPress}
              <PendingReporter href={TOUR_HREF} />
            </Link>
          </p>
        </header>
        <ul
          data-about-index
          className="m-0 grid list-none grid-cols-2 gap-[12px] p-[16px] md:grid-cols-3 md:gap-[18px] md:px-0 md:pb-0 md:pt-[22px]"
        >
          {tiles.map((t) => (
            <li key={t.area}>
              <Link
                href={`/about/${t.area}`}
                data-about-tile={t.area}
                className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] no-underline hover:border-[color:var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              >
                <Picture shot={t.phone} top="-14%" className="md:hidden" />
                <Picture shot={t.desktop} top="0" className="hidden md:block" />
                <span className="flex flex-col gap-[4px] px-[12px] pb-[12px] pt-[11px]">
                  <span className="text-[15.5px] font-semibold text-[color:var(--fg)]">{t.name}</span>
                  <span className="hidden text-[13.5px] leading-[1.5] text-[color:var(--fg-body)] md:block">{t.line}</span>
                  <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{t.count}</span>
                  <PendingReporter href={`/about/${t.area}`} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
