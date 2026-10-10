import type { JobRowsByCard } from "./job-tally";

export type SettledLabelRead = {
  /** The map the page counts with; null counts by the classifier. */
  rows: JobRowsByCard | null;
  /** The ids the read covered, so a card with no label is told from one never asked about. */
  queried: string[] | null;
  /** True when the switch is on and a read failed: the targets must use the classifier basis too,
   *  or the strip grades classifier counts against `label_*` targets. */
  classifierTargets: boolean;
};

/**
 * One decision for both deck routes. A read that covers only part of the cards it was asked about
 * would count the rest as unlabeled, so ANY failed read (null) sends the whole page back to the
 * classifier, counts and targets together.
 */
export function settleLabelRead(
  enabled: boolean,
  reads: readonly (JobRowsByCard | null)[],
  queriedIds: readonly string[],
): SettledLabelRead {
  if (!enabled) return { rows: null, queried: null, classifierTargets: false };
  if (reads.some((r) => r === null)) return { rows: null, queried: null, classifierTargets: true };
  return {
    rows: Object.assign({}, ...reads) as JobRowsByCard,
    queried: [...queriedIds],
    classifierTargets: false,
  };
}
