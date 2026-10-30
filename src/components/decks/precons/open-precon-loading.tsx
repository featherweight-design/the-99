// What an open precon's page draws while it loads (announcements Early-List board, frame 7: "The precon page's
// skeleton: head, two bands, rows"): the real back link, the head's thumb and three lines, the two bands, then a
// group heading and its rows, at their real heights. Served by the early list's `loading.tsx`.

import Link from "next/link";
import { preconsCopy } from "../../../lib/copy/precons";
import { preconsLoadingCopy } from "../../../lib/copy/shell";
import { StallWatch } from "../../shell/nav-stall";
import { PendingReporter } from "../../shell/pending-reporter";

const SHAPE = "block rounded-[3px] bg-[color:var(--elevated)]";

export function OpenPreconLoading() {
  return (
    <div data-loading-screen className="pb-[96px]">
      <span role="status" className="sr-only">{preconsLoadingCopy.status}</span>
      <StallWatch />
      <header className="flex flex-col gap-[12px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] p-[12px_16px_14px] md:p-[16px_22px_18px]">
        <Link href="/decks/precons" className="flex min-h-[24px] items-center self-start font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
          {preconsCopy.open.back}
          <PendingReporter href="/decks/precons" />
        </Link>
        <div aria-hidden className="flex flex-col gap-[12px] anim-skeleton">
          <div className="flex items-start gap-[12px]">
            <span className="block h-[89px] w-[64px] flex-none rounded-[5px] bg-[color:var(--elevated)] md:h-[117px] md:w-[84px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
              <span className={`${SHAPE} h-[10px] w-[120px]`} />
              <span className={`${SHAPE} h-[20px] w-[60%]`} />
              <span className={`${SHAPE} h-[12px] w-[40%]`} />
            </div>
          </div>
          <span className="block h-[58px] rounded-[10px] bg-[color:var(--elevated)]" />
          <span className="block h-[52px] rounded-[10px] bg-[color:var(--elevated)]" />
        </div>
      </header>
      <div aria-hidden className="flex flex-col gap-[14px] p-[12px_16px_16px] anim-skeleton md:p-[14px_26px_20px]">
        <span className={`${SHAPE} h-[14px] w-[90px]`} />
        {Array.from({ length: 7 }, (_, i) => <span key={i} className="block h-[36px] rounded-[8px] bg-[color:var(--surface-rail)]" />)}
      </div>
    </div>
  );
}
