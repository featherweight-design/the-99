"use client";
// The first-run store row (store choice handoff, call 2 / Q1, Onboarding O1 to O4): unnumbered, after step 3 and the
// signature row and before Add your friends, so the kicker stays Step 1 of 3 and nothing waits on it (Mana Pool is
// already chosen). The box is the Friends row's live box with the News row's accent diamond; the stores are the
// shipped SegmentedSwitch, saved on press with the Settings section's write (`useStoreChoice`), so a failed write puts
// the last store back and raises the same toast. Once the player has cards the checklist goes, and Settings' Store
// section and Change store remain.

import { storeCopy } from "../../lib/copy/store";
import { STORE_INFO } from "../../lib/stores/info";
import { STORES, type Store } from "../../lib/stores/rows";
import { SocialToast } from "../social/social-toast";
import { useStoreChoice } from "../stores/use-store-choice";
import { SegmentedSwitch } from "../ui/segmented-switch";

const c = storeCopy.firstRun;
const SEGMENTS = STORES.map((id) => ({ value: id, label: STORE_INFO[id].name, data: { "data-store-segment": id } as const }));

export function FirstRunStoreRow({ store }: { store: Store }) {
  const { on, save, toast, clearToast } = useStoreChoice(store);
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
          <b id="first-run-store-title" className="font-display text-[15px] font-semibold text-[color:var(--fg)] sm:text-[16px]">
            {c.title}
          </b>
          <span className="text-[12px] leading-[1.45] text-[color:var(--fg-muted)]">{c.line}</span>
        </span>
      </div>
      <div className="sm:pl-[36px]">
        <SegmentedSwitch
          kind="radio"
          size="compact"
          fill
          ariaLabel={storeCopy.settings.groupLabel}
          segments={SEGMENTS}
          value={on}
          onChange={save}
        />
      </div>
      <SocialToast toast={toast} onDone={clearToast} />
    </section>
  );
}
