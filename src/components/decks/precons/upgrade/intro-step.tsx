"use client";

// I1, what to expect (handoff Intro.dc): the lead and five lines, each led by a line icon on the strategy cards' medallion, with no figure
// repeating the copy beside it and no pick on this screen.
import type { ReactNode } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { SwapGlyph } from "../../change-commander-glyph";

const copy = preconUpgradeCopy.intro;

const ICONS: Record<(typeof copy.lines)[number]["icon"], ReactNode> = {
  swap: <SwapGlyph size={18} />,
  price: (<><path d="M3.5 12.5L12 4h8v8l-8.5 8.5z" /><circle cx="16" cy="8" r="1.4" /></>),
  picks: (<><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="8" cy="7" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="10" cy="17" r="1.6" /></>),
  credit: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M9.5 10.5h5M9.5 13.5h5" /></>),
  versions: (<><rect x="4" y="5" width="12" height="14" rx="2" /><path d="M8 3h12v14" /></>),
};

export function IntroStep() {
  return (
    <div className="flex flex-col gap-[14px]">
      <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.lead}</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {copy.lines.map((l) => (
          <li key={l.icon} className="flex items-start gap-[12px] border-x-0 border-b-0 border-t border-solid border-t-[color:var(--border)] py-[12px] last:border-b last:border-b-[color:var(--border)]">
            <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[color:var(--elevated)] text-[color:var(--accent-text)]">
              {l.icon === "swap" ? ICONS.swap : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[l.icon]}</svg>
              )}
            </span>
            <span className="text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
              <span className="font-semibold text-[color:var(--fg)]">{l.head}</span> {l.body}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
