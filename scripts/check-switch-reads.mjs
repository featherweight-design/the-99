// Fails when code under `src/` hands on `process.env` instead of the reader's resolved switches, or code under
// `scripts/` hands it on instead of the switches resolved from the rows (`resolveFlagsStrict`). See
// `scripts/lib/switch-reads.mjs`.
import { SCRIPTS_SCAN, switchReadFindings } from "./lib/switch-reads.mjs";

const scans = [
  {
    dir: "src",
    result: await switchReadFindings(process.cwd()),
    lists: { handoff: "ALLOWED", default: "DEFAULTS_PENDING" },
    fix: "decide a switch from the reader's env (requestFlags), never process.env",
    handoffFix: "pass the reader's env (requestFlags) instead",
  },
  {
    dir: "scripts",
    result: await switchReadFindings(process.cwd(), SCRIPTS_SCAN),
    lists: { handoff: "SCRIPTS_ALLOWED or SCRIPTS_PENDING", default: "the scripts scan (none approved)" },
    fix: "resolve the switches once (resolveFlagsStrict(userId | null)) and pass that, never process.env",
    handoffFix: "pass the switches resolveFlagsStrict(userId | null) returns instead",
  },
];

let findingCount = 0;
let driftCount = 0;
for (const { dir, result, lists, fix, handoffFix } of scans) {
  const { findings, drift } = result;
  findingCount += findings.length;
  driftCount += drift.length;
  for (const { path, line, why, fingerprint } of findings) console.error(`${path}:${line} ${why} [${fingerprint}]: ${fix}`);
  for (const { path, kind, fingerprint, expected, found, lines } of drift) {
    const list = lists[kind];
    const where = lines.length ? ` (lines ${lines.join(", ")})` : "";
    if (found > expected) {
      const hint = kind === "default" ? "take the reader's env as a required parameter instead" : handoffFix;
      console.error(`${path}: ${fingerprint} found ${found}, ${list} approves ${expected}${where}: a new use of process.env in ${dir}; ${hint}`);
    } else {
      console.error(`${path}: ${fingerprint} found ${found}, ${list} approves ${expected}: shrink its entry in scripts/lib/switch-reads.mjs`);
    }
  }
}

if (findingCount === 0 && driftCount === 0) {
  const read = scans.map(({ dir, result }) => `${result.files} in ${dir}`).join(", ");
  console.log(`no process.env handed on outside the resolver and the listed files, ${read} read`);
  process.exit(0);
}
console.error(`\n${findingCount} finding(s), ${driftCount} listed fingerprint(s) out of date`);
process.exit(1);
