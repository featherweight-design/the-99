import "./lib/env.mjs";
import {
  alreadyComputedPairsSince, alreadyComputedSince, buildCommanderIndex, loadPairs, pairRunProblem,
} from "../src/lib/edhrec/seed-index";
import { stampCatalogRefresh } from "../src/lib/cache/stamp-catalog";
import { db } from "../src/db";
import { labelsDetail, phaseReport, recordBuild } from "../src/lib/catalog/builds";

// RESUME_SINCE is an ISO timestamp set by a re-dispatched workflow run so the
// retry skips commanders the aborted run already wrote. Absent, everything is
// recomputed — which is the correct behaviour for the scheduled monthly run.
let resumeSince: Date | null = null;
if (process.env.RESUME_SINCE) {
  const d = new Date(process.env.RESUME_SINCE);
  if (Number.isNaN(d.getTime())) {
    console.error(
      `commander-index: RESUME_SINCE is not a valid date — received "${process.env.RESUME_SINCE}"`,
    );
    process.exit(1);
  }
  resumeSince = d;
}

// Between its own ledger rows (`recordBuild`): every run, by hand included, leaves a newer
// `index` row, finished ok only when every check below passed, so a copy never publishes an index
// an older ok row vouches for. `db:build:staples` records the step after it the same way.
recordBuild(db, "index", async () => {
  let r: Awaited<ReturnType<typeof buildCommanderIndex>>;
  try {
    r = await buildCommanderIndex({
      // The one caller that sweeps for real: every legal pair plus every built one.
      loadPairs: () => loadPairs(),
      loadAlreadyComputed: resumeSince ? () => alreadyComputedSince(resumeSince) : undefined,
      loadAlreadyComputedPairs: resumeSince ? () => alreadyComputedPairsSince(resumeSince) : undefined,
    });
  } catch (err) {
    // A run that threw part-way has still written part of an index and may have cleared scores,
    // so it retires the cached readers too (#1118). Non-fatal, as below.
    await stampCatalogRefresh();
    throw err;
  }
  // Retire cached readers FIRST, before any check below can fail the run (#1118). This job writes
  // PROFILE INPUTS (the support lists, the per-commander composition, and it clears every reader's
  // scores), so a warm `/commanders`, `/discover` or synergy entry would otherwise serve answers
  // derived from the previous index. Every `cacheForUser` key carries the catalog generation, so
  // this one stamp retires them all; a run that failed its 5% floor has still written what it wrote.
  //
  // At the end of the run rather than keyed on the index generation, deliberately: that generation
  // (`cache/index-generation.ts`) is built partly from `max(computed_at)`, which moves with every
  // commander written, so a key on it would rebuild every warm entry about once a minute for the
  // whole run, each time against a half-written index.
  //
  // It lives HERE rather than inside `buildCommanderIndex` because every I/O edge of that function
  // is injectable precisely so the unit tests can drive it. Non-fatal, as every other ingest's
  // stamp is: this workflow never runs `db:migrate`, so a database without the table costs one
  // refresh's staleness and a warning rather than a red job after a good ingest.
  await stampCatalogRefresh();
  console.log(
    `Indexed ${r.commanders} commanders (${r.cardRows} support cards); ` +
    `${r.degraded} degraded, ${r.absent} absent, ${r.unresolved} unresolved names, ` +
    `${r.skipped} skipped, ${r.failed} failed.`,
  );
  // Pairs report SEPARATELY, and they report at all — an earlier version carried these
  // counters and printed none of them, so a run in which every pair failed was
  // indistinguishable from one that stored them all.
  console.log(
    `Pairs: ${r.pairs} stored (${r.pairCardRows} support cards); ` +
    `${r.pairsDegraded} degraded, ${r.pairsFailed} failed, ${r.pairsSkipped} skipped, ` +
    `${r.legalPairs ?? "?"} legal, ` +
    `${r.pairsUnresolved} unresolved names.`,
  );
  // A run that wrote nothing while degrading everything is a broken run
  // wearing a green tick — EDHREC was unreachable for the whole window.
  if (r.commanders === 0 && r.degraded > 0) {
    throw new Error("Every commander came back degraded — EDHREC is unreachable.");
  }
  // A partial outage (e.g. rate-limiting after 2,000 of 3,000 commanders) exits
  // 0 with a green tick under the all-degraded check. Guard proportionally:
  // if more than 5% of attempted commanders were degraded or failed, the index
  // is materially incomplete and the run should not look successful.
  // "Attempted" excludes skipped commanders so a legitimate resume run — where
  // most commanders are skipped — cannot trip this on a handful of failures.
  // Compared as an integer ratio rather than against a rounded count: a
  // Math.ceil threshold rounds the allowance *up*, so at attempted=21 it
  // permits 2 failures — 9.5%, nearly double the stated bar.
  const attempted = r.commanders + r.degraded + r.failed;
  if (attempted > 0) {
    const bad = r.degraded + r.failed;
    if (bad * 20 > attempted) {
      throw new Error(
        `commander-index: ${bad} of ${attempted} attempted commanders degraded or failed ` +
        `(threshold: 5% of attempted). Index is materially incomplete.`,
      );
    }
  }
  // The pair pass fails the job three ways, all in `pairRunProblem` and none of them read
  // off the commander counters, so a commander run is never failed by a pair and the
  // reverse: a refused legal sweep, a pass that stored no pair it attempted, and more than
  // 5% of attempted pairs degraded or failed.
  const pairProblem = pairRunProblem(r);
  if (pairProblem) {
    throw new Error(`commander-index: ${pairProblem}`);
  }
  return r;
}, (r) => phaseReport("index", `${r.commanders} commanders, ${r.pairs} pairs; ${labelsDetail(r.labelFingerprint)}`))
  .then(() => process.exit(0))
  .catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
