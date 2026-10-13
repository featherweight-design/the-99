// Fails when code under `src/` hands on `process.env` instead of the reader's resolved switches. See
// `scripts/lib/switch-reads.mjs`.
import { switchReadFindings } from "./lib/switch-reads.mjs";

const { files, findings, drift } = await switchReadFindings(process.cwd());
if (findings.length === 0 && drift.length === 0) {
  console.log(`no process.env handed on in src outside the resolver and the listed files, ${files} files read`);
  process.exit(0);
}
for (const { path, line, why, fingerprint } of findings) {
  console.error(`${path}:${line} ${why} [${fingerprint}]: decide a switch from the reader's env (requestSwitchEnv), never process.env`);
}
for (const { path, kind, fingerprint, expected, found, lines } of drift) {
  const list = kind === "default" ? "DEFAULTS_PENDING" : "ALLOWED";
  const where = lines.length ? ` (lines ${lines.join(", ")})` : "";
  if (found > expected) {
    const fix = kind === "default" ? "take the reader's env as a required parameter instead" : "pass the reader's env (requestSwitchEnv) instead";
    console.error(`${path}: ${fingerprint} found ${found}, ${list} approves ${expected}${where}: a new use of process.env; ${fix}`);
  } else {
    console.error(`${path}: ${fingerprint} found ${found}, ${list} approves ${expected}: shrink its entry in scripts/lib/switch-reads.mjs`);
  }
}
console.error(`\n${findings.length} finding(s), ${drift.length} listed fingerprint(s) out of date`);
process.exit(1);
