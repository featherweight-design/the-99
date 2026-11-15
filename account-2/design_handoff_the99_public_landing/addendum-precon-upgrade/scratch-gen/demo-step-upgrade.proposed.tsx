"use client";
// PROPOSED (addendum A5, scratch only): step 7, Upgrade this precon. The stored run of the fixture, read-only: the precon's name
// with the read-only chip, then the shipped `ResultView`. No tracker: the result's title and facts already say all three picks
// (Led by, Bracket, the strategy in the title), so the strip would only repeat them, truncated on a phone. No foot: Start the deck and Try another strategy write, so the demo draws neither.
import { ResultView } from "../../decks/precons/upgrade/result-view";
import { useState } from "react";
import { landingCopy } from "../../../lib/copy/landing";
import type { UpgradePanel } from "../../../lib/precons/upgrade/run";
import { DemoHead } from "./demo-tabs";

export type DemoUpgrade = { precon: string; panel: UpgradePanel; runId: string };

/** The swaps drawn before Show all: the commander group (when the run changed who leads) and the first three swaps, as step 4 draws its marked rows first. */
export const UPGRADE_FIRST = 3;

export function StepUpgrade({ upgrade, startAll = false }: { upgrade: DemoUpgrade; startAll?: boolean }) {
  const [all, setAll] = useState(startAll);
  const run = upgrade.panel.runs.find((r) => r.id === upgrade.runId);
  if (!run) return null;
  return (
    <div data-testid="demo-upgrade" className="flex flex-col gap-[14px]">
      <DemoHead deckName={upgrade.precon} readOnly />
      <ResultView panel={upgrade.panel} run={run} limit={all ? undefined : UPGRADE_FIRST} />
      {all || run.pairs.length <= UPGRADE_FIRST ? null : (
        <button type="button" data-testid="demo-upgrade-all" onClick={() => setAll(true)} className="mb-[16px] mt-[-6px] inline-flex min-h-[44px] w-fit cursor-pointer items-center rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[13.5px] text-[color:var(--fg)] md:min-h-[36px]">
          {landingCopy.demo.showAllSwaps(run.pairs.length)}
        </button>
      )}
    </div>
  );
}
