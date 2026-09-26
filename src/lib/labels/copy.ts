/**
 * What a label copy installs, and what it refuses to. PURE — no database, no API.
 *
 * A label costs a model call to produce and nothing to move, so a database that has never been
 * generated against takes its labels from one that has and pays only for the rows the two
 * disagree about. This is `db:copy:prose`'s shape for `db:copy:labels`'s reason.
 */

import type { Job } from "./types";

/** One row as the source holds it. */
export type SourceLabel = {
  oracleId: string;
  labels: Job[];
  model: string;
  promptVersion: string;
  inputHash: string;
};

/** What the TARGET's own inputs hash to, per card. */
export type TargetHash = { oracleId: string; inputHash: string };

export type CopyPlan = {
  /** Rows to install: the source's hash equals the target's own. */
  install: SourceLabel[];
  /**
   * Cards the source has labelled whose hash does NOT match the target's inputs — so the label
   * describes text the target no longer holds, and installing it would store a label for a card
   * as it used to be.
   */
  mismatched: string[];
  /** Cards the target holds and the source has not labelled. Left alone; never deleted. */
  absentFromSource: string[];
  /**
   * Cards the source has labelled that the target's catalog does not hold at all.
   *
   * COUNTED rather than silent. There is nothing for the label to describe, so it is not a
   * mismatch — but silence is how a real gap hides, and this figure being normally non-zero is
   * fine as long as it is visible. A source generated against a newer catalog always carries some;
   * a figure suddenly in the thousands means the target's catalog refresh has stopped running.
   */
  notInTargetCatalog: string[];
};

/**
 * Decides what to install.
 *
 * **A row is installed only when the source's stored hash equals the hash the TARGET'S OWN inputs
 * produce.** Not the source's inputs: the two databases can hold different catalog states, and a
 * label describing an oracle text the target does not have is worse than no label, because nothing
 * downstream can tell it apart from a current one.
 *
 * **Mismatched rows are REPORTED, not queued for a paid rebuild.** The plan's Task 4b originally
 * said they "are picked up by the next `db:build:labels` against that target", which would run the
 * model against production — the exact thing pay-once exists to prevent, since the label already
 * exists on the source and is merely describing a different catalog state. The copy's job is to
 * say how many differ and let a human decide; the cheap fix is almost always to re-run the catalog
 * refresh so the two agree, not to buy the labels twice.
 *
 * **Nothing is ever deleted.** A card the source has not labelled keeps whatever the target holds.
 */
export function planCopy(
  source: readonly SourceLabel[],
  targetHashes: readonly TargetHash[],
  targetHasLabel: ReadonlySet<string>,
): CopyPlan {
  const wantByCard = new Map(targetHashes.map((t) => [t.oracleId, t.inputHash]));
  const install: SourceLabel[] = [];
  const mismatched: string[] = [];
  const notInTargetCatalog: string[] = [];

  for (const row of source) {
    const want = wantByCard.get(row.oracleId);
    // A card the target's catalog does not hold at all is not a mismatch — there is nothing to
    // describe. Recorded rather than skipped silently: a source labelled against a newer catalog
    // always carries some of these, and the count is what tells a reader the difference between
    // that and the target's catalog refresh having stopped.
    if (want === undefined) { notInTargetCatalog.push(row.oracleId); continue; }
    if (want === row.inputHash) install.push(row);
    else mismatched.push(row.oracleId);
  }

  const labelled = new Set(source.map((r) => r.oracleId));
  return {
    install,
    mismatched,
    notInTargetCatalog,
    absentFromSource: [...targetHasLabel].filter((id) => !labelled.has(id)),
  };
}
