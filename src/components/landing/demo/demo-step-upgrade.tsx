"use client";
// Step 7 of 9, Precon Upgrade (addendum A5b): the stored run on the fixture account, drawn by the shipped result (`ResultView`) with
// its `demo` prop. A pick is held on screen and stored nowhere (`demoLineActions`); nothing here spends or writes.

import { useMemo } from "react";

import { ResultView, demoLineActions } from "../../decks/precons/upgrade/result-view";
import type { Projected } from "../../../lib/demo/projected";
import { DemoHead } from "./demo-tabs";

export function StepUpgrade({ data }: { data: Projected }) {
  const upgrade = data.upgrade;
  const run = upgrade?.panel.runs.find((r) => r.id === upgrade.runId) ?? null;
  // Once per run: the picks live in these actions, so a render must not remake them.
  const lineActions = useMemo(() => (run && upgrade ? demoLineActions(run, upgrade.setPermits) : null), [run, upgrade]);
  if (!upgrade || !run || !lineActions) return null;
  return (
    <div data-testid="demo-upgrade">
      <DemoHead deckName={upgrade.precon} readOnly />
      <ResultView panel={upgrade.panel} run={run} lineActions={lineActions} demo />
    </div>
  );
}
