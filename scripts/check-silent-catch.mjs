// Fails when a client component catches an error without reporting it (captureClientError), rethrowing it or marking
// it an expected outcome. See `scripts/lib/silent-catch.mjs`. `--write-baseline` rewrites the ratchet from the tree.
import { readFile, writeFile } from "node:fs/promises";
import { scanSilentCatches, silentCatchFindings } from "./lib/silent-catch.mjs";

const BASELINE = "scripts/silent-catch-baseline.json";
const scan = await scanSilentCatches("src");

if (process.argv.includes("--write-baseline")) {
  const sorted = Object.fromEntries(Object.entries(scan.counts).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`wrote ${BASELINE}: ${Object.keys(sorted).length} files, ${Object.values(sorted).reduce((a, b) => a + b, 0)} sites`);
  process.exit(0);
}

const baseline = JSON.parse(await readFile(BASELINE, "utf8"));
const findings = silentCatchFindings(scan, baseline);
const total = Object.values(scan.counts).reduce((a, b) => a + b, 0);
if (findings.length === 0) {
  console.log(`no new silent client catch — ${total} baselined site(s) left in ${Object.keys(scan.counts).length} file(s), ${scan.files} client files scanned`);
  process.exit(0);
}
for (const { path, kind, detail } of findings) console.error(`${path}: [${kind}] ${detail}`);
console.error(`\n${findings.length} silent-catch finding(s)`);
process.exit(1);
