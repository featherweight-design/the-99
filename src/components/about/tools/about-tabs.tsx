// About's Reference at `?tab=reference` (discovery R2·6b), the one tab left once the Tools tab retired (About visual
// build, plan `2026-10-27-about-visual.md`, PR 6a). Reachable only by an old bookmark and the legacy gate's `next=`;
// no link the app builds names it (`legacyHref`). It retires in PR 7b. `/about` hands it the panel.

import type { ReactNode } from "react";
import Link from "next/link";
import { aboutShapeCopy, TOUR_HREF, tourAgainCopy } from "../../../lib/copy/discovery";
import { PendingReporter } from "../../shell/pending-reporter";
import { TOUCH_HIT } from "../../ui/touch-hit";

export type AboutTabsProps = {
  /** The Reference's own count, beside its name. */
  count: number;
  panel: ReactNode;
  /** `FIRST_RUN_TOUR_ENABLED` for the reader (discovery R3·2): `Take the tour →` after the subtitle. */
  tour?: boolean;
};

export function AboutTabs({ count, panel, tour = false }: AboutTabsProps) {
  return (
    <div data-about-tabs="reference">
      <div className="px-[16px] md:px-0">
        <h1 className="m-0 font-display text-[27px] font-semibold text-[color:var(--fg)] md:text-[34px] md:tracking-[0.01em]">
          {aboutShapeCopy.title}
        </h1>
        <p className="m-0 mt-[6px] text-[14.5px] leading-[1.5] text-[color:var(--fg-body)] md:mt-[8px] md:text-[15px] md:leading-normal">
          {aboutShapeCopy.referenceSub}
          {tour && (
            <>
              {" "}
              <Link data-tour-again href={TOUR_HREF} className={`${TOUCH_HIT} whitespace-nowrap py-[10px] text-[14.5px] font-semibold text-[color:var(--accent-text)] hover:underline`}>
                {tourAgainCopy.aboutPress}
                <PendingReporter href={TOUR_HREF} />
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="mt-[14px] flex items-center border-b border-b-[color:var(--border)] px-[16px] md:mt-[26px] md:px-0">
        <span className="-mb-px border-b-2 border-b-[color:var(--accent)] px-[2px] pb-[12px] pt-[10px] text-[16px] font-semibold text-[color:var(--fg)] md:pt-0">
          {aboutShapeCopy.reference}{" "}
          <span className="font-mono text-[12px] font-medium text-[color:var(--accent-text)]">{count}</span>
        </span>
      </div>
      <div id="about-panel-reference">{panel}</div>
    </div>
  );
}
