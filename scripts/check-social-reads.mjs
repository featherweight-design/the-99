// Fails when a module outside `src/lib/social/**` touches a social table. See `scripts/lib/social-reads.mjs`.
import { socialReadFindings } from "./lib/social-reads.mjs";

const { files, findings } = await socialReadFindings(process.cwd());
if (findings.length === 0) {
  console.log(`no social table read outside src/lib/social, ${files} files read`);
  process.exit(0);
}
for (const { path, line, why } of findings) console.error(`${path}:${line} ${why}: social tables are read only through src/lib/social`);
console.error(`\n${findings.length} social read(s) outside src/lib/social`);
process.exit(1);
