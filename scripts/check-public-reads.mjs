// Fails when a public loader (`src/lib/public/**`) can reach per-user data, or when a public page or a component it draws
// can reach a session read, a per-user module or a server action. See `scripts/lib/public-reads.mjs`.
import { publicReadFindings, publicSurfaceFindings } from "./lib/public-reads.mjs";

const loaders = publicReadFindings();
const surface = publicSurfaceFindings();
const findings = [...loaders.findings, ...surface.findings];
if (findings.length === 0) {
  console.log(`the public loaders read catalog tables only (${loaders.files} files followed), and the public surface reaches no session or per-user module (${surface.files} files followed)`);
  process.exit(0);
}
for (const { path, why } of findings) console.error(`${path}: ${why}`);
console.error(`\n${findings.length} public-read finding(s)`);
process.exit(1);
