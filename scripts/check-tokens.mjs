// Fails when a component or stylesheet reads a CSS custom property nothing
// declares. See `scripts/lib/tokens.mjs` for why a missing token is invisible
// to everything else in this repository, and for what is deliberately not a
// miss.
import { glob, readFile } from "node:fs/promises";
import { undeclaredIn } from "./lib/tokens.mjs";

const GLOBAL_CSS = "src/app/globals.css";

const paths = [];
for await (const f of glob("src/**/*.{ts,tsx,css}")) {
  // A test may quote a token name as an EXAMPLE (`--token`), which is not a
  // read the app performs. Tests are skipped outright rather than exempted
  // from reads alone: a token declared in a test fixture is not declared for
  // the app, so a component reading one must still be reported.
  if (!/\.test\.tsx?$/.test(f)) paths.push(f);
}

const files = await Promise.all(
  paths.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
);
// The stylesheet is both a declaration source for everyone and a file whose
// own reads are checked — `globals.css` can misspell a token as readily as a
// component can.
// The `next/font` variables are declared in `fonts.ts`, which both documents (the root layout and
// global-error) carry.
const layout = files.find((f) => f.path.endsWith("src/app/fonts.ts"));
const globalSources = [
  files.find((f) => f.path === GLOBAL_CSS)?.source ?? (await readFile(GLOBAL_CSS, "utf8")),
  layout?.source ?? "",
];

const misses = undeclaredIn(files, globalSources, new Set(paths.filter((p) => p.endsWith(".css"))));
if (misses.length === 0) {
  console.log(`no undeclared tokens — ${files.length} files read`);
  process.exit(0);
}
for (const { file, token } of misses) console.error(`${file} reads ${token}, which nothing declares`);
console.error(`\n${misses.length} undeclared token reference(s)`);
process.exit(1);
