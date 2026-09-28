import "./lib/env.mjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { restampCommanderProse } from "../src/lib/prose/generate";

// The move to the set-and-lead prose hash (2026-09-28), with no model call. Rows current under
// the legacy hash take the new one; stale rows stay stale; a re-run re-stamps nothing.
// `--dry-run` counts and writes nothing.
//
// FAIL CLOSED on the target: `RESTAMP_TARGET_BRANCH` is never defaulted, and the database
// `DATABASE_URL` names must report exactly that Neon branch by `neon.branch_id`, or nothing is
// read or written. A refusal exits 2, any other failure 1, so a workflow step ahead of an index
// copy stops that copy either way.
const dryRun = process.argv.includes("--dry-run");
const expected = process.env.RESTAMP_TARGET_BRANCH;

async function main(): Promise<number> {
  if (!expected) {
    console.error("restamp-prose: RESTAMP_TARGET_BRANCH is not set; name the Neon branch to re-stamp.");
    return 2;
  }
  const rows = (await db.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as {
    branch: string | null;
  }[];
  const actual = rows[0]?.branch ?? null;
  if (actual !== expected) {
    console.error(`restamp-prose: the target reports branch ${actual ?? "(none)"}, not ${expected}. Nothing written.`);
    return 2;
  }
  const r = await restampCommanderProse({ dryRun });
  console.log(
    `${expected}: ${dryRun ? "would re-stamp" : "re-stamped"} ${r.restamped} sentences; ` +
    `${r.fresh} already current, ${r.stale} stale under both hashes.`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
