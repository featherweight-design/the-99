import "./lib/env.mjs";
import { seedPrintings, unsizedRunFailure } from "../src/lib/scryfall/seed-printings";

seedPrintings()
  .then((r) => {
    console.log(
      `Seeded ${r.upserted} printings (${r.representatives} representative, ` +
      `${r.baseSetSizes} sets sized); ` +
      `skipped ${r.skippedLayout} non-card (tokens, emblems, fronts, planes), ${r.skippedReversible} reversible, ` +
      `${r.skippedOrphan} orphan.`,
    );
    // A run that ingested printings and sized no set is a failed refresh, and it used to
    // report success — the summary said `0 sets sized` in passing and the job went green,
    // while every set on the site read `not indexed yet` (#704). The data is intact either
    // way now; what this adds is that somebody finds out.
    const failure = unsizedRunFailure(r);
    if (!failure) {
      // Explicitly, as every sibling seed script does: the Neon pool can hold a socket open
      // and the refresh step would sit on it until the workflow's 180-minute timeout.
      process.exit(0);
    }
    // EXITS FROM THE WRITE'S OWN CALLBACK. The explanation is the only thing that tells the
    // next person which remedy to reach for, and `process.exit()` can kill the process
    // before a piped stderr write has drained — a failed job whose reason is missing from
    // the log. Waiting for the flush and then exiting keeps both the message and the
    // termination the pool needs.
    process.stderr.write(`\n${failure}\n`, () => process.exit(1));
  })
  .catch((err) => { console.error(err); process.exit(1); });
