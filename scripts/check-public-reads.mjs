// Fails when a public loader (`src/lib/public/**`) can reach per-user data. See `scripts/lib/public-reads.mjs`.
import { publicReadFindings } from "./lib/public-reads.mjs";

const { files, findings } = publicReadFindings();
if (findings.length === 0) {
  console.log(`the public loaders read catalog tables only, ${files} files followed`);
  process.exit(0);
}
for (const { path, why } of findings) console.error(`${path}: ${why}`);
console.error(`\n${findings.length} public-read finding(s)`);
process.exit(1);
