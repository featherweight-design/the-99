"use client";
// PROPOSED (addendum A5b, scratch only): step 7, Upgrade this precon. The fixture's stored run, read-only, drawn by the same
// result the flow draws (fresh start R2): the run's head (title, the four facts, the commander pair), then Suggested changes'
// own lists (Additions and Cuts, the phone switch, type/role groups) with every card picked. A visitor's picks change the
// tally and nothing else (the demo's inert actions); You asked and the bar's Apply place are left out, since nothing here can
// start a deck. Try another strategy writes, so it isn't drawn either.
import { ResultView } from "../../decks/precons/upgrade/result-view";
import type { UpgradePanel } from "../../../lib/precons/upgrade/run";
import { DemoHead } from "./demo-tabs";

export type DemoUpgrade = { precon: string; panel: UpgradePanel; runId: string };

export function StepUpgrade({ upgrade, unpicked, seedSet = null }: { upgrade: DemoUpgrade; /** scratch: a visitor's picks, seeded for a static frame */ unpicked?: string[]; seedSet?: number[] | null }) {
  const found = upgrade.panel.runs.find((r) => r.id === upgrade.runId);
  const run = found && unpicked ? ({ ...found, unpicked } as typeof found) : found;
  if (!run) return null;
  return (
    <div data-testid="demo-upgrade" className="flex flex-col gap-[14px]">
      <DemoHead deckName={upgrade.precon} readOnly />
      <ResultView panel={upgrade.panel} run={run} demo seedSet={seedSet} />
    </div>
  );
}
