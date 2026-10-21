// B1 (buying credits, U4): one calm band in place of the buy controls while a dispute pauses this reader's buying. It
// is the return band's frame (handoff `.band`: 12px radius, 14px by 16px, `--surface` on `--border-strong`), led by the
// pause mark (an 18px ring of `--fg-muted` holding two 2px by 7px bars), the same at every width. It accuses no one,
// shows on no other page, and leaves plan management and the balances alone.

import { creditsPageCopy } from "../../lib/copy/credits-page";
import { SupportLink } from "./support-link";

const c = creditsPageCopy.pause;

export function PauseBand() {
  return (
    <div
      data-pause-band=""
      className="flex items-start gap-[12px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[16px] py-[14px]"
    >
      <span aria-hidden className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center gap-[2px] rounded-full border-[1.5px] border-solid border-[color:var(--fg-muted)]">
        <i className="block h-[7px] w-[2px] bg-[color:var(--fg-muted)]" />
        <i className="block h-[7px] w-[2px] bg-[color:var(--fg-muted)]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <b className="text-[14.5px] font-semibold text-[color:var(--fg)]">{c.title}</b>
        <p className="m-0 text-pretty text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">
          {c.before}
          <SupportLink />
          {c.after}
        </p>
      </div>
    </div>
  );
}
