// Vercel's Ignored Build Step (`ignoreCommand` in vercel.json). Exit 0 SKIPS the build, exit 1 builds.
// The rule is `scripts/lib/vercel-ignore.mjs`; this file only gathers the facts, and any failure to gather
// them builds. Diffs against VERCEL_GIT_PREVIOUS_SHA, the last SUCCESSFUL deploy of the branch, so skipped
// commits accumulate into the next diff instead of being forgotten.
import { execFileSync } from "node:child_process";
import { decide, diffArgs } from "./lib/vercel-ignore.mjs";

function changedFiles(previous) {
  if (!previous) return null;
  try {
    const out = execFileSync("git", diffArgs(previous), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    // -z: git quotes a non-ASCII path otherwise, and the quote would hide the prefix.
    return out.split("\0").filter(Boolean);
  } catch {
    return null; // the previous commit is not in this clone: build
  }
}

const e = process.env;
const { build, reason } = decide({
  projectId: e.VERCEL_PROJECT_ID,
  env: e.VERCEL_ENV,
  ref: e.VERCEL_GIT_COMMIT_REF,
  changed: changedFiles(e.VERCEL_GIT_PREVIOUS_SHA),
});
console.log(`[ignore-build] ${build ? "BUILD" : "SKIP"}: ${reason}`);
process.exit(build ? 1 : 0);
