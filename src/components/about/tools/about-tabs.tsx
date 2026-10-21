"use client";

// About's two tabs (discovery R2·5; README-r2 C1, property table "About's tabs"). Tools is the default and the
// absence of `?tab`; Reference is `?tab=reference`, mirrored through `mirrorUrl` when the tab changes (R2 gap 12), so
// no navigation runs. `/about` (R2·6b) hands it both panels and the tab the URL asked for.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { aboutShapeCopy, TOUR_HREF, tourAgainCopy } from "../../../lib/copy/discovery";
import { PendingReporter } from "../../shell/pending-reporter";
import { useLiveQuery } from "../../../lib/commanders/live-query";
import { mirrorUrl } from "../../../lib/url/mirror";
import { ABOUT_TABS, aboutTabOf, TAB_PARAM, type AboutTab } from "../../../lib/about/tab";
import { onSegmentKeys } from "../../ui/segment-keys";
import { TOUCH_HIT } from "../../ui/touch-hit";

const tabId = (t: AboutTab) => `about-tab-${t}`;
const panelId = (t: AboutTab) => `about-panel-${t}`;

export type AboutTabsProps = {
  initial: AboutTab;
  counts: Record<AboutTab, number>;
  panels: Record<AboutTab, ReactNode>;
  /** The ? is drawn (`HELP_PANEL_ENABLED`): from `md`, a hint beside the tabs points at it. */
  helpHint: boolean;
  /** `FIRST_RUN_TOUR_ENABLED` for the reader (discovery R3·2): `Take the tour →` after the subtitle. */
  tour?: boolean;
  /**
   * Mounted from the first time its tab is drawn, and kept after. Both panels are in the document from the start (the
   * one not chosen is `hidden`), so anything that must happen only when a tab is SEEN goes here: About's visit is
   * recorded when the Reference is drawn, never on a load that stays on Tools (R2 gap 10).
   */
  onceShown?: Partial<Record<AboutTab, ReactNode>>;
};

export function AboutTabs({ initial, counts, panels, helpHint, tour = false, onceShown }: AboutTabsProps) {
  const [tab, setTab] = useState<AboutTab>(initial);
  // The tabs drawn so far, adjusted during render as `tab` moves, so a once-shown child mounts in the same commit as
  // its tab.
  const [shown, setShown] = useState<ReadonlySet<AboutTab>>(() => new Set([initial]));
  if (!shown.has(tab)) setShown(new Set(shown).add(tab));
  // A link on the page to `?tab=reference` (How it works, Open the Reference) is a soft navigation to this same route.
  // It keeps this state, and after the reader's own flip back to Tools it arrives with the same `initial` the page was
  // first rendered with, so the prop cannot tell it. The live URL can: `useLiveQuery` reports every move, the tab
  // mirror's own writes included, and a URL asking for another tab than it last asked for is followed. Followed during
  // render, not in an effect, so the Reference panel is drawn before the router scrolls to the link's `#entry`.
  const urlTab = aboutTabOf(new URLSearchParams(useLiveQuery(initial === "reference" ? `${TAB_PARAM}=reference` : "")).get(TAB_PARAM));
  const [asked, setAsked] = useState<AboutTab>(urlTab);
  if (urlTab !== asked) {
    setAsked(urlTab);
    setTab(urlTab);
  }
  const select = (next: AboutTab) => {
    if (next === tab) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "tools") url.searchParams.delete(TAB_PARAM);
    else url.searchParams.set(TAB_PARAM, next);
    mirrorUrl(url, window.history.state);
  };
  return (
    <div data-about-tabs={tab}>
      <div className="px-[16px] md:px-0">
        <h1 className="m-0 font-display text-[27px] font-semibold text-[color:var(--fg)] md:text-[34px] md:tracking-[0.01em]">
          {aboutShapeCopy.title}
        </h1>
        <p className="m-0 mt-[6px] text-[14.5px] leading-[1.5] text-[color:var(--fg-body)] md:mt-[8px] md:text-[15px] md:leading-normal">
          {tab === "tools" ? aboutShapeCopy.toolsSub : aboutShapeCopy.referenceSub}
          {/* The tour taken again (plan decision 6): a text press in the accent after the subtitle, drawn as the Tools
              tab's `Open the Reference →` is. */}
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
      {/* 390: 10px under the Tools sub (ShowcasePhone), 14px under the Reference sub (ReferencePhone); 26px on both Desk boards. */}
      <div
        className={`${tab === "tools" ? "mt-[10px]" : "mt-[14px]"} flex items-center justify-between border-b border-b-[color:var(--border)] px-[16px] md:mt-[26px] md:px-0`}
      >
        <div
          role="tablist"
          aria-label={aboutShapeCopy.tabs.label}
          className="flex gap-[26px] md:gap-[28px]"
          onKeyDown={(e) => onSegmentKeys(e, ABOUT_TABS, tabId, select)}
        >
          {ABOUT_TABS.map((t) => {
            const on = t === tab;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                id={tabId(t)}
                aria-selected={on}
                aria-controls={panelId(t)}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t)}
                className={`-mb-px border-b-2 bg-transparent px-[2px] pb-[12px] pt-[10px] text-[16px] md:pt-0 ${
                  on
                    ? "border-b-[color:var(--accent)] font-semibold text-[color:var(--fg)]"
                    : "border-b-transparent font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
                }`}
              >
                {aboutShapeCopy.tabs[t]}{" "}
                <span
                  className={`font-mono text-[12px] font-medium ${on ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}`}
                >
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>
        {helpHint && (
          <span className="hidden pb-[12px] font-mono text-[12px] text-[color:var(--fg-faint)] md:inline">
            {aboutShapeCopy.helpHint.before}{" "}
            <span
              aria-hidden
              className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-[6px] border border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
            >
              ?
            </span>
            <span className="sr-only">?</span> {aboutShapeCopy.helpHint.after}
          </span>
        )}
      </div>
      {ABOUT_TABS.map((t) => (
        <div key={t} role="tabpanel" id={panelId(t)} aria-labelledby={tabId(t)} hidden={t !== tab}>
          {panels[t]}
          {shown.has(t) && onceShown?.[t]}
        </div>
      ))}
    </div>
  );
}
