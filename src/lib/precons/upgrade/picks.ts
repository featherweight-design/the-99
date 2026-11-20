import type { UpgradePair } from "./validate";

/**
 * The one picks rule (fresh start R2): every add is one of the run's own adds, every cut one of its own cuts, and no id is repeated
 * on either side. A start or an apply (`picksOfRun`) and the Start dialog's set bracket (`setPermits`) share this rule, but only a
 * write goes further: `setPermits` reads an uneven set on purpose (the bar shows a bracket while the counts differ) and does not
 * check the lead's color identity, while a Start or an Apply refuses both (`picksOfRun`, `prepareUpgradeIn`). So the bar can read a
 * set the write would refuse. Shape (oracle ids, the `MAX_SWAPS` bound) is `picksShape`'s. Pure.
 */
export function picksInRun(
  pairs: readonly Pick<UpgradePair, "cutId" | "addId">[], adds: readonly string[], cuts: readonly string[],
): boolean {
  if (new Set(adds).size !== adds.length || new Set(cuts).size !== cuts.length) return false;
  const runAdds = new Set(pairs.map((p) => p.addId));
  const runCuts = new Set(pairs.map((p) => p.cutId));
  return adds.every((id) => runAdds.has(id)) && cuts.every((id) => runCuts.has(id));
}
