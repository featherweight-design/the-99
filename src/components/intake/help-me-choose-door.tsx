// Help me choose's two doors (HANDOFF §1). Each is drawn only where its host passes the feature's
// flag; neither reads the flag itself, because the flag is a server setting and both hosts render
// on the client.

import Link from "next/link";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { CHOOSE_PATH } from "../../lib/intake/submit";

const copy = helpMeChooseCopy.door;

/** The create picker's door: the first thing in its list column, above the search, never in the dock. */
export function HelpMeChooseDoor() {
  return (
    <div
      data-testid="help-me-choose-door"
      className="mb-[14px] flex flex-col items-stretch gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[13px_14px] md:mb-[16px] md:flex-row md:items-center md:gap-[18px] md:rounded-[11px] md:p-[15px_18px]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <p className="m-0 font-display text-[14.5px] font-semibold text-[color:var(--fg)] md:text-[16px]">{copy.head}</p>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] md:text-[13px]">{copy.body}</p>
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
      className={`m-0 flex items-center gap-[5px] font-sans text-[12.5px] text-[color:var(--fg-muted)] ${wide ? "ml-auto" : "min-h-[44px]"}`}
    >
      {copy.discoverLead}
      <Link
        href={qs ? `${CHOOSE_PATH}?${qs}` : CHOOSE_PATH}
        className={[
          "relative border-0 border-b border-solid border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] text-[color:var(--accent)] no-underline",
          // The words are 12.5px; the press is the whole 44px line they sit on.
          "after:absolute after:left-0 after:right-0 after:top-1/2 after:h-[44px] after:-translate-y-1/2 after:content-['']",
        ].join(" ")}
      >
        {copy.cta}
      </Link>
    </p>
  );
}
