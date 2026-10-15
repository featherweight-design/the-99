// Help me choose's two doors (HANDOFF §1). Each is drawn only where its host passes the feature's
// flag; neither reads the flag itself, because the flag is a server setting and both hosts render
// on the client.

import Link from "next/link";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { helpMeChooseHistoryCopy } from "../../lib/copy/help-me-choose-history";
import { CHOOSE_PATH } from "../../lib/intake/submit";

const copy = helpMeChooseCopy.door;

/**
 * The create picker's door: the first thing in its list column, above the search, never in the dock.
 * `pastRuns` is set only when the player has a run History would list: the link closes the sentence on
 * a wide door and takes its own 44px line under it on a narrow one.
 */
export function HelpMeChooseDoor({ pastRuns = false }: { pastRuns?: boolean }) {
  return (
    <div
      data-testid="help-me-choose-door"
      className="mb-[14px] flex flex-col items-stretch gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[13px_14px] md:mb-[16px] md:flex-row md:items-center md:gap-[18px] md:rounded-[11px] md:p-[15px_18px]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <p className="m-0 font-display text-[14.5px] font-semibold text-[color:var(--fg)] md:text-[16px]">{copy.head}</p>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] md:text-[13px]">
          {copy.body}
          {pastRuns && <PastRunsLink className="hidden md:inline md:ml-[6px]" />}
        </p>
        {pastRuns && <PastRunsLink className="flex min-h-[44px] items-center md:hidden" />}
      </div>
      <Link
        href={CHOOSE_PATH}
        className="flex h-[44px] flex-none items-center justify-center rounded-[8px] border border-solid border-[color:var(--accent)] px-[16px] text-[13.5px] font-semibold text-[color:var(--accent)] no-underline md:h-[38px]"
      >
        {copy.cta}
      </Link>
    </div>
  );
}

function PastRunsLink({ className }: { className: string }) {
  return (
    <Link
      href={`${CHOOSE_PATH}?v=history`}
      prefetch={false}
      data-testid="past-runs-link"
      className={`${className} text-[12.5px] font-medium text-[color:var(--accent)] no-underline md:text-[13px]`}
    >
      {helpMeChooseHistoryCopy.doorLink}
    </Link>
  );
}

/**
 * Discover's link, on the rack's result line: at its right end on a wide rack, on its own 44px line
 * under the count otherwise. It carries the colors lit on Discover (`c`, `m`, the lanes' own
 * encoding) and nothing else: search, order and scope stay behind.
 */
export function DiscoverChooseLink({ colors, exactly, wide }: { colors: readonly string[]; exactly: boolean; wide: boolean }) {
  const sp = new URLSearchParams();
  if (colors.length > 0) sp.set("c", colors.join(",").toLowerCase());
  if (colors.length > 0 && exactly) sp.set("m", "exact");
  const qs = sp.toString();
  return (
    <p
      data-testid="discover-choose-link"
      className={`relative m-0 flex items-center gap-[5px] font-sans text-[12.5px] text-[color:var(--fg-muted)] ${wide ? "ml-auto" : "min-h-[44px]"}`}
    >
      {copy.discoverLead}
      <Link
        href={qs ? `${CHOOSE_PATH}?${qs}` : CHOOSE_PATH}
        className={[
          "border-0 border-b border-b-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] border-solid border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] text-[color:var(--accent)] no-underline",
          // The words are 12.5px; the press is the whole 44px line they sit on, the lead included:
          // the link's own box is not positioned, so its overlay spans the line rather than the link.
          "after:absolute after:left-0 after:right-0 after:top-1/2 after:h-[44px] after:-translate-y-1/2 after:content-['']",
        ].join(" ")}
      >
        {copy.cta}
      </Link>
    </p>
  );
}
