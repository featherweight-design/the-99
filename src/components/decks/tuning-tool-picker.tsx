"use client";
// The phone's tool picker (deck refresh R1-ToolPicker): the open tool's row at the head of every phone
// tool frame, and the Tuning sheet it opens. The sheet is the shipped bottom-sheet primitive (focus
// trap, Escape, scroll lock, handle drag); a row is the hub's own tile status in a list, so a tool in
// flight reads the same here as on its tile (`statusPhone`).

import { useRef } from "react";

import { tuningHubCopy as copy } from "../../lib/copy/tuning-hub";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { Chevron } from "../ui/chevron";
import { Sheet, SheetHeader } from "../ui/sheet";
import { TuningToolMark, type TuningTool } from "./tuning-tool-mark";

export type PickerView = {
  tool: TuningTool;
  name: string;
  /** The row's second line: a run in flight, the inert reason, the last run, or the price. */
  line: string;
  /** The tile's phone status, drawn at the trigger's end. */
  status: string;
  running: boolean;
  inert: boolean;
};

/** The row that opens the sheet: the open tool's mark and name, a caret, its status at the end. */
export function ToolPickerTrigger({ view, open, onOpen }: { view: PickerView; open: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
      data-tool-picker=""
      className="flex min-h-[48px] w-full cursor-pointer items-center gap-[10px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--elevated)] py-0 pl-[14px] pr-[12px] text-left font-sans"
    >
      <span style={{ color: "var(--accent)" }}><TuningToolMark tool={view.tool} size={16} /></span>
      <span className="text-[14px] font-semibold text-[var(--fg)]">{view.name}</span>
      <Chevron className="text-[11px] text-[var(--fg-muted)]" />
      {view.status ? (
        <span className="ml-auto min-w-0 truncate font-mono text-[11px] font-medium" style={{ color: view.running ? "var(--accent-text)" : "var(--fg-faint)" }}>{view.status}</span>
      ) : null}
    </button>
  );
}

/** The Tuning sheet: All tools, then each tool. The open tool carries a check; an inert tool is dashed and cannot be pressed. */
export function ToolPickerSheet({ views, openTool, onPick, onDismiss }: {
  views: readonly PickerView[];
  openTool: TuningTool;
  onPick: (tool: TuningTool | null) => void;
  onDismiss: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y(panelRef, onDismiss);
  return (
    <Sheet open portal frameClassName="md:hidden" onDismiss={onDismiss} ariaLabel={copy.picker.sheetLabel} panelRef={panelRef} header={<SheetHeader title={copy.picker.sheetTitle} closeLabel={copy.picker.close} onDismiss={onDismiss} />}>
      <ul className="m-0 flex min-h-0 list-none flex-col overflow-y-auto p-0 pb-[12px]">
        <li>
          <PickerRow name={copy.allTools} line={copy.picker.allToolsLine} onPress={() => onPick(null)} />
        </li>
        {views.map((v) => (
          <li key={v.tool}>
            <PickerRow
              mark={<TuningToolMark tool={v.tool} size={18} />}
              name={v.name}
              line={v.line}
              on={v.tool === openTool}
              inert={v.inert}
              running={v.running}
              onPress={() => (v.tool === openTool ? onDismiss() : onPick(v.tool))}
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function PickerRow({ mark, name, line, on = false, inert = false, running = false, onPress }: {
  mark?: React.ReactNode;
  name: string;
  line: string;
  on?: boolean;
  inert?: boolean;
  running?: boolean;
  onPress: () => void;
}) {
  const body = (
    <>
      <span className="flex h-[36px] w-[36px] flex-none items-center justify-center rounded-[8px] bg-[var(--elevated)]" style={{ color: inert ? "var(--fg-locked)" : running ? "var(--accent-text)" : "var(--fg-muted)" }}>{mark}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[14px] font-semibold" style={{ color: inert ? "var(--fg-faint)" : "var(--fg)" }}>{name}</span>
        <span className="text-[12px] leading-[1.4]" style={{ color: running ? "var(--accent-text)" : inert ? "var(--fg-faint)" : "var(--fg-muted)" }}>{line}</span>
      </span>
      {on ? <span aria-hidden="true" className="w-[16px] flex-none font-mono text-[14px]" style={{ color: "var(--accent)" }}>✓</span> : null}
    </>
  );
  if (inert) {
    return (
      <div role="group" aria-disabled="true" className="mx-[12px] my-[6px] flex min-h-[60px] items-center gap-[12px] rounded-[10px] border border-dashed border-[var(--border-dashed)] px-[12px] py-[8px]">{body}</div>
    );
  }
  return (
    <button
      type="button"
      aria-current={on ? "true" : undefined}
      onClick={onPress}
      className={`flex min-h-[60px] w-full cursor-pointer items-center gap-[12px] border-0 border-t border-solid border-[var(--border)] px-[16px] py-[8px] text-left font-sans ${on ? "bg-[var(--surface-raised)]" : "bg-transparent"}`}
    >
      {body}
    </button>
  );
}
