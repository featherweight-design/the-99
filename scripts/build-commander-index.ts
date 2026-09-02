import "dotenv/config";
import { alreadyComputedSince, buildCommanderIndex } from "../src/lib/edhrec/seed-index";

// RESUME_SINCE is an ISO timestamp set by a re-dispatched workflow run so the
// retry skips commanders the aborted run already wrote. Absent, everything is
// recomputed — which is the correct behaviour for the scheduled monthly run.
const resumeSince = process.env.RESUME_SINCE ? new Date(process.env.RESUME_SINCE) : null;

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
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
