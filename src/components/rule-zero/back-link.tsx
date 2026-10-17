// `‹ Friends` above a Rule 0 table (boards R1 and R2, and L4): the phone's 44px row draws the chevron as its own 20px
// glyph; desktop's head band draws it as one run of text.

import Link from "next/link";

import { socialCopy } from "../../lib/copy/social";
import { PendingReporter } from "../shell/pending-reporter";

const back = socialCopy.friendPage.back; // "‹ Friends"

/** `‹ Friends`: the phone draws the chevron as its own 20px glyph, desktop as one run of text. */
export function BackLink({ className, glyph = false }: { className: string; glyph?: boolean }) {
  return (
    <Link href="/friends" className={`flex flex-none items-center text-[color:var(--fg-muted)] no-underline hover:text-[color:var(--fg)] ${className}`}>
      {glyph ? (
        <>
          <b aria-hidden className="-mt-[2px] text-[20px] font-normal leading-none">{back.slice(0, 1)}</b>
          {back.slice(1).trim()}
        </>
      ) : (
        back
      )}
      <PendingReporter href="/friends" />
    </Link>
  );
}
