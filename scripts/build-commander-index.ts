import "dotenv/config";
import { alreadyComputedSince, buildCommanderIndex } from "../src/lib/edhrec/seed-index";

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
  loadAlreadyComputed: resumeSince ? () => alreadyComputedSince(resumeSince) : undefined,
})
  .then((r) => {
    console.log(
      `Indexed ${r.commanders} commanders (${r.cardRows} support cards); ` +
      `${r.degraded} degraded, ${r.absent} absent, ${r.unresolved} unresolved names, ` +
      `${r.skipped} skipped, ${r.failed} failed.`,
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
    const attempted = r.commanders + r.degraded + r.failed;
    if (attempted > 0) {
      const bad = r.degraded + r.failed;
      const threshold = Math.ceil(attempted * 0.05);
      if (bad > threshold) {
        console.error(
          `commander-index: ${bad} of ${attempted} attempted commanders degraded or failed ` +
          `(threshold: ${threshold}, 5% of attempted). Index is materially incomplete.`,
        );
        process.exit(1);
      }
    }
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
