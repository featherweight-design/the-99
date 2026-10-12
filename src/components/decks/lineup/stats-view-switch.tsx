"use client";

// `Tiles · Stats` (handoff R2 StatsViewSwitch): the /decks view row's first control, a `role="tablist"` of two
// segments. Drawn only with `LINEUP_ENABLED` on; the page reads nothing for Stats while it is off.

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { DecksView } from "../../ui/view-cookie";

const copy = decksStatsCopy.view;
export const SEGMENT = "inline-flex h-[40px] items-center justify-center rounded-[7px] px-[13px] text-[13px] md:h-[30px]";
export const SEGMENT_ON = "bg-[var(--elevated)] font-semibold text-[color:var(--fg)]";
export const SEGMENT_OFF = "bg-transparent font-normal text-[color:var(--fg-muted)]";

export function StatsViewSwitch({ view, onView }: { view: DecksView; onView: (v: DecksView) => void }) {
  const seg = (v: DecksView, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      data-decks-view={v}
      onClick={() => { if (view !== v) onView(v); }}
      className={`${SEGMENT} ${view === v ? SEGMENT_ON : SEGMENT_OFF}`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label={copy.aria} className="flex flex-none gap-[2px] rounded-[9px] border border-[color:var(--border-strong)] p-[2px]">
      {seg("tiles", copy.tiles)}
      {seg("stats", copy.stats)}
    </div>
  );
}
