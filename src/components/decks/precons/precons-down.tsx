// L4: the precon list could not be read (the tables are empty or unreadable). Nothing a reader owns
// is affected, and the doors elsewhere stay; the next visit reads again.

import Link from "next/link";
import { preconsCopy } from "../../../lib/copy/precons";
import { PendingReporter } from "../../shell/pending-reporter";

export function PreconsDown() {
  const copy = preconsCopy;
  return (
    <div className="flex flex-col items-center gap-[10px] px-[16px] py-[64px] text-center">
      <h1 className="m-0 font-display text-[20px] font-normal text-[color:var(--fg)]">{copy.down.head}</h1>
      <p className="m-0 max-w-[380px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{copy.down.body}</p>
      <Link href="/decks" className="flex min-h-[44px] items-center font-sans text-[13px] font-medium text-[color:var(--fg)]">
        {copy.down.back}
        <PendingReporter href="/decks" />
      </Link>
    </div>
  );
}
