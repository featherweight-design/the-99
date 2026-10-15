"use client";

// `Tiles · Stats` (handoff R2 StatsViewSwitch): the /decks view row's first control, the app's segmented switch as a
// `tablist` of two compact segments. One tab stop, arrows move between them (selection follows focus), and the
// selected tab names the panel it shows. Drawn only with `LINEUP_ENABLED` on; the page reads nothing for Stats while
// it is off.

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { DecksView } from "../../ui/view-cookie";
import { SegmentedSwitch } from "../../ui/segmented-switch";

const copy = decksStatsCopy.view;

export const viewTabId = (v: DecksView) => `decks-view-tab-${v}`;
export const viewPanelId = (v: DecksView) => `decks-view-panel-${v}`;
const IDS = { tab: viewTabId, panel: viewPanelId };

export function StatsViewSwitch({ view, onView, busy = false }: {
  view: DecksView;
  onView: (v: DecksView) => void;
  /** Stats is being read for the first time this visit: the switch says so and ignores a second press. */
  busy?: boolean;
}) {
  // A press shows in the frame it lands: the segment takes the chosen fill under the finger (`pressFill`) and keeps it
  // while Stats is read (`drawn`; Tiles gives it up in the same frame), with the shell's pending mark beside the label
  // (the 4px diamond a nav press draws, after its 120ms beat). `aria-selected` still follows the view alone, and a
  // read that fails clears `busy`, so both fall back together.
  return (
    <SegmentedSwitch
      kind="tabs"
      size="compact"
      ariaLabel={copy.aria}
      value={view}
      drawn={busy ? "stats" : view}
      pressFill
      ids={IDS}
      onChange={(v) => { if (!busy) onView(v); }}
      segments={[
        { value: "tiles", label: copy.tiles, data: { "data-decks-view": "tiles" } },
        { value: "stats", label: copy.stats, busy, data: { "data-decks-view": "stats" } },
      ]}
    />
  );
}
