/**
 * What a label copy installs, and what it refuses to. PURE — no database, no API.
 *
 * A label costs a model call to produce and nothing to move, so a database that has never been
 * generated against takes its labels from one that has and pays only for the rows the two
 * disagree about. This is `db:copy:prose`'s shape for `db:copy:labels`'s reason.
 */

import { labelIsFresh, PROMPT_SYSTEM_SHA256, type CardForPrompt, type StoredLabelStamp } from "./prompt";
import type { Job } from "./types";

/** One row as the source holds it. */
export type SourceLabel = {
  oracleId: string;
  labels: Job[];
  model: string;
  promptVersion: string;
  inputHash: string;
};

/** A card as the TARGET's own catalog holds it: what a source row is judged fresh against. */
export type TargetCard = CardForPrompt & { oracleId: string };

/** A row the TARGET already holds, as stamped. */
export type TargetLabel = StoredLabelStamp & { oracleId: string };

export type CopyPlan = {
  /** Rows to install: fresh against the target's own card under the row's own version and model. */
  install: SourceLabel[];
  /**
   * Cards the source has labelled whose row is NOT fresh against the target's card — so the label
   * describes text the target no longer holds, and installing it would store a label for a card
   * as it used to be.
   */
  mismatched: string[];
  /**
   * Cards whose source row names a prompt version this checkout's `PROMPT_SYSTEM_SHA256` does not
   * hold. Its hash cannot be checked here at all, so it is neither installed nor called a catalog
   * difference: re-running a catalog refresh cannot fix it, and checking out the code that knows
   * the version can.
   */
  unknownVersion: string[];
  /**
   * Cards whose source row is fresh but was written under an OLDER prompt version than the target's
   * own row, which is itself fresh against the target's card. Skipped: installing it would replace a
   * newer label with an older one. Versions compare numerically.
   */
  targetNewer: string[];
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
 * **A row is installed only when it is fresh against the TARGET'S OWN card** (`labelIsFresh`), under
 * the row's own prompt version and model. Not the source's inputs: the two databases can hold
 * different catalog states, and a label describing an oracle text the target does not have is worse
 * than no label, because nothing downstream can tell it apart from a current one.
 *
 * Under the row's OWN version and model (Hugh, 2026-10-04), not the checkout's: the target judges
 * freshness the same way, so an older-version row that is fresh on the source and describes the
 * target's text is fresh on the target too, and its next build leaves it alone. Copying it is free;
 * refusing it would leave the target unlabelled, or paying to relabel, for a label that exists.
 *
 * **Mismatched rows are REPORTED, not queued for a paid rebuild.** The plan's Task 4b originally
 * said they "are picked up by the next `db:build:labels` against that target", which would run the
 * model against production — the exact thing pay-once exists to prevent, since the label already
 * exists on the source and is merely describing a different catalog state. The copy's job is to
 * say how many differ and let a human decide; the cheap fix is almost always to re-run the catalog
 * refresh so the two agree, not to buy the labels twice.
 *
 * **A fresh target row is never replaced by an OLDER-version source row** (`targetNewer`). A source
 * row of an equal or newer version installs as before, and so does any source row over a target row
 * that is stale or of an unregistered version.
 *
 * **Nothing is ever deleted.** A card the source has not labelled keeps whatever the target holds.
 */
export function planCopy(
  source: readonly SourceLabel[],
  targetCards: readonly TargetCard[],
  targetRows: readonly TargetLabel[],
  registry: Readonly<Record<string, string>> = PROMPT_SYSTEM_SHA256,
): CopyPlan {
  const cardById = new Map(targetCards.map((c) => [c.oracleId, c]));
  const heldById = new Map(targetRows.map((r) => [r.oracleId, r]));
  const install: SourceLabel[] = [];
  const mismatched: string[] = [];
  const unknownVersion: string[] = [];
  const targetNewer: string[] = [];
  const notInTargetCatalog: string[] = [];

  for (const row of source) {
    const card = cardById.get(row.oracleId);
    // A card the target's catalog does not hold at all is not a mismatch — there is nothing to
    // describe. Recorded rather than skipped silently: a source labelled against a newer catalog
    // always carries some of these, and the count is what tells a reader the difference between
    // that and the target's catalog refresh having stopped.
    if (card === undefined) { notInTargetCatalog.push(row.oracleId); continue; }
    if (!Object.hasOwn(registry, row.promptVersion)) { unknownVersion.push(row.oracleId); continue; }
    if (!labelIsFresh(row, card, registry)) { mismatched.push(row.oracleId); continue; }
    const held = heldById.get(row.oracleId);
    if (held !== undefined && olderVersion(row.promptVersion, held.promptVersion) && labelIsFresh(held, card, registry)) {
      targetNewer.push(row.oracleId);
      continue;
    }
    install.push(row);
  }

  const labelled = new Set(source.map((r) => r.oracleId));
  return {
    install,
    mismatched,
    unknownVersion,
    targetNewer,
    notInTargetCatalog,
    absentFromSource: [...heldById.keys()].filter((id) => !labelled.has(id)),
  };
}

/** Whether prompt version `a` is older than `b`, compared as numbers ("9" < "10"). */
function olderVersion(a: string, b: string): boolean {
  return Number(a) < Number(b);
}
