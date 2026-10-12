// Decides which test files a pull request needs. Shadow mode: CI prints the decision and still runs
// the whole suite. Output: GITHUB_OUTPUT (mode, count, shards, reason), the step summary, and
// `ci-selection.txt` (one test file per line).
//
// Fails closed: no merge base, or vitest erroring, exits non-zero and the `checks` job goes red.
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

import { alwaysSet, decide, packageDepsChanged, shardsFor } from "./lib/ci-select.mjs";

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const lines = (s) => s.split("\n").map((l) => l.trim()).filter(Boolean);

const event = process.env.GITHUB_EVENT_NAME ?? "";
const base = process.env.CI_BASE_REF || "origin/main";
// Tests the vitest config includes; keep in step with `include` in vitest.config.ts.
const allTests = lines(sh("git", ["ls-files", "src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mts"]));
if (allTests.length < 100) throw new Error(`found only ${allTests.length} test files; the pathspec is wrong`);

let changed = [];
let related = [];
let always = [];
let packageChanged = false;
if (event === "pull_request") {
  if (process.env.CI_SELECT_BREAK === "1") throw new Error("deliberately broken selector (CI_SELECT_BREAK=1)");
  const mergeBase = sh("git", ["merge-base", base, "HEAD"]).trim();
  changed = lines(sh("git", ["diff", "--name-only", `${mergeBase}`, "HEAD"]));
  if (changed.includes("package.json")) {
    const before = JSON.parse(sh("git", ["show", `${mergeBase}:package.json`]));
    packageChanged = packageDepsChanged(before, JSON.parse(readFileSync("package.json", "utf8")));
  }
  const list = spawnSync("npx", ["vitest", "list", "--filesOnly", "--changed", mergeBase], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  if (list.status !== 0) throw new Error(`vitest list failed (${list.status}): ${list.stderr || list.stdout}`);
  const known = new Set(allTests);
  related = lines(list.stdout).filter((l) => known.has(l));
  always = alwaysSet(allTests.map((path) => ({ path, text: readFileSync(path, "utf8") })));
}

const d = decide({
  event, changed, packageChanged, related, always, allTests,
  forceFull: process.env.CI_FULL === "1",
});
const shards = d.mode === "full" ? 6 : shardsFor(d.files.length);

writeFileSync("ci-selection.txt", d.files.join("\n") + "\n");
const summary = [
  `### Test selection (shadow: the full suite still runs)`,
  `- mode: **${d.mode}**`,
  `- reason: ${d.reason}`,
  `- test files: ${d.files.length} of ${allTests.length} (related ${related.length}, always set ${always.length})`,
  `- shards it would use: ${shards}`,
  `- changed files: ${changed.length}`,
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `mode=${d.mode}\ncount=${d.files.length}\nshards=${shards}\nreason=${d.reason}\n`);
}
