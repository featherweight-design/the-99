import "./lib/env.mjs";
import {
  alreadyComputedPairsSince, alreadyComputedSince, buildCommanderIndex, loadPairs, pairRunProblem,
} from "../src/lib/edhrec/seed-index";
import { stampCatalogRefresh } from "../src/lib/cache/stamp-catalog";

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

buildCommanderIndex({
  // The one caller that sweeps for real: every legal pair plus every built one.
  loadPairs: () => loadPairs(),
  loadAlreadyComputed: resumeSince ? () => alreadyComputedSince(resumeSince) : undefined,
  loadAlreadyComputedPairs: resumeSince ? () => alreadyComputedPairsSince(resumeSince) : undefined,
})
  .then(async (r) => {
    // Retire cached readers FIRST, before any check below can fail the run. This job writes
    // PROFILE INPUTS (the support lists, the per-commander composition, and it clears every
    // reader's scores), so a warm `/commanders`, `/discover` or synergy entry would otherwise
    // serve answers derived from the previous index. Every `cacheForUser` key carries the catalog
    // generation, so this one stamp retires them all. It used to sit after the failure checks,
    // which meant a run that wrote most of an index and then failed its 5% floor left every warm
    // entry standing for up to the hour ceiling. A failed run has still written what it wrote.
    //
    // At the end of the run rather than keyed on the index generation, deliberately: that
    // generation (`cache/index-generation.ts`) is built partly from `max(computed_at)`, which moves
    // with every commander written, so a key on it would rebuild every warm entry about once a
    // minute for the whole run (up to three hours), each time against a half-written index.
    //
    // It lives HERE rather than inside `buildCommanderIndex` because every I/O edge of that
    // function is injectable precisely so the unit tests can drive it; a direct call would
    // fire a real database write in `seed-index.test.ts`. Non-fatal, as every other ingest's
    // stamp is: this workflow never runs `db:migrate`, so a database without the table costs
    // one refresh's staleness and a warning rather than a red job after a good ingest.
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
      console.error("Every commander came back degraded — EDHREC is unreachable.");
      process.exit(1);
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
        console.error(
          `commander-index: ${bad} of ${attempted} attempted commanders degraded or failed ` +
          `(threshold: 5% of attempted). Index is materially incomplete.`,
        );
        process.exit(1);
      }
    }
    // The pair pass fails the job three ways, all in `pairRunProblem` and none of them read
    // off the commander counters, so a commander run is never failed by a pair and the
    // reverse: a refused legal sweep, a pass that stored no pair it attempted, and more than
    // 5% of attempted pairs degraded or failed.
    const pairProblem = pairRunProblem(r);
    if (pairProblem) {
      console.error(`commander-index: ${pairProblem}`);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    // A run that threw part-way has still written part of an index and may have cleared
    // scores, so it retires the cached readers too. Non-fatal, as above.
    await stampCatalogRefresh();
    process.exit(1);
  });
