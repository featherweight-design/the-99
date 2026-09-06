"use client";
// Page Header — /commanders list (§Page Header — /commanders list).
// Mobile: padding 20px 18px 12px, border-bottom 1px solid var(--border).
// #35 dropped this header's own account avatar: the shell's MobileHeader renders
// on every signed-in route, so below sm the page showed two account triggers.
// Desktop: padding 28px 34px 0, no border-bottom.
// Title: Cinzel 700, 22px mobile / 30px desktop, var(--fg).
// Subtitle: IBM Plex Mono, 11px mobile / 12px desktop, var(--fg-faint), margin-top 2/4px.
// Row 7.5 appends the ranking clause to the shipped `N cards scanned` line. The
// canvas draws a commander count there instead ("24 generals · ranked by fit");
// changing that leading noun is a separate question from the availability ask.
//
// One subtree with responsive classes, not a mobile branch beside a desktop one.
// The scope control is a radiogroup, and a second copy of it would put four
// radios in the accessibility tree for a two-option control.

import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { ScopeControl } from "./scope-control";

type PageHeaderProps = {
  uniqueCardsRead: number;
  /** Omitted where nothing is ranked, which drops the clause entirely. */
  avail?: "all" | "free";
  /**
   * The scope control and the subtitle that restates what it selected. Optional
   * and absent together: the collection-empty and no-candidates pages render
   * this header with no list beneath it, and get today's line unchanged.
   */
  scope?: "owned" | "play";
  onScopeChange?: (next: "owned" | "play") => void;
  sort?: "fit" | "new";
  candidateCount?: number;
};

export function PageHeader({
  uniqueCardsRead,
  avail,
  scope,
  onScopeChange,
  sort = "fit",
  candidateCount = 0,
}: PageHeaderProps) {
  // Under a scope the population and the ordering lead, and the card count moves
  // inside the copy module's own sentence — which formats its figures itself, so
  // there is no `toLocaleString` on this path.
  const lead = scope
    ? scope === "owned"
      ? discoveryCopy.scope.subtitleOwned(candidateCount, uniqueCardsRead)
      : discoveryCopy.scope.subtitlePlay(candidateCount, uniqueCardsRead, sort)
    : `${uniqueCardsRead.toLocaleString("en-US")} cards scanned`;

  // The availability clause stays appended under every scope. It is the only
  // place `/commanders` says whether it ranked against the free pool or against
  // everything owned, and dropping it would regress a shipped surface.
  const subtitle = avail
    ? `${lead} · ${
        avail === "free"
          ? availabilityCopy.ranking.subtitleFree
          : availabilityCopy.ranking.subtitleAll
      }`
    : lead;

  return (
    <div
      className={[
        "flex flex-col gap-3 border-b border-[color:var(--border)]",
        "px-[18px] pt-5 pb-3",
        "sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6",
        "sm:border-b-0 sm:px-[34px] sm:pt-7 sm:pb-0",
      ].join(" ")}
    >
      <div>
        <h1
          className="font-display font-bold m-0 text-[22px] sm:text-[30px]"
          style={{ color: "var(--fg)" }}
        >
          Commanders
        </h1>
        <p
          className="font-mono m-0 mt-[2px] text-[11px] sm:mt-1 sm:text-[12px]"
          style={{ color: "var(--fg-faint)" }}
        >
          {subtitle}
        </p>
      </div>

      {scope && onScopeChange ? (
        <ScopeControl scope={scope} onChange={onScopeChange} />
      ) : null}
    </div>
  );
}
