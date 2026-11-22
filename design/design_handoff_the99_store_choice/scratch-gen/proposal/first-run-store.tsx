"use client";
// Store choice R1·Q1 PROPOSAL (Hugh, 2026-11-22: "also part of the onboarding flow"). An unnumbered first-run row,
// after signature and before Add your friends, in the Friends row's live box. Not a step: the kicker stays Step 1 of 3,
// and nothing waits on it, since Mana Pool is already chosen. The switch is the shipped SegmentedSwitch (radio, compact,
// fill), saved on press with the Settings section's write; a failed write puts the last store back and raises the same
// toast. Once the player has any cards the checklist is gone and Settings' Store section (and Change store) remain.
// A fourth store adds a segment; past what 390 holds, the switch takes the shipped `scroll` option.
import { useState } from "react";
import { storeCopy } from "../../lib/copy/store";
import { STORES, type StoreId } from "../../lib/store/stores";
import { SegmentedSwitch } from "../ui/segmented-switch";

export function FirstRunStoreRow({ store }: { store: StoreId }) {
  const [value, setValue] = useState<StoreId>(store);
  const c = storeCopy.firstRun;
  return (
    <section
      aria-labelledby="first-run-store-title"
      data-first-run-store=""
      className="flex flex-col gap-[12px] rounded-[14px] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface-inset)] p-[14px_15px] font-sans sm:p-[15px_18px]"
    >
      <div className="flex items-center gap-[12px] sm:gap-[14px]">
        <span aria-hidden className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] [border:1.5px_solid_var(--accent-shadow)]">
          <span className="h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <b id="first-run-store-title" className="font-display text-[15px] font-semibold text-[color:var(--fg)] sm:text-[16px]">{c.title}</b>
          <span className="text-[12px] leading-[1.45] text-[color:var(--fg-muted)]">{c.line}</span>
        </span>
      </div>
      <div className="sm:pl-[36px]">
        <SegmentedSwitch
          kind="radio"
          size="compact"
          fill
          ariaLabel={storeCopy.groupLabel}
          segments={STORES.map((s) => ({ value: s.id, label: s.name }))}
          value={value}
          onChange={setValue}
        />
      </div>
    </section>
  );
}
