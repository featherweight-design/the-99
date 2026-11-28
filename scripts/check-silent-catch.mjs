// Fails when a client component catches an error without reporting it (captureClientError), rethrowing it or marking
// it an expected outcome. See `scripts/lib/silent-catch.mjs`. There is no baseline: the guard is absolute.
import { scanSilentCatches, silentCatchFindings } from "./lib/silent-catch.mjs";

const scan = await scanSilentCatches("src");
const findings = silentCatchFindings(scan);
if (findings.length === 0) {
  console.log(`no silent client catch, ${scan.files} client files scanned`);
  process.exit(0);
}
for (const { path, kind, detail } of findings) console.error(`${path}: [${kind}] ${detail}`);
console.error(`\n${findings.length} silent-catch finding(s)`);
process.exit(1);
