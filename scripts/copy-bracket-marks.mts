import "./lib/env.mjs";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Copy the bracket marks out of the design handoff and into `public/brackets/`, stripping the
 * provenance blob on the way.
 *
 * A SCRIPT RATHER THAN A ONE-OFF COPY, because Design reissues these. Rank 5 was already
 * reissued once (Round 0's file was rank 4's geometry with a 5 in it) and ranks 2 and 3 were
 * redrawn in R9 to close the 22px collisions. Each reissue has to land in `public/` and has to
 * be stripped again, and a hand copy forgets the second half.
 *
 * WHY STRIP. Each file is ~8KB of which 7,736 bytes is a C2PA manifest — 95%. Ten files ship
 * 81KB of provenance nobody reads to draw a 409-byte glyph. The manifest is Design's record and
 * belongs in `design/`, which keeps it; what the browser needs is the path data.
 *
 * `design/` IS NEVER IMPORTED — this reads it as bytes at build time and writes a copy, which is
 * the one sanctioned direction. Nothing under `src/` reaches into that folder.
 */
const SOURCE = "design/design_handoff_the99_deck_analysis/assets";
const TARGET = "public/brackets";

/** The ten the mark set defines. Named, so a file added or renamed upstream is visible here. */
const EXPECTED = [
  "bracket-1-exhibition", "bracket-2-core", "bracket-3-upgraded",
  "bracket-4-optimized", "bracket-5-cedh",
].flatMap((slug) => [`${slug}.svg`, `${slug}-chip.svg`]);

function strip(svg: string): string {
  // The manifest only. Nothing else in these files is removed — the `xmlns:c2pa` attribute stays,
  // because rewriting the root element is a bigger promise than this script should make.
  return svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, "").replace(/\n{2,}/g, "\n");
}

const present = new Set(readdirSync(SOURCE).filter((f) => f.endsWith(".svg")));
const missing = EXPECTED.filter((f) => !present.has(f));
const extra = [...present].filter((f) => !EXPECTED.includes(f));

// REFUSES RATHER THAN COPYING WHAT IT FOUND. A mark that silently fails to copy is a silent 404
// at the draw: the markup is identical whether or not the art resolved, which is exactly the
// failure `fetch:mana`'s manifest exists to prevent.
if (missing.length > 0) {
  console.error(`bracket marks REFUSED — ${missing.length} missing from ${SOURCE}:`);
  for (const f of missing) console.error(`  ${f}`);
  process.exit(1);
}
if (extra.length > 0) {
  // Not fatal: an extra file is Design adding something, which is their business. Named so a
  // rename is not mistaken for a deletion.
  console.log(`note: ${extra.length} file(s) in the handoff this script does not copy: ${extra.join(", ")}`);
}

mkdirSync(TARGET, { recursive: true });
let before = 0;
let after = 0;
for (const file of EXPECTED) {
  const raw = readFileSync(join(SOURCE, file), "utf8");
  const out = strip(raw);
  before += raw.length;
  after += out.length;
  writeFileSync(join(TARGET, file), out);
}
console.log(
  `copied ${EXPECTED.length} marks to ${TARGET}: ${before} bytes in, ${after} out `
  + `(${Math.round((1 - after / before) * 100)}% was provenance)`,
);
