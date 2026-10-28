"use client";

// "‹ Back to {screen}" (About visual build, plan `2026-10-27-about-visual.md`, PR 6a; handoff call 5, board Ways-In
// `.sticky` and `.back`): held at the top of an About page while the ? brought the reader here, sticky under the
// header at both widths. Pressing it goes back to the screen the ? was pressed on.
//
// The server validates `from` (`safeFrom`) and names its screen (`backScreenName`); this draws the bar only while the
// LIVE address still carries that `from`, so moving within About (an On this page chip drops it) takes the bar away.

import Link from "next/link";
import { useLiveQuery } from "../../../lib/commanders/live-query";
import { FROM_PARAM } from "../../../lib/discovery/page-tools";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
import { mirrorUrl } from "../../../lib/url/mirror";
import { PendingReporter } from "../../shell/pending-reporter";
import { TOUCH_HIT } from "../../ui/touch-hit";

export function BackBar({ from, screen }: { from: string; screen: string }) {
  const live = new URLSearchParams(useLiveQuery(new URLSearchParams({ [FROM_PARAM]: from }).toString())).get(FROM_PARAM);
  if (live !== from) return null;
  return (
    <div
      data-about-back
      className="sticky top-[var(--header-offset,0px)] z-[4] flex items-center gap-[10px] border-b border-b-[color:var(--border)] bg-[color:var(--bg)] px-[16px] py-[8px] md:-mx-[30px] md:px-[30px] md:py-[10px]"
    >
      <Link
        href={from}
        className={`${TOUCH_HIT} inline-flex h-[30px] items-center gap-[6px] rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] pl-[9px] pr-[12px] text-[13px] font-medium text-[color:var(--fg-body)] no-underline hover:text-[color:var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]`}
      >
        {ABOUT_PAGE_STRINGS.back(screen)}
        <PendingReporter href={from} />
      </Link>
    </div>
  );
}

/** Takes `from` out of the live address, keeping the rest: a move within About ends the trip the ? started. */
export function dropFrom(hash?: string): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(FROM_PARAM)) return;
  url.searchParams.delete(FROM_PARAM);
  if (hash !== undefined) url.hash = hash;
  mirrorUrl(url);
}
