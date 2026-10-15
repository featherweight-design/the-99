"use client";

// `Tiles · Stats` (handoff R2 StatsViewSwitch): the /decks view row's first control, a `role="tablist"` of two
// segments. One tab stop, arrows move between them (selection follows focus), and the selected tab names the
// panel it shows. Drawn only with `LINEUP_ENABLED` on; the page reads nothing for Stats while it is off.

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { DecksView } from "../../ui/view-cookie";
import { onSegmentKeys } from "../../ui/segment-keys";

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
  // The segment drawn selected: the press moves it at once, and Tiles lets go in the frame Stats takes it. A read that
  // fails clears `busy`, and both fall back together.
  const shown: DecksView = busy ? "stats" : view;
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
          // A press shows in the frame it lands: the segment takes the selected fill under the finger
          // (`active:`) and keeps it while Stats is read (Tiles gives it up in the same frame), with the shell's pending mark beside the label (the 4px
          // diamond a nav press draws, after its 120ms beat). `aria-selected` still follows the view alone.
          className={`${SEGMENT} ${shown === v ? SEGMENT_ON : `${SEGMENT_OFF} active:bg-[var(--elevated)] active:text-[color:var(--fg)]`}`}
        >
          {v === "tiles" ? copy.tiles : copy.stats}
          {busy && v === "stats" ? (
            <span aria-hidden="true" data-pending className="anim-pending-in ml-[8px] inline-flex">
              <span className="anim-pending-pip block size-[4px] rotate-45 bg-[color:var(--fg)]" />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
