"use client";

// `Decks · Games · Stats` (handoff R2 StatsViewSwitch; Games and the Decks rename from game history R1c): the /decks view
// row's first control, the app's segmented switch as a `tablist` of compact segments (two without a Games view). One tab stop, arrows move between them (selection follows focus), and the
// selected tab names the panel it shows. The page reads Stats and Games only when asked for them (`?view=stats`, `?view=games`).

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { DecksView } from "../../ui/view-cookie";
import { SegmentedSwitch } from "../../ui/segmented-switch";
import { momentsCopy } from "../../../lib/copy/moments";
import { useMomentAnchor } from "../../moments/moments-provider";
import { useTarget } from "../../discovery/targets-provider";
import { useMergedRef } from "../../ui/use-merged-ref";

const copy = decksStatsCopy.view;

export const viewTabId = (v: DecksView) => `decks-view-tab-${v}`;
export const viewPanelId = (v: DecksView) => `decks-view-panel-${v}`;
const IDS = { tab: viewTabId, panel: viewPanelId };

export function StatsViewSwitch({ view, onView, busy = false, busyView = "stats", games = false, moment = false }: {
  view: DecksView;
  onView: (v: DecksView) => void;
  /** `busyView` is being read for the first time this visit: the switch says so and ignores a second press. */
  busy?: boolean;
  /** Which segment `busy` is on: Stats (the default) or Games. */
  busyView?: "stats" | "games";
  /** Draw the Games segment (the page offers the cross-deck history). Absent: Decks and Stats alone, as before. */
  games?: boolean;
  /** M13 (discovery R1): the reader has three decks or more and is on Tiles (Stats not yet asked for), so the switch carries Stats' moment. */
  moment?: boolean;
}) {
  // On the switch as a group, as Matchups' is: one tab stop whichever segment holds it, so Tab from it reaches the
  // bubble's Dismiss and Esc hands focus back to that stop.
  const lineupMoment = useMomentAnchor("lineup", { eligible: moment && view === "tiles" && !busy, copy: momentsCopy.lineup, target: false });
  // The switch is Stats for your decks' target whenever it draws, on Stats too: Try it lands on `/decks?view=stats`.
  const lineupTarget = useTarget("lineup");
  const ref = useMergedRef(lineupMoment.ref, lineupTarget);
  // A press shows in the frame it lands: the segment takes the chosen fill under the finger (`pressFill`) and keeps it
  // while Stats is read (`drawn`; Tiles gives it up in the same frame), with the shell's pending mark beside the label
  // (the 4px diamond a nav press draws, after its 120ms beat). `aria-selected` still follows the view alone, and a
  // read that fails clears `busy`, so both fall back together.
  return (
    <span {...lineupMoment} ref={ref} className="inline-flex rounded-[9px]">
    <SegmentedSwitch
      kind="tabs"
      size="compact"
      ariaLabel={copy.aria}
      value={view}
      drawn={busy ? busyView : view}
      pressFill
      ids={IDS}
      onChange={(v) => { if (!busy) onView(v); }}
      segments={[
        { value: "tiles", label: copy.tiles, data: { "data-decks-view": "tiles" } },
        ...(games ? [{ value: "games" as const, label: copy.games, busy: busy && busyView === "games", data: { "data-decks-view": "games" } }] : []),
        { value: "stats", label: copy.stats, busy: busy && busyView === "stats", data: { "data-decks-view": "stats" } },
      ]}
    />
    </span>
  );
}
