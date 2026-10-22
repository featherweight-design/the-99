// Settings' frame (menu and Home handoff, `Settings.dc.html` `.stp`): the 720 column `/friends` uses, the title and its
// mono sub line, then each section the page draws. One element at every width; only sizes move at `md`.
import type { ReactNode } from "react";
import { settingsCopy } from "../../lib/copy/settings";

export function SettingsView({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto box-border flex w-full max-w-[720px] flex-col px-[16px] pb-[40px] pt-[22px] md:px-0 md:pb-[50px] md:pt-[36px]">
      <h1 className="m-0 font-display text-[22px] font-bold leading-[normal] text-[color:var(--fg)] md:text-[28px]">{settingsCopy.title}</h1>
      <p className="m-0 mt-[4px] font-mono text-[11px] text-[color:var(--fg-faint)]">{settingsCopy.sub}</p>
      {children}
    </div>
  );
}
