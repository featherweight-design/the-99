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

type PageHeaderBase = {
  uniqueCardsRead: number;
  /** Omitted where nothing is ranked, which drops the clause entirely. */
  avail?: "all" | "free";
};

/**
 * Three arms rather than five optional props. The scope control and the subtitle
 * that restates what it selected arrive together or not at all — the
 * collection-empty and no-candidates pages render this header with no list
 * beneath it and get today's line unchanged — and only the discovery scope has
 * an ordering to name, so `sort` belongs to that arm alone.
 */
type PageHeaderProps =
  | (PageHeaderBase & {
      scope?: never;
      onScopeChange?: never;
      scopePending?: never;
      sort?: never;
      candidateCount?: never;
    })
  | (PageHeaderBase & {
      scope: "owned";
      onScopeChange: (next: "owned" | "play") => void;
      /** The scope a flip is heading for, or null. Passed straight through to
          the control, which is the only thing that goes optimistic — the
          subtitle below still names the list that is on screen. */
      scopePending?: "owned" | "play" | null;
      candidateCount: number;
      sort?: never;
    })
  | (PageHeaderBase & {
      scope: "play";
      onScopeChange: (next: "owned" | "play") => void;
      scopePending?: "owned" | "play" | null;
      candidateCount: number;
      sort: "fit" | "new";
    });

export function PageHeader(props: PageHeaderProps) {
  const { uniqueCardsRead, avail } = props;

  // Under a scope the population and the ordering lead, and the card count moves
  // inside the copy module's own sentence — which formats its figures itself, so
  // there is no `toLocaleString` on this path.
  const lead =
    props.scope === undefined
      ? `${uniqueCardsRead.toLocaleString("en-US")} cards scanned`
      : props.scope === "owned"
        ? discoveryCopy.scope.subtitleOwned(props.candidateCount, uniqueCardsRead)
        : discoveryCopy.scope.subtitlePlay(props.candidateCount, uniqueCardsRead, props.sort);

  // The availability clause stays appended under every scope. It is the only
  // place `/commanders` says whether it ranked against the free pool or against
  // everything owned, and dropping it would regress a shipped surface. Under a
  // scope it names the POOL rather than the ordering: the shipped clause is
  // "ranked by fit", which the discovery lead has already named for itself, and
  // appending it produced "ranked by what is new to you · ranked by fit".
  const clause = avail
    ? props.scope === undefined
      ? avail === "free"
        ? availabilityCopy.ranking.subtitleFree
        : availabilityCopy.ranking.subtitleAll
      : avail === "free"
        ? discoveryCopy.scope.subtitleFree
        : discoveryCopy.scope.subtitleAll
    : null;

  const subtitle = clause ? `${lead} · ${clause}` : lead;

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

      {props.scope !== undefined ? (
        <ScopeControl
          scope={props.scope}
          pending={props.scopePending}
          onChange={props.onScopeChange}
        />
      ) : null}
    </div>
  );
}
