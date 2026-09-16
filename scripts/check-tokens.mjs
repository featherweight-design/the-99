// Fails when a component reads a CSS custom property no theme declares.
// See `scripts/lib/tokens.mjs` for why a missing token is invisible to
// everything else in this repository.
import { glob } from "node:fs/promises";
import { findUndeclared } from "./lib/tokens.mjs";

const files = [];
for await (const f of glob("src/**/*.{ts,tsx}")) {
  // A test may quote a token name as an EXAMPLE (`--token`), which is not a
  // read the app ever performs, so tests are skipped outright. They are NOT
  // read for declarations either: a token declared only in a test fixture is
  // not declared for the app, and a component reading one should be reported.
  if (!/\.test\.tsx?$/.test(f)) files.push(f);
}

const misses = await findUndeclared("src/app/globals.css", files);
if (misses.length === 0) {
  console.log(`no undeclared tokens — ${files.length} files read`);
  process.exit(0);
}
for (const { file, token } of misses) console.error(`${file} reads ${token}, which no theme declares`);
console.error(`\n${misses.length} undeclared token reference(s)`);
process.exit(1);
