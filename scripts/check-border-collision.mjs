// Fails when a component uses a bare `border-r` or `border-b` with no SIDE-SPECIFIC color
// override. Tailwind 4 registers a color utility for every theme color, and this app's mana
// palette names five colors `w`/`u`/`b`/`r`/`g` — two of which are also Tailwind's own side
// abbreviations, so `border-r`/`border-b` silently repaint the border in mana red/black instead
// of `currentColor` or whatever the author intended. See `scripts/lib/border-collision.mjs`.
import { glob, readFile } from "node:fs/promises";
import { lineAt, unresolvedCollisions } from "./lib/border-collision.mjs";

const paths = [];
for await (const f of glob("src/**/*.tsx")) {
  if (!/\.test\.tsx$/.test(f)) paths.push(f);
}

const findings = [];
for (const path of paths) {
  const source = await readFile(path, "utf8");
  for (const { side, offsetInFile } of unresolvedCollisions(source)) {
    findings.push({ path, side, line: lineAt(source, offsetInFile) });
  }
}

if (findings.length === 0) {
  console.log(`no bare border-r/border-b collisions — ${paths.length} files read`);
  process.exit(0);
}
for (const { path, side, line } of findings) {
  console.error(`${path}:${line} bare "border-${side}" with no border-${side}-[color:...] override`);
}
console.error(`\n${findings.length} unresolved border collision(s)`);
process.exit(1);
