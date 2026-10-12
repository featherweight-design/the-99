"use client";

// `Tiles · Stats` (handoff R2 StatsViewSwitch): the /decks view row's first control, a `role="tablist"` of two
// segments. One tab stop, arrows move between them (selection follows focus), and the selected tab names the
// panel it shows. Drawn only with `LINEUP_ENABLED` on; the page reads nothing for Stats while it is off.

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { DecksView } from "../../ui/view-cookie";
import { onSegmentKeys } from "./segment-keys";

const copy = decksStatsCopy.view;
export const SEGMENT = "inline-flex h-[40px] items-center justify-center rounded-[7px] px-[13px] text-[13px] md:h-[30px]";
export const SEGMENT_ON = "bg-[var(--elevated)] font-semibold text-[color:var(--fg)]";
export const SEGMENT_OFF = "bg-transparent font-normal text-[color:var(--fg-muted)]";

const VIEWS = ["tiles", "stats"] as const;
export const viewTabId = (v: DecksView) => `decks-view-tab-${v}`;
export const viewPanelId = (v: DecksView) => `decks-view-panel-${v}`;

export function StatsViewSwitch({ view, onView, busy = false }: {
  view: DecksView;
  onView: (v: DecksView) => void;
  /** Stats is being read for the first time this visit: the switch says so and ignores a second press. */
  busy?: boolean;
}) {
  const pick = (v: DecksView) => { if (view !== v && !busy) onView(v); };
  return (
    <div
      role="tablist"
      aria-label={copy.aria}
      onKeyDown={(e) => onSegmentKeys(e, VIEWS, viewTabId, pick)}
      className="flex flex-none gap-[2px] rounded-[9px] border border-[color:var(--border-strong)] p-[2px]"
    >
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          id={viewTabId(v)}
          aria-selected={view === v}
          aria-controls={view === v ? viewPanelId(v) : undefined}
          tabIndex={view === v ? 0 : -1}
          aria-busy={busy && v === "stats" ? true : undefined}
          data-decks-view={v}
          onClick={() => pick(v)}
          className={`${SEGMENT} ${view === v ? SEGMENT_ON : SEGMENT_OFF}`}
        >
          {v === "tiles" ? copy.tiles : copy.stats}
        </button>
      ))}
    </div>
  );
}
