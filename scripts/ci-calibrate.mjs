// Usage (see .github/workflows/ci-calibration.yml):
//   node scripts/ci-calibrate.mjs mutate <path>
//   node scripts/ci-calibrate.mjs compare <selection.txt> <vitest-results.json> <label>
// `compare` exits 1 when a test failed that the selector did not choose.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

import { compare, failingFiles, mutate } from "./lib/ci-calibrate.mjs";

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "mutate") {
  const [path] = args;
  if (!path) throw new Error("usage: mutate <path>");
  writeFileSync(path, mutate(path, readFileSync(path)));
  console.log(`broke ${path}`);
} else if (cmd === "compare") {
  const [selectionFile, resultsFile, label] = args;
  const selected = readFileSync(selectionFile, "utf8").split("\n").filter(Boolean);
  const failing = failingFiles(JSON.parse(readFileSync(resultsFile, "utf8")), process.cwd());
  const r = compare({ selected, failing });
  const lines = [
    `### Calibration: ${label}`,
    `- selector chose ${selected.length} test files`,
    `- full suite: ${r.failing} test files failed`,
    r.informative ? `- **missed by the selector: ${r.missed.length}**` : "- nothing failed, so this breakage says nothing about the selector",
    ...r.missed.map((f) => `  - ${f}`),
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  if (r.missed.length > 0) process.exit(1);
} else {
  throw new Error("usage: mutate <path> | compare <selection> <results> <label>");
}
