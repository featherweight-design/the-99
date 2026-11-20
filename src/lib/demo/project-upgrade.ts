// The landing demo's Precon Upgrade step (addendum A5): the stored run on the fixture account, as the result draws it. Pure, so it
// is tested on synthetic input; the exporter (`scripts/demo-export.mts`) is only the loaders around it. Type-only imports from the
// upgrade modules: nothing here reaches a table.

import type { UpgradePanel } from "../precons/upgrade/run";

export type DemoUpgrade = {
  /** The catalog precon's name, as the step's head prints it (`DemoHead`). */
  precon: string;
  /** The panel as `readUpgrade` returned it for the fixture account, restricted to the one run (`runs` holds only it, and its
   *  `deck` is null: the demo starts none). Dates are Dates once decoded (`wire.ts`). */
  panel: UpgradePanel;
  /** The stored run's id. */
  runId: string;
  /** Every bracket the run's whole set of adds and cuts permits (`setPermits`): the seed the pinned tally measures a picked subset
   *  from (C4). Null when the read could not reach, so the tally leaves the bracket half off. */
  setPermits: number[] | null;
};

/**
 * The step's data from what the loaders gave. Throws when the run is not in the panel, did not finish, or was refunded (a short
 * run the fixture must not draw), so a half-run never ships.
 */
export function projectUpgrade(input: { precon: string; panel: UpgradePanel; runId: string; setPermits: readonly number[] | null }): DemoUpgrade {
  const run = input.panel.runs.find((r) => r.id === input.runId);
  if (!run) throw new Error(`projectUpgrade: run ${input.runId} is not in the panel`);
  if (run.status !== "done") throw new Error(`projectUpgrade: run ${input.runId} is ${run.status}, not done`);
  if (run.refunded) throw new Error(`projectUpgrade: run ${input.runId} was refunded`);
  if (run.pairs.length === 0) throw new Error(`projectUpgrade: run ${input.runId} holds no swaps`);
  return {
    precon: input.precon,
    panel: { ...input.panel, runs: [{ ...run, deck: null }] },
    runId: input.runId,
    setPermits: input.setPermits === null ? null : [...input.setPermits],
  };
}

/** Every card the step opens: each swap's add and cut, and the commanders it offers. */
export function upgradeCardIds(upgrade: DemoUpgrade | undefined): string[] {
  if (!upgrade) return [];
  const run = upgrade.panel.runs.find((r) => r.id === upgrade.runId);
  const ids = new Set<string>();
  for (const p of run?.pairs ?? []) ids.add(p.addId).add(p.cutId);
  for (const c of upgrade.panel.commanders) for (const card of c.cards) ids.add(card.oracleId);
  return [...ids];
}
