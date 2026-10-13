// Usage (see .github/workflows/ci-calibration.yml):
//   node scripts/ci-calibrate.mjs mutate <path> [auto|throw|half]
//   node scripts/ci-calibrate.mjs compare <selection.txt> <vitest-results.json> <label>
// `compare` exits 1 when a test failed that the selector did not choose.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

import { compare, failingFiles, failureSummary, mutate } from "./lib/ci-calibrate.mjs";

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "mutate") {
  const [path, mode = "auto"] = args;
  if (!path) throw new Error("usage: mutate <path> [auto|throw|half]");
  writeFileSync(path, mutate(path, readFileSync(path), mode));
  console.log(`broke ${path} (${mode})`);
} else if (cmd === "compare") {
  const [selectionFile, resultsFile, label] = args;
  const selected = readFileSync(selectionFile, "utf8").split("\n").filter(Boolean);
  const failing = failingFiles(JSON.parse(readFileSync(resultsFile, "utf8")), process.cwd());
  const report = JSON.parse(readFileSync(resultsFile, "utf8"));
  const r = compare({ selected, failing });
  // The whole suite ran in one process on a two-core runner, so a test can fail from load alone. A file
  // is a MISS only if it also fails when run by itself with the breakage in place; one that passes alone is
  // reported as load-sensitive, with the message the full run gave it.
  let real = r.missed;
  let loadSensitive = [];
  if (r.missed.length > 0) {
    const again = spawnSync("pnpm", ["exec", "vitest", "run", "--passWithNoTests", "--reporter=json", "--outputFile=recheck-results.json", ...r.missed], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
    let alone = [];
    try {
      alone = failingFiles(JSON.parse(readFileSync("recheck-results.json", "utf8")), process.cwd());
    } catch {
      // No report means the rerun itself broke; treat every candidate as a real miss.
      alone = r.missed;
    }
    real = r.missed.filter((f) => alone.includes(f));
    loadSensitive = r.missed.filter((f) => !alone.includes(f));
    if (again.status === null) real = r.missed;
  }
  const why = failureSummary(report, r.missed, process.cwd());
  const lines = [
    `### Calibration: ${label}`,
    `- selector chose ${selected.length} test files`,
    `- full suite: ${r.failing} test files failed`,
    r.informative ? `- **missed by the selector: ${real.length}**` : "- nothing failed, so this breakage says nothing about the selector",
    ...real.map((f) => `  - ${f}: ${(why[f] ?? "").split("\n")[0]}`),
    ...(loadSensitive.length ? [`- failed in the full run but passed alone (load-sensitive, not counted): ${loadSensitive.length}`, ...loadSensitive.map((f) => `  - ${f}: ${(why[f] ?? "").split("\n")[0]}`)] : []),
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  if (real.length > 0) process.exit(1);
} else {
  throw new Error("usage: mutate <path> | compare <selection> <results> <label>");
}
