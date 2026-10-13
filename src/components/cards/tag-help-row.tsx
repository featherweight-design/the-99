"use client";

import { InfoTip } from "../ui/info-tip";

type TagHelp = { infoAria: string; lines: readonly string[]; insert: string; insertAria: string };

/**
 * The label row of a box that can name a card: its label, the "how card tags work" tip, and the `[[ ]]` button that
 * starts a tag where the caret is. The button keeps the textarea's focus (a press must not blur a box that saves on blur).
 */
export function TagHelpRow({ htmlFor, label, infoId, help, onInsert }: {
  htmlFor: string;
  label: string;
  infoId: string;
  help: TagHelp;
  onInsert: () => void;
}) {
  return (
    <div className="relative flex items-center gap-[8px]">
      <label htmlFor={htmlFor} className="block font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {label}
      </label>
      <InfoTip id={infoId} lines={help.lines} label={help.infoAria} className="self-center" />
      <button
        type="button"
        aria-label={help.insertAria}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onInsert}
        className="ml-auto h-[24px] cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[8px] font-mono text-[11px] text-[color:var(--fg-muted)]"
      >
        {help.insert}
      </button>
    </div>
  );
}
