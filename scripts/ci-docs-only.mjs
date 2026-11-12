// Writes `docs_only=true|false` to GITHUB_OUTPUT for the CI jobs that skip install, build and tests on a
// documentation-only pull request. Rule: `scripts/lib/ci-docs-only.mjs`. Only a pull request can be docs-only:
// the checkout is the merge commit, whose first parent is the base, so `HEAD^1..HEAD` is exactly the PR's change.
// Any failure to read the diff leaves `false`, so the full job runs.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { docsOnly } from "./lib/ci-docs-only.mjs";

let result = false;
if (process.env.GITHUB_EVENT_NAME === "pull_request" && process.env.CI_FULL !== "1") {
  try {
    const out = execFileSync("git", ["diff", "--name-only", "--no-renames", "HEAD^1", "HEAD"], { encoding: "utf8" });
    result = docsOnly(out.split("\n").map((l) => l.trim()).filter(Boolean));
  } catch {
    result = false;
  }
}
console.log(`docs_only=${result}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `docs_only=${result}\n`);
