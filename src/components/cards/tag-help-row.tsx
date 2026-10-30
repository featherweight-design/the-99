"use client";

import { InfoTip } from "../ui/info-tip";

type TagHelp = { infoAria: string; lines: readonly string[] };

/** The label row of a box that can name a card: its label and the "how card tags work" tip. The `[[ ]]` key lives in the box's foot (TaggedBox). */
export function TagHelpRow({ htmlFor, label, infoId, help }: {
  htmlFor: string;
  label: string;
  infoId: string;
  help: TagHelp;
}) {
  return (
    <div className="relative flex items-center gap-[8px]">
      <label htmlFor={htmlFor} className="block font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {label}
      </label>
      <InfoTip id={infoId} lines={help.lines} label={help.infoAria} className="self-center" />
    </div>
  );
}
