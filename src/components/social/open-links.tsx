"use client";
// Your open friend links (Social R1 README decision 5; R1 Friends F2, F8). Only open ones, oldest first, as
// `listOpenInvites` returns them: `Friend link`, when it was made, the time left (whole days, then `Under a
// day left` in `--warning`), `Show` (the same dialog on that link) and `Revoke` (at once, no confirm: the row
// leaves). With none open the section is absent.

import type { OpenInvite } from "../../lib/social/friends";
import { socialCopy } from "../../lib/copy/social";
import { madeWhen, underADay } from "../../lib/social/when";
import { SECTION_HEAD } from "./friends-list";

const v = socialCopy.invites;

export function OpenLinks({
  links,
  now,
  timeZone,
  onShow,
  onRevoke,
}: {
  links: OpenInvite[];
  now: Date;
  timeZone: string | undefined;
  onShow: (link: OpenInvite) => void;
  onRevoke: (link: OpenInvite) => void;
}) {
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="links-head" className="mt-[24px] md:mt-[34px]">
      <h2 id="links-head" className={SECTION_HEAD}>{v.head(links.length)}</h2>
      <ul className="m-0 list-none p-0">
        {links.map((link) => {
          const made = madeWhen(link.createdAt, now, timeZone);
          const soon = underADay(link.expiresAt, now);
          return (
            <li key={link.token} className="flex min-h-[60px] items-center gap-[10px] py-[6px] md:min-h-[52px] md:gap-[12px] [border-bottom:1px_solid_var(--border)]" data-link-row="">
              <span aria-hidden className="hidden text-[color:var(--fg-muted)] md:flex">
                <LinkGlyph />
              </span>
              {/* At phone the made and time-left fold onto one second line (R1 phone F2); at desktop one row. */}
              <span className="flex min-w-0 flex-1 flex-col gap-[2px] md:flex-row md:items-center md:gap-[12px]">
                <span className="text-[14px] text-[color:var(--fg)]">{v.row}</span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] md:flex md:text-[11px] md:flex-1 md:items-center">
                  <span>{v.made(made)}</span>
                  <span aria-hidden className="md:hidden">{" · "}</span>
                  <span className={`md:ml-auto ${soon ? "text-[color:var(--warning)]" : "md:text-[color:var(--fg-body)]"}`}>
                    {v.left(link.expiresAt.getTime() - now.getTime())}
                  </span>
                </span>
              </span>
              <span className="flex flex-none items-center gap-[10px] md:gap-[12px]">
                <button
                  type="button"
                  aria-label={v.showAria(made)}
                  onClick={() => onShow(link)}
                  className="h-[44px] cursor-pointer rounded-[8px] bg-transparent px-[14px] font-sans text-[13px] text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:h-[32px] md:rounded-[6px] md:text-[12.5px]"
                >
                  {v.show}
                </button>
                <button
                  type="button"
                  aria-label={v.revokeAria(made)}
                  onClick={() => onRevoke(link)}
                  className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]"
                >
                  {v.revoke}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LinkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
    </svg>
  );
}
