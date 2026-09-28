import "./lib/env.mjs";
import { restampCommanderProse } from "../src/lib/prose/generate";

// The one-time move to the set-and-lead prose hash (2026-09-28), with no model call. Rows current
// under the legacy hash take the new one; stale rows stay stale. `--dry-run` counts and writes
// nothing. Runs against the database `DATABASE_URL` names.
const dryRun = process.argv.includes("--dry-run");

restampCommanderProse({ dryRun })
  .then((r) => {
    console.log(
      `${dryRun ? "Would re-stamp" : "Re-stamped"} ${r.restamped} sentences; ` +
      `${r.fresh} already current, ${r.stale} stale under both hashes.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
