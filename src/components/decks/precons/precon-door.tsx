// The create picker's second door (handoff `design_handoff_the99_precons`, N1, N2): Help me
// choose's box verbatim, directly under it, or first when that door is off. It goes to the list,
// whose back link then reads New deck; 181 decklists want the list's search and order, not an
// inline pick.

import Link from "next/link";
import { preconsCopy } from "../../../lib/copy/precons";
import { PendingReporter } from "../../shell/pending-reporter";

const copy = preconsCopy.door;
const HREF = "/decks/precons?from=new";

export function PreconDoor() {
  return (
    <div
      data-testid="precon-door"
      className="mb-[14px] flex flex-col items-stretch gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[13px_14px] md:mb-[16px] md:flex-row md:items-center md:gap-[18px] md:rounded-[11px] md:p-[15px_18px]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <p className="m-0 font-display text-[14.5px] font-semibold text-[color:var(--fg)] md:text-[16px]">{copy.head}</p>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] md:text-[13px]">{copy.body}</p>
      </div>
      <Link
        href={HREF}
        className="flex h-[44px] flex-none items-center justify-center rounded-[8px] border border-solid border-[color:var(--accent)] px-[16px] text-[13.5px] font-semibold text-[color:var(--accent)] no-underline md:h-[38px]"
      >
        {copy.cta}
        <PendingReporter href={HREF} />
      </Link>
    </div>
  );
}
