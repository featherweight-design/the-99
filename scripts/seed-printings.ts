import "./lib/env.mjs";
import { seedPrintings, unsizedRunFailure } from "../src/lib/scryfall/seed-printings";

seedPrintings()
  .then((r) => {
    console.log(
      `Seeded ${r.upserted} printings (${r.representatives} representative, ` +
      `${r.baseSetSizes} sets sized); ` +
      `skipped ${r.skippedLayout} token/emblem, ${r.skippedReversible} reversible, ` +
      `${r.skippedOrphan} orphan.`,
    );
    // A run that ingested printings and sized no set is a failed refresh, and it used to
    // report success — the summary said `0 sets sized` in passing and the job went green,
    // while every set on the site read `not indexed yet` (#704). The data is intact either
    // way now; what this adds is that somebody finds out.
    const failure = unsizedRunFailure(r);
    if (failure) {
      console.error(`\n${failure}`);
      // `process.exitCode`, never `process.exit()`: the explanation above is the only thing
      // that tells the next person which remedy to reach for, and exiting immediately can
      // terminate the process before a piped stderr write has drained — leaving a failed
      // job whose reason is missing from the log.
      process.exitCode = 1;
    }
  })
  .catch((err) => { console.error(err); process.exitCode = 1; });
