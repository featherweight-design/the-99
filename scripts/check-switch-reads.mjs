// Fails when code under `src/` hands on `process.env` instead of the reader's resolved switches. See
// `scripts/lib/switch-reads.mjs`.
import { switchReadFindings } from "./lib/switch-reads.mjs";

const { files, findings, drift } = await switchReadFindings(process.cwd());
if (findings.length === 0 && drift.length === 0) {
  console.log(`no process.env handed on in src outside the resolver and the listed files, ${files} files read`);
  process.exit(0);
}
for (const { path, line, why } of findings) {
  console.error(`${path}:${line} ${why}: decide a switch from the reader's env (requestSwitchEnv), never process.env`);
}
for (const { path, expected, found, lines } of drift) {
  console.error(`${path}: listed with ${expected} use(s) of process.env, found ${found}${lines.length ? ` (lines ${lines.join(", ")})` : ""}: edit its entry in scripts/lib/switch-reads.mjs`);
}
console.error(`\n${findings.length} finding(s), ${drift.length} listed file(s) out of date`);
process.exit(1);
